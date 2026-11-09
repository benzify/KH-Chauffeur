// Address suggestions for inputs marked [data-address], powered by Geoapify's free
// autocomplete API. Without a key (KH_BOOKING.geoapifyKey) or when a lookup fails,
// the fields stay ordinary text inputs; visitors can always type anything (venue names too).
(() => {
  const key = window.KH_BOOKING && window.KH_BOOKING.geoapifyKey;
  if (!key) return;

  const ENDPOINT = "https://api.geoapify.com/v1/geocode/autocomplete";
  const ATLANTA = "-84.388,33.749"; // lon,lat — results near Atlanta rank first
  const MIN_CHARS = 3;
  const DELAY_MS = 250;
  let listCount = 0;

  const attach = input => {
    const listId = `address-list-${++listCount}`;
    const wrap = document.createElement("span"); // spans: the field sits inside a <label>
    wrap.className = "address-field";
    input.replaceWith(wrap);
    wrap.append(input);

    const list = Object.assign(document.createElement("span"), { id: listId, className: "address-list" });
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", "Address suggestions");
    const credit = document.createElement("span");
    credit.className = "address-credit";
    credit.innerHTML = 'Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noopener">Geoapify</a>';
    const panel = Object.assign(document.createElement("span"), { className: "address-panel", hidden: true });
    panel.append(list, credit);
    wrap.append(panel);

    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", listId);
    input.setAttribute("autocomplete", "off"); // the browser's own suggestions would cover ours

    let items = [];
    let active = -1;
    let timer = 0;
    let controller = null;

    const close = () => {
      panel.hidden = true;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      active = -1;
    };
    const highlight = index => {
      active = index;
      [...list.children].forEach((li, i) => li.setAttribute("aria-selected", String(i === index)));
      if (index >= 0) input.setAttribute("aria-activedescendant", `${listId}-${index}`);
      else input.removeAttribute("aria-activedescendant");
    };
    const choose = index => {
      if (!items[index]) return;
      input.value = items[index];
      close();
      // Let the form re-check the field and clear any error shown on it.
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    };
    const render = () => {
      list.replaceChildren(...items.map((text, i) => {
        const li = document.createElement("span");
        li.id = `${listId}-${i}`;
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", "false");
        li.textContent = text;
        // mousedown (not click) so the input keeps focus and blur doesn't close the list first
        li.addEventListener("mousedown", event => { event.preventDefault(); choose(i); });
        return li;
      }));
      const open = items.length > 0 && document.activeElement === input;
      panel.hidden = !open;
      input.setAttribute("aria-expanded", String(open));
      highlight(-1);
    };

    const lookup = async text => {
      if (controller) controller.abort();
      controller = new AbortController();
      const url = `${ENDPOINT}?${new URLSearchParams({
        text, filter: "countrycode:us", bias: `proximity:${ATLANTA}`, limit: "5", format: "json", apiKey: key
      })}`;
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Geoapify ${res.status}`);
        const data = await res.json();
        items = [...new Set((data.results || []).map(r => r.formatted).filter(Boolean))];
      } catch (error) {
        if (error.name === "AbortError") return;
        items = []; // fail quietly: the field still works as plain text
      }
      render();
    };

    input.addEventListener("input", event => {
      if (!event.isTrusted) return; // ignore the event fired after choosing a suggestion
      clearTimeout(timer);
      const text = input.value.trim();
      if (text.length < MIN_CHARS) { items = []; close(); return; }
      timer = setTimeout(() => lookup(text), DELAY_MS);
    });
    input.addEventListener("keydown", event => {
      if (panel.hidden) return;
      if (event.key === "ArrowDown") { event.preventDefault(); highlight((active + 1) % items.length); }
      else if (event.key === "ArrowUp") { event.preventDefault(); highlight(active <= 0 ? items.length - 1 : active - 1); }
      else if (event.key === "Enter" && active >= 0) { event.preventDefault(); choose(active); }
      else if (event.key === "Escape") { event.preventDefault(); close(); }
    });
    input.addEventListener("blur", () => setTimeout(close, 100));
  };

  document.querySelectorAll("input[data-address]").forEach(attach);
})();
