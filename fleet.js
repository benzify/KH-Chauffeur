// Fleet page: fills every rate, capacity and minimum from data.js (window.KH_FLEET),
// then adds the group-size filter and the Sun–Thu / Fri–Sat toggle.
// Without JavaScript the static numbers in fleet.html stay on the page.
(() => {
  const fleet = window.KH_FLEET;
  if (!fleet) return;

  const SUNDAY = 0, SATURDAY = 6; // minimumForDay() takes a JS day number
  const DAYS = { weekday: SUNDAY, weekend: SATURDAY };
  const DAY_LABEL = { weekday: "Sun–Thu", weekend: "Fri–Sat" };
  const dollars = value => "$" + value.toLocaleString("en-US");
  const shortName = name => name.replace(/^(Mercedes-Benz|Cadillac) /, "");
  const listNames = names => names.length < 2 ? names.join("") : names.slice(0, -1).join(", ") + " and " + names.at(-1);

  const table = document.querySelector(".fleet-table");
  const controls = document.querySelector("[data-fleet-controls]");
  const result = document.querySelector("[data-fleet-result]");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const state = { size: "any", day: null }; // day null = show Sun–Thu and Fri–Sat side by side

  const minimum = (vehicle, day) => vehicle.minimumForDay(DAYS[day]);
  const base = (vehicle, day) => vehicle.rate * minimum(vehicle, day);
  const vehicleFor = node => fleet[node.dataset.fleet || node.closest("[data-vehicle]")?.dataset.vehicle];

  // Text for each data field. Matches the static HTML so a mismatch means fleet.html is out of date.
  const staticText = (vehicle, field) => {
    const weekday = minimum(vehicle, "weekday"), weekend = minimum(vehicle, "weekend");
    switch (field) {
      case "rate": return dollars(vehicle.rate);
      case "passengers": return vehicle.passengers == null ? null : String(vehicle.passengers);
      case "minimum": return weekday === weekend ? `${weekday}, all week` : `${weekday} Sun–Thu, ${weekend} Fri–Sat`;
      case "base-weekday": return dollars(base(vehicle, "weekday"));
      case "base-weekend": return dollars(base(vehicle, "weekend"));
    }
  };

  // 1. Fill every number from data.js and warn if the static fallback has drifted.
  document.querySelectorAll("[data-field]").forEach(node => {
    const vehicle = vehicleFor(node);
    if (!vehicle) return;
    const text = staticText(vehicle, node.dataset.field);
    if (text == null) return; // unconfirmed capacity keeps its "not listed" markup
    if (node.textContent.trim() !== text) {
      console.warn(`fleet.html shows "${node.textContent.trim()}" for ${vehicle.name} (${node.dataset.field}); data.js says "${text}".`);
    }
    node.textContent = text;
  });

  const lowest = Math.min(...Object.values(fleet).map(v => v.rate));
  if (fleet["escalade-esv"] && fleet["escalade-esv"].rate !== lowest) {
    console.warn("The Escalade 'Best for' line says it has the fleet's lowest hourly rate; data.js no longer agrees.");
  }

  if (!table || !controls || !result) return;

  // 2. Enhanced table: both day columns until a day is picked, then one "Base minimum" column.
  table.classList.add("is-enhanced");
  const dayCells = [...table.querySelectorAll("[data-col]")];
  dayCells.forEach(cell => { cell.dataset.bothLabel = cell.tagName === "TH" ? cell.innerHTML : cell.dataset.label; });
  controls.hidden = false;

  const rows = [...document.querySelectorAll("[data-vehicle]")];
  const fitOf = vehicle => {
    if (state.size === "any") return "any";
    if (vehicle.passengers == null) return "unknown";
    return vehicle.passengers >= Number(state.size) ? "fits" : "small";
  };

  // Vehicles in the order the table lists them, so messages read in page order.
  const pageOrder = [...table.querySelectorAll("tbody tr[data-vehicle]")].map(row => fleet[row.dataset.vehicle]).filter(Boolean);
  const sizeMessage = () => {
    const vehicles = pageOrder;
    if (state.size === "any") return `Showing all ${vehicles.length} vehicles.`;
    const fits = vehicles.filter(v => fitOf(v) === "fits");
    const unknown = vehicles.filter(v => fitOf(v) === "unknown").map(v => shortName(v.name));
    const range = state.size === "14" ? "14 or more" : "15 to 28";
    let text = fits.length === 1
      ? `1 vehicle seats ${range}: the ${fits[0].name.toLowerCase()}.`
      : `${fits.length} vehicles seat ${range}.`;
    if (unknown.length) text += ` Ask the team about seating in the ${listNames(unknown)}.`;
    return text;
  };

  const render = () => {
    table.dataset.day = state.day || "both";
    dayCells.forEach(cell => {
      const label = state.day ? "Base minimum" : cell.dataset.bothLabel;
      if (cell.tagName === "TH") cell.innerHTML = label; // label is our own static markup
      else cell.dataset.label = label;
    });
    rows.forEach(row => {
      const vehicle = fleet[row.dataset.vehicle];
      if (!vehicle) return;
      const fit = fitOf(vehicle);
      row.classList.toggle("is-dim", fit === "small");
      const tag = row.querySelector("[data-fit]");
      if (tag) {
        tag.hidden = fit === "any";
        tag.className = "fleet-fit" + (fit === "small" ? " sr-only" : "") + (fit === "unknown" ? " is-unknown" : "");
        tag.textContent = { fits: "Fits", unknown: "Ask about seating", small: "Seats fewer than this group", any: "" }[fit];
      }
      const min = row.querySelector('[data-field="minimum"]');
      if (min) min.textContent = state.day ? String(minimum(vehicle, state.day)) : staticText(vehicle, "minimum");
    });
  };

  const update = (change, message) => {
    const apply = () => { change(); render(); result.textContent = message(); };
    if (document.startViewTransition && !reduceMotion.matches) document.startViewTransition(apply);
    else apply();
  };

  // Group size always has one choice pressed. The day can be cleared again:
  // pressing the active day returns the table to both days.
  const bind = (attr, key, message, canClear) => {
    const buttons = [...controls.querySelectorAll(`[data-${attr}]`)];
    buttons.forEach(button => button.addEventListener("click", () => {
      const active = button.getAttribute("aria-pressed") === "true";
      if (active && !canClear) return;
      update(() => {
        buttons.forEach(b => b.setAttribute("aria-pressed", String(b === button && !active)));
        state[key] = active ? null : button.dataset[attr];
      }, message);
    }));
  };
  // One status line that keeps both answers: the group-size result and the day shown.
  const statusMessage = () => sizeMessage() + (state.day ? ` Showing ${DAY_LABEL[state.day]} minimums.` : "");
  bind("size", "size", statusMessage, false);
  bind("day", "day", statusMessage, true);

  render(); // initial state; no announcement on load
})();
