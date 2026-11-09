// Lead tracking: sends call-button clicks and request-form submissions to the
// n8n workflow "Website Leads (Calls + Forms) → Email + Sheet Log - KH Chauffeurs".
// The tokens below are visible to anyone who views the page source. They only keep
// casual spam out of the workflow; they are not real secrets.
(() => {
  const N8N = {
    callUrl: "https://n8n.srv1193896.hstgr.cloud/webhook/ce83bafd-cce4-47ca-acee-056705cb32b8",
    callToken: "kh-call-BRv0gNhveguRGGHI1ZLjh16Z",
    formUrl: "https://n8n.srv1193896.hstgr.cloud/webhook/987525e9-5f35-4ef7-bcfb-495c2d99bf07",
    formToken: "kh-form-s5CG7GCdB3-Il-a3iaMXcBa9",
    formTimeoutMs: 10000
  };

  // Storage can throw (private windows, blocked site data), so every access is guarded.
  const read = (store, key) => { try { return window[store].getItem(key); } catch (e) { return null; } };
  const write = (store, key, value) => { try { window[store].setItem(key, value); } catch (e) { /* ignore */ } };
  const randomId = () => (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const persistentId = (store, key) => {
    let id = read(store, key);
    if (!id) { id = randomId(); write(store, key, id); }
    return id;
  };

  const visitorId = persistentId("localStorage", "kh_visitor_id");
  const sessionId = persistentId("sessionStorage", "kh_session_id");

  // Attribution: keep the UTM tags, gclid and outside referrer from the landing page
  // for the rest of the visit, so a call from a later page still credits the ad.
  const ATTR_KEY = "kh_attribution";
  const loadAttribution = () => {
    try { return JSON.parse(read("sessionStorage", ATTR_KEY) || "{}") || {}; } catch (e) { return {}; }
  };
  const attribution = loadAttribution();
  const params = new URLSearchParams(location.search);
  const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid"];
  if (utmKeys.some(key => params.get(key))) {
    utmKeys.forEach(key => { attribution[key] = params.get(key) || ""; });
  }
  if (!attribution.referrer) {
    let external = "";
    try { external = document.referrer && new URL(document.referrer).host !== location.host ? document.referrer : ""; } catch (e) { /* ignore */ }
    attribution.referrer = external || "Direct";
  }
  write("sessionStorage", ATTR_KEY, JSON.stringify(attribution));

  // The landing URL carries the gclid; the workflow reads it from the page URL.
  const pageUrlWithClickId = () => {
    if (!attribution.gclid) return location.href;
    try {
      const url = new URL(location.href);
      if (!url.searchParams.has("gclid")) url.searchParams.set("gclid", attribution.gclid);
      return url.href;
    } catch (e) { return location.href; }
  };

  // Form-encoded bodies are a "simple" CORS request: no preflight, and sendBeacon
  // keeps sending while the page hands off to the phone dialer.
  const beacon = (url, data) => {
    const body = new URLSearchParams(data);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(url, body)) return;
    } catch (e) { /* fall through to fetch */ }
    fetch(url, { method: "POST", mode: "no-cors", keepalive: true, body }).catch(() => {});
  };

  // A double tap shouldn't log two calls. n8n also ignores repeats within 30 seconds.
  let lastCallSentAt = 0;
  document.addEventListener("click", event => {
    const link = event.target.closest && event.target.closest('a[href^="tel:"]');
    if (!link) return;
    const phone = decodeURIComponent(link.getAttribute("href").slice(4)).trim();
    if (!phone) return;
    const now = Date.now();
    if (now - lastCallSentAt < 2000) return;
    lastCallSentAt = now;
    beacon(N8N.callUrl, {
      phone,
      pageUrl: pageUrlWithClickId(),
      referrer: attribution.referrer,
      utmSource: attribution.utm_source || "",
      utmMedium: attribution.utm_medium || "",
      utmCampaign: attribution.utm_campaign || "",
      utmTerm: attribution.utm_term || "",
      utmContent: attribution.utm_content || "",
      sessionId,
      visitorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      language: navigator.language || "",
      buttonLocation: link.dataset.callLocation || "other",
      token: N8N.callToken
    });
  });

  // Sends a form submission. Field names match what the workflow's "Prepare Form Row"
  // node looks for (name, email, phone, message, utm_*, pageUrl, referrer); any other
  // field is listed under "Form Details".
  // Resolves only when n8n confirms it accepted the lead. Rejects on a network error,
  // a timeout, any non-2xx status, or a reply of {"success": false}, so the caller can
  // offer another way to reach the team. The workflow replies after checking the token.
  window.khSendLead = async (fields, formName = "Website form") => {
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null) body.set(key, String(value));
    }
    // Set last on purpose: these always describe the visit, whatever the form sends.
    const tracking = {
      pageUrl: pageUrlWithClickId(),
      referrer: attribution.referrer,
      utm_source: attribution.utm_source || "",
      utm_medium: attribution.utm_medium || "",
      utm_campaign: attribution.utm_campaign || "",
      utm_term: attribution.utm_term || "",
      utm_content: attribution.utm_content || "",
      "form[name]": formName,
      token: N8N.formToken
    };
    Object.entries(tracking).forEach(([key, value]) => body.set(key, value));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), N8N.formTimeoutMs);
    try {
      const res = await fetch(N8N.formUrl, { method: "POST", mode: "cors", body, signal: controller.signal });
      if (!res.ok) throw new Error(`Form webhook returned ${res.status}`);
      const reply = await res.json().catch(() => ({}));
      if (reply && reply.success === false) throw new Error("Form webhook rejected the submission");
      return reply;
    } finally {
      clearTimeout(timer);
    }
  };
})();
