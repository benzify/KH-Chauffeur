const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

const menuButton = $("[data-menu-button]");
const nav = $("[data-nav]");
if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  const closeMenu = () => {
    nav.classList.remove("is-open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open menu");
  };
  nav.addEventListener("click", event => {
    if (event.target.matches("a")) closeMenu();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      closeMenu();
      menuButton.focus();
    }
  });
}

$$('[data-year]').forEach(node => { node.textContent = new Date().getFullYear(); });

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

// Pinned header: its background layer fades in after 40px of scrolling.
const header = $(".site-header");
if (header) {
  let ticking = false;
  const setScrolled = () => { header.classList.toggle("is-scrolled", scrollY > 40); ticking = false; };
  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(setScrolled);
  }, { passive: true });
  setScrolled();
}

// Fade-and-rise for .reveal and the children of .reveal-stagger. Each plays once.
// Items that come into view together are staggered in page order, up to 6 steps.
// Runs after every page script, because vehicle.js rebuilds the "Other vehicles" cards.
const startReveals = () => {
  const nodes = [...$$(".reveal"), ...$$(".reveal-stagger > :not(.sr-only)")];
  if (!("IntersectionObserver" in window) || reduceMotion.matches) {
    nodes.forEach(node => node.classList.add("is-visible"));
    return;
  }
  const inPageOrder = (a, b) => (a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
  const observer = new IntersectionObserver(entries => {
    let step = 0;
    entries.filter(entry => entry.isIntersecting).sort(inPageOrder).forEach(entry => {
      entry.target.style.setProperty("--i", String(Math.min(step++, 5)));
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.15 });
  nodes.forEach(node => observer.observe(node));
  const showNow = (target, instant) => nodes.forEach(node => {
    if (node.classList.contains("is-visible") || !node.contains(target)) return;
    node.style.setProperty("--i", "0");
    if (instant) node.style.transition = "none";
    node.classList.add("is-visible");
    observer.unobserve(node);
    if (instant) requestAnimationFrame(() => node.style.removeProperty("transition"));
  });
  // Keyboard focus reveals its section at once (CSS :focus-within) and keeps it revealed after.
  document.addEventListener("focusin", event => showNow(event.target, false));
  // In-page links: show the target in its final place first, so the jump lands below the header.
  const showHashTarget = hash => {
    const target = hash.length > 1 && document.getElementById(decodeURIComponent(hash.slice(1)));
    if (target) showNow(target, true);
  };
  document.addEventListener("click", event => {
    const link = event.target.closest('a[href^="#"]');
    if (link) showHashTarget(link.getAttribute("href"));
  });
  if (location.hash) {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    showHashTarget(location.hash);
    if (target) target.scrollIntoView();
  }
};
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startReveals);
else startReveals();

// Price crossfade: swap the text and fade the new value in. No counting-up numbers.
window.khSwapText = (node, value) => {
  if (!node || node.textContent === value) return;
  node.textContent = value;
  if (reduceMotion.matches) return;
  node.classList.remove("is-swapping");
  void node.offsetWidth; // restart the fade
  node.classList.add("is-swapping");
};
document.addEventListener("animationend", event => {
  if (event.animationName === "kh-swap") event.target.classList.remove("is-swapping");
});

// Whole dollars without cents ($1,170), cents only when needed ($487.50), matching the vehicle pages.
const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: value % 1 ? 2 : 0 }).format(value);
const parseLocalDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

function calculateEstimate(vehicleId, dateValue, requestedHours) {
  const vehicle = window.KH_FLEET[vehicleId];
  const date = parseLocalDate(dateValue);
  if (!vehicle || !date || !Number.isFinite(requestedHours) || requestedHours <= 0) return null;
  const minimum = vehicle.minimumForDay(date.getDay());
  const billableHours = Math.max(requestedHours, minimum);
  const base = vehicle.rate * billableHours;
  const deposit = base * (window.KH_BOOKING.depositPercent / 100);
  return { vehicle, minimum, requestedHours, billableHours, base, deposit, balance: base - deposit };
}
window.calculateKHEstimate = calculateEstimate;

