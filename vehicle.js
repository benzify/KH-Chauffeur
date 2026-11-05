// Vehicle page template: <body class="page-vehicle" data-vehicle="<id from data.js>">.
// Fills rates, capacities, minimums and the deposit from data.js (window.KH_FLEET / KH_BOOKING),
// runs the base-rental estimator and builds the "Other vehicles" row.
// Without JavaScript the static numbers in the HTML stay on the page.
(() => {
  const fleet = window.KH_FLEET;
  const booking = window.KH_BOOKING || {};
  const pageId = document.body.dataset.vehicle;
  const vehicle = fleet && fleet[pageId];
  if (!vehicle) return;

  const SUNDAY = 0, SATURDAY = 6; // minimumForDay() takes a JS day number
  // "all" is for vehicles whose minimum is the same every day (limo bus, G-Wagon, Escalade).
  const DAYS = { weekday: SUNDAY, weekend: SATURDAY, all: SUNDAY };
  const DAY_LABEL = { weekday: "Sun–Thu", weekend: "Fri–Sat" };
  // Same order as the fleet page.
  const ORDER = ["maybach-sprinter", "executive-sprinter", "limo-bus", "g-wagon", "escalade-esv"];
  const depositRate = (booking.depositPercent ?? 50) / 100;

  const money = value => "$" + value.toLocaleString("en-US", { minimumFractionDigits: value % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const minimum = (v, day) => v.minimumForDay(DAYS[day]);
  const fieldText = (v, field) => {
    switch (field) {
      case "rate": return money(v.rate);
      case "passengers": return v.passengers == null ? null : String(v.passengers);
      case "min-weekday": return String(minimum(v, "weekday"));
      case "min-weekend": return String(minimum(v, "weekend"));
      case "base-weekday": return money(v.rate * minimum(v, "weekday"));
      case "base-weekend": return money(v.rate * minimum(v, "weekend"));
      case "min-all": return String(minimum(v, "all"));
      case "base-all": return money(v.rate * minimum(v, "all"));
      case "deposit": return `${booking.depositPercent ?? 50}%`;
    }
    return null;
  };

  // 1. Fill every [data-field] from data.js; warn if the static fallback has drifted.
  const fill = (root, checkDrift = true) => root.querySelectorAll("[data-field]").forEach(node => {
    const owner = node.closest("[data-vehicle]");
    const v = fleet[owner ? owner.dataset.vehicle : pageId];
    if (!v) return;
    const text = fieldText(v, node.dataset.field);
    if (text == null) return;
    if (checkDrift && node.textContent.trim() !== text) {
      console.warn(`${location.pathname} shows "${node.textContent.trim()}" for ${v.name} (${node.dataset.field}); data.js says "${text}".`);
    }
    node.textContent = text;
  });
  fill(document);

  if (booking.metroPolicy && !/included for Metro Atlanta/i.test(booking.metroPolicy)) {
    console.warn("The 'Tolls & parking' row no longer matches KH_BOOKING.metroPolicy in data.js.");
  }

  // 2. Other vehicles, rebuilt from data.js so every vehicle page gets the same row.
  const others = document.querySelector("[data-others]");
  if (others) {
    const template = others.querySelector(".vp-other");
    if (template) {
      const cards = ORDER.filter(id => id !== pageId && fleet[id]).map(id => {
        const v = fleet[id];
        const card = template.cloneNode(true);
        card.dataset.vehicle = id;
        const link = card.querySelector("a");
        link.href = v.page;
        const img = card.querySelector("img");
        img.src = v.image;
        img.removeAttribute("width");
        img.removeAttribute("height");
        card.querySelector(".vp-other-name").textContent = v.name.replace(/-/g, "‑"); // non-breaking hyphens keep "Mercedes-Benz" and "G-Wagon" whole
        return card;
      });
      others.replaceChildren(...cards);
      fill(others, false); // clones start with the template card's numbers; the static cards were already checked
    }
  }

  // 3. Estimator.
  const estimate = document.querySelector("[data-estimate]");
  const controls = document.querySelector("[data-estimator-controls]");
  if (!estimate || !controls) return;
  const hoursInput = controls.querySelector("[data-hours]");
  const status = document.querySelector("[data-estimate-status]");
  const link = document.querySelector("[data-estimate-link]");
  const dayButtons = [...controls.querySelectorAll("[data-day]")];
  // Pages for vehicles with one minimum all week have a single "all" column and no day buttons.
  const columns = estimate.querySelector('[data-col="all"]') ? ["all"] : ["weekday", "weekend"];
  if (columns[0] === "all" && minimum(vehicle, "weekday") !== minimum(vehicle, "weekend")) {
    console.warn(`${vehicle.name} now has different weekday and weekend minimums in data.js; this page needs the two-day estimator.`);
  }
  const state = { day: null }; // null = show Sun–Thu and Fri–Sat side by side
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  controls.hidden = false;

  const requestedHours = () => {
    const n = Number(hoursInput.value);
    return Number.isInteger(n) && n >= 1 && n <= 24 ? n : null;
  };

  const render = () => {
    const hours = requestedHours();
    estimate.dataset.day = state.day || "both";
    const applied = [];
    for (const day of columns) {
      const min = minimum(vehicle, day);
      const billable = Math.max(hours || 0, min);
      const base = vehicle.rate * billable;
      const deposit = base * depositRate;
      const set = (key, value) => { const node = estimate.querySelector(`[data-out="${key}-${day}"]`); if (node) node.textContent = value; };
      set("hours", String(billable));
      set("base", money(base));
      set("deposit", money(deposit));
      set("balance", money(base - deposit));
      const shown = !state.day || state.day === day;
      if (shown && hours && hours < min) applied.push({ day, min });
    }
    // "5-hour minimum applied." — naming the day only when both days are on screen.
    if (status) status.textContent = applied.map(a => `${a.min}-hour minimum applied${state.day || a.day === "all" ? "" : ` (${DAY_LABEL[a.day]})`}.`).join(" ");
    if (link) {
      const url = new URL(link.getAttribute("href"), location.href);
      if (hours) url.searchParams.set("hours", String(hours)); else url.searchParams.delete("hours");
      link.setAttribute("href", url.pathname.split("/").pop() + url.search);
    }
  };

  const update = change => {
    const apply = () => { change(); render(); };
    if (document.startViewTransition && !reduceMotion.matches) document.startViewTransition(apply);
    else apply();
  };

  // Pressing the active day returns the table to both days.
  dayButtons.forEach(button => button.addEventListener("click", () => {
    const active = button.getAttribute("aria-pressed") === "true";
    update(() => {
      dayButtons.forEach(b => b.setAttribute("aria-pressed", String(b === button && !active)));
      state.day = active ? null : button.dataset.day;
    });
  }));
  hoursInput.addEventListener("input", render);

  render();
})();
