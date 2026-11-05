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

const observed = $$("[data-reveal]");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  }), { threshold: 0.08 });
  observed.forEach(node => observer.observe(node));
} else observed.forEach(node => node.classList.add("is-visible"));

const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
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
    estimateBox.hidden = false;
    $("[data-estimate-vehicle]", estimateBox).textContent = result.vehicle.name;
    $("[data-estimate-hours]", estimateBox).textContent = `${result.billableHours} hour${result.billableHours === 1 ? "" : "s"}`;
    $("[data-estimate-base]", estimateBox).textContent = money(result.base);
    $("[data-estimate-deposit]", estimateBox).textContent = money(result.deposit);
    $("[data-estimate-balance]", estimateBox).textContent = money(result.balance);
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
      `Estimated base rental: ${money(result.base)}`,
      `50% deposit illustration: ${money(result.deposit)}`,
      `Remaining base balance due upon arrival: ${money(result.balance)}`, "",
      "Estimate is subject to availability and confirmed applicable charges."
    ].join("\n");
    status.textContent = "Your email app should open with a prepared inquiry. Review it before sending; no reservation has been confirmed.";
    location.href = `mailto:${window.KH_BOOKING.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}