const form = $("[data-inquiry-form]");
if (form) {
  const vehicleSelect = $("[name=vehicle]", form);
  const dateInput = $("[name=service_date]", form);
  const hoursInput = $("[name=hours]", form);
  const estimateBox = $("[data-estimate]", form);
  const status = $("[data-form-status]", form);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  dateInput.min = today;

  const updateEstimate = () => {
    const result = calculateEstimate(vehicleSelect.value, dateInput.value, Number(hoursInput.value));
    if (!result) {
      estimateBox.hidden = true;
      return null;
    }
    // Prices crossfade only when they change on screen, not when the estimate first appears.
    const setPrice = estimateBox.hidden ? (node, value) => { node.textContent = value; } : khSwapText;
    estimateBox.hidden = false;
    $("[data-estimate-vehicle]", estimateBox).textContent = result.vehicle.name;
    $("[data-estimate-hours]", estimateBox).textContent = `${result.billableHours} hour${result.billableHours === 1 ? "" : "s"}`;
    setPrice($("[data-estimate-base]", estimateBox), money(result.base));
    setPrice($("[data-estimate-deposit]", estimateBox), money(result.deposit));
    setPrice($("[data-estimate-balance]", estimateBox), money(result.balance));
    $("[data-estimate-note]", estimateBox).textContent = result.requestedHours < result.minimum
      ? `${result.minimum}-hour minimum applied for this vehicle and date.`
      : `Calculated at ${money(result.vehicle.rate)} per hour.`;
    return result;
  };

  [vehicleSelect, dateInput, hoursInput].forEach(input => input.addEventListener("input", updateEstimate));
  const params = new URLSearchParams(location.search);
  const preset = params.get("vehicle");
  if (preset && window.KH_FLEET[preset]) vehicleSelect.value = preset;
  // Hours carried over from a vehicle page estimator, e.g. request.html?vehicle=maybach-sprinter&hours=6
  const presetHours = Number(params.get("hours"));
  if (Number.isInteger(presetHours) && presetHours >= 1 && presetHours <= 24) hoursInput.value = String(presetHours);
  updateEstimate();

  form.addEventListener("submit", event => {
    event.preventDefault();
    status.textContent = "";
    if (!form.reportValidity()) return;
    const result = updateEstimate();
    if (!result) {
      status.textContent = "Choose a vehicle, service date and requested hours to prepare your inquiry.";
      return;
    }
    const values = Object.fromEntries(new FormData(form));
    const subject = `Availability inquiry — ${result.vehicle.name} — ${values.service_date}`;
    const body = [
      "KH Chauffeurs availability inquiry",
      "This is an inquiry only. It is not a confirmed reservation or payment.", "",
      `Name: ${values.name}`, `Phone: ${values.phone}`, `Email: ${values.email}`,
      `Preferred vehicle: ${result.vehicle.name}`, `Passenger count: ${values.passengers}`,
      `Service date: ${values.service_date}`, `Pickup time: ${values.pickup_time}`,
      `Pickup location: ${values.pickup}`, `Drop-off location: ${values.dropoff}`,
      `Requested rental hours: ${values.hours}`, `Event or trip type: ${values.event_type}`,
      `Notes: ${values.notes || "None provided"}`, "",
      `Base rental · ${result.billableHours} hour${result.billableHours === 1 ? "" : "s"}: ${money(result.base)}`,
      `50% deposit: ${money(result.deposit)}`,
      `Balance on arrival: ${money(result.balance)}`, "",
      "Estimate is subject to availability and confirmed applicable charges."
    ].join("\n");
    status.textContent = "Your email app should open with a prepared inquiry. Review it before sending; no reservation has been confirmed.";
    location.href = `mailto:${window.KH_BOOKING.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}

// Vehicle photo carousels: G-Wagon and Executive Mercedes Sprinter photos cycle every 2 seconds everywhere they appear
// (img tags, the cards vehicle.js builds later, and CSS hero backgrounds set through --hero-image).
(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const groups = {
    "g-wagon": { photos: ["assets/g-wagon-enhanced.webp", "assets/g-wagon-front.webp", "assets/g-wagon-rear.webp"], i: 0 },
    "executive-sprinter": { photos: ["assets/executive-sprinter.webp", "assets/sprinter-interior-enhanced.webp"], i: 0 }
  };
  const file = src => (src || "").split("/").pop().split("?")[0];
  const groupOf = src => Object.keys(groups).find(k => groups[k].photos.some(p => file(p) === file(src)));
  Object.values(groups).forEach(g => g.photos.forEach(src => { new Image().src = src; }));
  const setBackdrop = (img, g) => img.parentElement && img.parentElement.style.setProperty("--gw-bg", `url("${g.photos[g.i]}")`);
  const layout = img => { // size the blurred backdrop to the photo's own box so it never spills under card text
    const f = img.parentElement; if (!f || img.dataset.carousel !== "g-wagon") return;
    f.style.setProperty("--gw-t", img.offsetTop + "px"); f.style.setProperty("--gw-l", img.offsetLeft + "px");
    f.style.setProperty("--gw-w", img.offsetWidth + "px"); f.style.setProperty("--gw-h", img.offsetHeight + "px");
  };
  const layoutAll = () => document.querySelectorAll("img[data-carousel]").forEach(layout);
  const release = img => { // an img that no longer shows a carousel photo (e.g. a cloned card re-pointed by vehicle.js)
    img.removeAttribute("data-carousel");
    if (img.parentElement) { img.parentElement.classList.remove("gw-frame"); img.parentElement.style.removeProperty("--gw-bg"); }
  };
  const prepare = img => {
    const key = groupOf(img.getAttribute("src"));
    if (!key) return release(img);
    img.setAttribute("data-carousel", key);
    const frame = img.parentElement;
    frame.classList.add("gw-frame");
    if (getComputedStyle(frame).position === "static") frame.style.position = "relative";
    setBackdrop(img, groups[key]);
    layout(img);
    img.addEventListener("load", () => layout(img));
  };
  const scan = () => {
    document.querySelectorAll("img[src]").forEach(img => {
      if (groupOf(img.getAttribute("src"))) prepare(img); else if (img.dataset.carousel) release(img);
    });
    document.querySelectorAll('[style*="--hero-image"]').forEach(el => {
      const key = groupOf((el.getAttribute("style").match(/url\(['"]?([^'")]+)/) || [])[1]);
      if (key) el.setAttribute("data-hero-carousel", key);
    });
  };
  const tick = () => {
    if (document.hidden) return;
    Object.values(groups).forEach(g => { g.i = (g.i + 1) % g.photos.length; });
    document.querySelectorAll("img[data-carousel]").forEach(img => {
      const g = groups[img.dataset.carousel];
      if (!g || !groupOf(img.getAttribute("src"))) return release(img);
      img.classList.add("is-swapping");
      setTimeout(() => { img.src = g.photos[g.i]; setBackdrop(img, g); img.removeAttribute("srcset"); img.classList.remove("is-swapping"); }, 350);
    });
    layoutAll();
    document.querySelectorAll("[data-hero-carousel]").forEach(el => {
      const g = groups[el.dataset.heroCarousel];
      el.style.setProperty("--hero-image", `url('${g.photos[g.i]}')`);
    });
  };
  scan();
  window.addEventListener("resize", layoutAll);
  window.addEventListener("load", () => { scan(); layoutAll(); }); // picks up cards that vehicle.js builds after this script runs
  setInterval(tick, 2000);
})();
