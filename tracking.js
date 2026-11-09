// Lead tracking: sends call-button clicks and request-form submissions to the
// n8n workflow "Website Leads (Calls + Forms) → Email + Sheet Log - KH Chauffeurs".
// The tokens below are visible to anyone who views the page source. They only keep
// casual spam out of the workflow; they are not real secrets.
(() => {
  const N8N = {
    callUrl: "https://n8n.srv1193896.hstgr.cloud/webhook/ce83bafd-cce4-47ca-acee-056705cb32b8",
    callToken: "sdg-9kR2mQx7VtZp4wLnGt8Fb3",
    formUrl: "https://n8n.srv1193896.hstgr.cloud/webhook/987525e9-5f35-4ef7-bcfb-495c2d99bf07",
    formToken: "sdgform-ShcwzYVuGgtUkoBn0HWwxfI6"
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

  document.addEventListener("click", event => {
    const link = event.target.closest && event.target.closest('a[href^="tel:"]');
    if (!link) return;
    const phone = decodeURIComponent(link.getAttribute("href").slice(4)).trim();
    if (!phone) return;
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
      buttonLocation: link.dataset.callLocation || "",
      token: N8N.callToken
    });
  });

  // Sends a form submission. Field names match what the workflow's "Prepare Form Row"
  // node looks for (name, email, phone, message, utm_*, pageUrl, referrer); any other
  // field is listed under "Form Details". Resolves when the request leaves the
  // browser; rejects on a network failure.
  // mode "no-cors" because the workflow's form response sends no CORS headers,
  // so the response itself can't be read.
  window.khSendLead = (fields, formName = "Website form") => {
    const body = new URLSearchParams({
      ...fields,
      pageUrl: pageUrlWithClickId(),
      referrer: attribution.referrer,
      utm_source: attribution.utm_source || "",
      utm_medium: attribution.utm_medium || "",
      utm_campaign: attribution.utm_campaign || "",
      utm_term: attribution.utm_term || "",
      "form[name]": formName
    });
    const url = `${N8N.formUrl}?token=${encodeURIComponent(N8N.formToken)}`;
    return fetch(url, { method: "POST", mode: "no-cors", keepalive: true, body });
  };
})();
