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

// While a form field has focus (phone keyboard open), CSS hides the fixed mobile call bar.
const isField = node => node instanceof Element && node.matches("input, select, textarea");
document.addEventListener("focusin", event => { if (isField(event.target)) document.body.classList.add("is-typing"); });
document.addEventListener("focusout", event => {
  if (isField(event.target) && !isField(event.relatedTarget)) document.body.classList.remove("is-typing");
});

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
  const passengersInput = $("[name=passengers]", form);
  const phoneInput = $("[name=phone]", form);
  const hoursHint = $("[data-hours-hint]", form);
  const passengersHint = $("[data-passengers-hint]", form);
  const estimateBox = $("[data-estimate]", form);
  const status = $("[data-form-status]", form);
  const submitButton = $("[type=submit]", form);
  const submitLabel = submitButton.textContent;
  const done = $("[data-form-done]", form);
  const DEFAULT_MAX_PASSENGERS = 28;
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  dateInput.min = today;

  // ---------- Vehicle rules: minimum hours (by vehicle and day) and seats ----------
  // The rules live in data.js (minimumForDay, passengers).
  const vehicleRules = () => {
    const vehicle = window.KH_FLEET[vehicleSelect.value];
    if (!vehicle) return null;
    const byDay = DAY_NAMES.map((_, day) => vehicle.minimumForDay(day));
    const lowest = Math.min(...byDay);
    const highest = Math.max(...byDay);
    const date = parseLocalDate(dateInput.value);
    // Without a date, use the highest minimum so the form never promises less than applies.
    const minimum = date ? byDay[date.getDay()] : highest;
    let hint;
    if (lowest === highest) hint = `${minimum}-hour minimum for this vehicle.`;
    else {
      const longDays = DAY_NAMES.filter((_, day) => byDay[day] === highest).map(name => `${name}s`).join(" and ");
      hint = date
        ? `${minimum}-hour minimum on ${DAY_NAMES[date.getDay()]}s for this vehicle.`
        : `${lowest}-hour minimum, ${highest} hours on ${longDays}.`;
    }
    return { vehicle, minimum, hint, varies: lowest !== highest, date, seats: vehicle.passengers || null };
  };

  // Hours the form filled in itself follow the minimum up and down; hours the visitor
  // typed are only ever raised to the minimum, never lowered.
  let hoursAutoFilled = false;
  hoursInput.addEventListener("input", () => { hoursAutoFilled = false; });

  // Called when the vehicle or date changes: sets limits and raises hours that fall below the minimum.
  const applyVehicleRules = () => {
    const rules = vehicleRules();
    if (!rules) {
      hoursInput.min = "1";
      passengersInput.max = String(DEFAULT_MAX_PASSENGERS);
      hoursHint.textContent = "Choose a vehicle to see its minimum.";
      passengersHint.textContent = "";
    } else {
      hoursInput.min = String(rules.minimum);
      if (!hoursInput.value || hoursAutoFilled || Number(hoursInput.value) < rules.minimum) {
        hoursInput.value = String(rules.minimum);
        hoursAutoFilled = true;
      }
      hoursHint.textContent = rules.hint;
      passengersInput.max = String(rules.seats || DEFAULT_MAX_PASSENGERS);
      passengersHint.textContent = rules.seats ? `Seats up to ${rules.seats}.` : "";
    }
    checkRules();
  };

  // Custom messages for the vehicle-specific limits (the browser's own wording is generic).
  const checkRules = () => {
    const rules = vehicleRules();
    const hours = Number(hoursInput.value);
    hoursInput.setCustomValidity(rules && hoursInput.value && hours < rules.minimum
      ? `This vehicle has a ${rules.minimum}-hour minimum${rules.varies && rules.date ? " on the date you picked" : ""}.`
      : "");
    const seats = rules && rules.seats;
    passengersInput.setCustomValidity(seats && Number(passengersInput.value) > seats
      ? `The ${rules.vehicle.name} seats up to ${seats}. Choose a larger vehicle or lower the count.`
      : "");
    const digits = phoneInput.value.replace(/\D/g, "");
    phoneInput.setCustomValidity(phoneInput.value && digits.length < 10 ? "Enter a phone number with area code." : "");
  };

  // ---------- Inline errors ----------
  const fields = $$("input, select, textarea", form).filter(field => field.name && field.name !== "company_website");
  const MISSING = {
    name: "Enter your name.", phone: "Enter your phone number.", email: "Enter your email address.",
    vehicle: "Choose a vehicle.", passengers: "Enter how many passengers.", hours: "Enter the rental hours.",
    service_date: "Choose a service date.", pickup_time: "Choose a pickup time.",
    pickup: "Enter the pickup location.", dropoff: "Enter the drop-off location."
  };
  const errorFor = field => {
    let node = $(`#err-${field.name}`, form);
    if (!node) {
      node = Object.assign(document.createElement("span"), { id: `err-${field.name}`, className: "field-error" });
      field.closest("label").append(node);
      const describedBy = [field.getAttribute("aria-describedby"), node.id].filter(Boolean).join(" ");
      field.setAttribute("aria-describedby", describedBy);
    }
    return node;
  };
  const messageFor = field => {
    const v = field.validity;
    if (v.valueMissing) return MISSING[field.name] || "This field is required.";
    if (v.customError) return field.validationMessage;
    if (v.typeMismatch && field.type === "email") return "Enter an email address like name@example.com.";
    if (v.rangeUnderflow && field.type === "date") return "Choose today or a later date.";
    if (v.rangeUnderflow) return `Enter ${field.min} or more.`;
    if (v.rangeOverflow) return `Enter ${field.max} or fewer.`;
    return field.validationMessage;
  };
  const showError = field => {
    const message = field.checkValidity() ? "" : messageFor(field);
    errorFor(field).textContent = message;
    if (message) field.setAttribute("aria-invalid", "true");
    else field.removeAttribute("aria-invalid");
    return !message;
  };
  const clearErrors = () => fields.forEach(field => {
    field.removeAttribute("aria-invalid");
    const node = $(`#err-${field.name}`, form);
    if (node) node.textContent = "";
  });
  // Once a field shows an error, re-check it as the visitor types so the error clears straight away.
  fields.forEach(field => field.addEventListener("input", () => {
    checkRules();
    if (field.getAttribute("aria-invalid") === "true") showError(field);
  }));

  // ---------- Estimate ----------
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

  [vehicleSelect, dateInput].forEach(input => input.addEventListener("input", applyVehicleRules));
  [vehicleSelect, dateInput, hoursInput].forEach(input => input.addEventListener("input", updateEstimate));
  const params = new URLSearchParams(location.search);
  const preset = params.get("vehicle");
  if (preset && window.KH_FLEET[preset]) vehicleSelect.value = preset;
  // Hours carried over from a vehicle page estimator, e.g. request.html?vehicle=maybach-sprinter&hours=6
  const presetHours = Number(params.get("hours"));
  if (Number.isInteger(presetHours) && presetHours >= 1 && presetHours <= 24) hoursInput.value = String(presetHours);
  applyVehicleRules();
  updateEstimate();

  // ---------- Status, confirmation and "send another" ----------
  const setStatus = (kind, ...content) => {
    status.className = `form-status${kind ? ` is-${kind}` : ""}`;
    status.replaceChildren(...content);
  };
  const longDate = value => {
    const date = parseLocalDate(value);
    return date ? new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date) : value;
  };
  const shortTime = value => {
    const [h, m] = String(value).split(":").map(Number);
    if (!Number.isFinite(h)) return value;
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, h, m || 0));
  };
  const showDone = (vehicleName, values) => {
    $("[data-done-summary]", done).textContent =
      `${vehicleName} on ${longDate(values.service_date)}, pickup at ${shortTime(values.pickup_time)}.`;
    setStatus("");
    form.classList.add("is-sent");
    done.hidden = false;
    done.scrollIntoView({ block: "start", behavior: reduceMotion.matches ? "auto" : "smooth" });
    $("h2", done).focus({ preventScroll: true });
  };
  $("[data-form-again]", form).addEventListener("click", () => {
    form.reset();
    hoursAutoFilled = false;
    clearErrors();
    setStatus("");
    done.hidden = true;
    form.classList.remove("is-sent");
    applyVehicleRules();
    updateEstimate();
    $("[name=name]", form).focus();
  });

  // ---------- Submit ----------
  form.addEventListener("submit", event => {
    event.preventDefault();
    setStatus("");
    checkRules();
    const invalid = fields.filter(field => !showError(field));
    if (invalid.length) {
      invalid[0].focus();
      setStatus("error", `Check the ${invalid.length === 1 ? "highlighted field" : `${invalid.length} highlighted fields`} and send again.`);
      return;
    }
    const result = updateEstimate();
    const values = Object.fromEntries(new FormData(form));
    // Honeypot: the hidden "company_website" field is only ever filled in by bots.
    // Show them the usual confirmation and send nothing.
    if ((values.company_website || "").trim()) {
      showDone(result.vehicle.name, values);
      return;
    }
    const subject = `Availability inquiry — ${result.vehicle.name} — ${values.service_date}`;
    const body = [
      "KH Chauffeurs availability inquiry",
      "This is an inquiry only. It is not a confirmed reservation or payment.", "",
      `Name: ${values.name}`, `Phone: ${values.phone}`, `Email: ${values.email}`,
      `Preferred vehicle: ${result.vehicle.name}`, `Passenger count: ${values.passengers}`,
      `Service date: ${values.service_date}`, `Pickup time: ${values.pickup_time}`,
      `Pickup location: ${values.pickup}`, `Drop-off location: ${values.dropoff}`,
      `Requested rental hours: ${values.hours}`, `Event or trip type: ${values.event_type || "Not provided"}`,
      `Notes: ${values.notes || "Not provided"}`, "",
      `Base rental · ${result.billableHours} hour${result.billableHours === 1 ? "" : "s"}: ${money(result.base)}`,
      `50% deposit: ${money(result.deposit)}`,
      `Balance on arrival: ${money(result.balance)}`, "",
      "Estimate is subject to availability and confirmed applicable charges."
    ].join("\n");
    const mailtoHref = `mailto:${window.KH_BOOKING.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Field names follow what the n8n "Prepare Form Row" node reads; the rest land in "Form Details".
    const lead = {
      name: values.name, email: values.email, phone: values.phone,
      message: values.notes || "",
      vehicle: result.vehicle.name, passengers: values.passengers,
      service_date: values.service_date, pickup_time: values.pickup_time,
      pickup: values.pickup, dropoff: values.dropoff,
      hours: values.hours, event_type: values.event_type || "",
      estimate_base: money(result.base), deposit: money(result.deposit), balance: money(result.balance)
    };
    submitButton.disabled = true;
    submitButton.setAttribute("aria-busy", "true");
    submitButton.textContent = "Sending…";
    const send = window.khSendLead ? window.khSendLead(lead, "Availability inquiry") : Promise.reject(new Error("Lead tracking unavailable"));
    send.then(() => {
      showDone(result.vehicle.name, values);
    }).catch(() => {
      // Keep the visitor's answers and give them two other ways to reach the team.
      const { phone, phoneDisplay } = window.KH_BOOKING;
      const call = Object.assign(document.createElement("a"), { href: `tel:${phone}`, textContent: phoneDisplay });
      const mail = Object.assign(document.createElement("a"), { href: mailtoHref, textContent: "email the prepared inquiry" });
      const title = Object.assign(document.createElement("strong"), { textContent: "Your inquiry didn't send." });
      setStatus("error", title, " Your answers are still here. Try again, call ", call, ", or ", mail, ".");
    }).finally(() => {
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
      submitButton.textContent = submitLabel;
    });
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
