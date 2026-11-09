// Vehicle photo galleries: one reusable carousel, one configuration per vehicle.
// A page opts in with <section class="vg section-dark" data-gallery="sprinter|limo-bus|g-wagon"> (the section may hold a
// plain fallback grid of the same photos, which is replaced once the script runs). Manual navigation only, no autoplay.
// Slides are stacked and cross-faded: the incoming slide fades in on top of the outgoing one, which stays fully visible
// until the fade finishes, so a blank frame never shows.
(() => {
  const GALLERIES = {
    "sprinter": {
      name: "Mercedes-Benz Sprinter",
      title: "See the Sprinter up close",
      blurb: "Forward-facing leather seating, ambient ceiling lighting and a quiet cabin for executive group travel.",
      slides: [
        { src: "assets/sprinter-estate.webp", w: 1080, h: 1440, label: "Exterior", alt: "Black Mercedes-Benz Sprinter parked in front of an estate building" },
        { src: "assets/sprinter-exterior-enhanced.webp", w: 1672, h: 941, label: "Exterior", alt: "Black Mercedes-Benz Sprinter parked outside a Topgolf venue" },
        { src: "assets/sprinter-front.webp", w: 481, h: 600, label: "Exterior", alt: "Front three-quarter view of a black Mercedes-Benz Sprinter parked beside another van" },
        { src: "assets/sprinter-grille.webp", w: 494, h: 600, label: "Exterior", alt: "Front of a black Mercedes-Benz Sprinter with the star grille" },
        { src: "assets/executive-sprinter.webp", w: 1080, h: 1351, label: "Cabin", alt: "Sprinter cabin with forward-facing leather captain chairs, a starlight ceiling and a front display" },
        { src: "assets/sprinter-panel-rear-bench.webp", w: 501, h: 671, label: "Cabin", alt: "Sprinter cabin with a rear bench seat and side lounges under a wall-mounted display" },
        { src: "assets/sprinter-panel-captain-chairs.webp", w: 503, h: 665, label: "Cabin", alt: "Sprinter cabin with two leather captain chairs facing forward under a lit skylight ceiling" },
        { src: "assets/sprinter-panel-front-screen.webp", w: 501, h: 665, label: "Cabin", alt: "Sprinter front lounge with captain chairs, a centre console and a large display" },
        { src: "assets/sprinter-cabin-tv.webp", w: 484, h: 600, label: "Cabin lounge", alt: "Sprinter cabin with leather seats facing a wall-mounted display and a snack table" },
        { src: "assets/sprinter-cabin-lounge.webp", w: 1080, h: 664, label: "Cabin lounge", alt: "Sprinter cabin with forward-facing quilted leather seats beside a conference table" },
        { src: "assets/sprinter-seats-table.webp", w: 481, h: 600, label: "Cabin lounge", alt: "Rows of forward-facing leather seats behind a table with a snack basket" },
        { src: "assets/sprinter-lounge-purple.webp", w: 489, h: 600, label: "Cabin lounge", alt: "Sprinter cabin with quilted leather seating, a table and purple ceiling lighting" },
        { src: "assets/sprinter-ceiling-purple.webp", w: 495, h: 600, label: "Cabin lounge", alt: "Sprinter cabin seen from the entrance with quilted leather seats and a purple lit ceiling" },
        { src: "assets/sprinter-interior-enhanced.webp", w: 851, h: 1847, label: "Forward-facing seating", alt: "Rows of forward-facing leather passenger seats in a Sprinter under blue ceiling lighting" }
      ]
    },
    "limo-bus": {
      name: "Limousine bus",
      title: "See the limousine bus up close",
      blurb: "Lounge seating along both side walls with an open centre aisle, built for larger groups travelling together.",
      slides: [
        { src: "assets/limo-bus-gallery-exterior.webp", w: 918, h: 612, label: "Exterior", alt: "Black limousine bus seen from the front three-quarter angle" },
        { src: "assets/limo-bus-gallery-side.webp", w: 939, h: 626, label: "Side view", alt: "Black limousine bus seen from the side" },
        { src: "assets/limo-bus-cabin.webp", w: 860, h: 1216, label: "Cabin", alt: "Limousine bus cabin with leather seating along both side walls and an open centre aisle" },
        { src: "assets/limo-bus-cabin-purple.webp", w: 900, h: 543, label: "Cabin", alt: "Limousine bus cabin with leather lounge seating along both side walls, a purple lit aisle and a starlight ceiling" }
      ]
    },
    "g-wagon": {
      name: "Mercedes-Benz G-Wagon",
      title: "See the G-Wagon up close",
      blurb: "An arrival in a distinctive luxury SUV.",
      slides: [
        { src: "assets/g-wagon-enhanced.webp", w: 1214, h: 1295, label: "Exterior", alt: "Black Mercedes-Benz G-Wagon parked on a residential street" },
        { src: "assets/g-wagon-front.webp", w: 425, h: 600, label: "Front", alt: "Front of a black Mercedes-Benz G-Wagon with the star grille" },
        { src: "assets/g-wagon-rear.webp", w: 422, h: 600, label: "Rear", alt: "Rear three-quarter view of a black Mercedes-Benz G-Wagon with the G63 badge" }
      ]
    }
  };

  const ARROW = d => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`;
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)");

  const build = (root, cfg) => {
    const pageId = document.body.dataset.vehicle;
    const vehicle = (window.KH_FLEET || {})[pageId];
    const guests = vehicle && vehicle.passengers ? `<p class="vg-meta">Up to <span>${vehicle.passengers}</span> passengers</p>` : "";
    const request = pageId ? `<div class="vg-links"><a class="button button-gold" href="request.html?vehicle=${esc(pageId)}">Request this vehicle</a></div>` : "";
    const slides = cfg.slides.map((s, i) =>
      `<figure class="vg-slide${i ? "" : " is-active"}" style="--vg-bg:url('${esc(s.src)}')">` +
      `<img src="${esc(s.src)}" alt="${esc(s.alt)}" width="${s.w}" height="${s.h}" ${i ? 'loading="lazy" ' : ""}decoding="async">` +
      `<figcaption class="vg-label">${esc(s.label)}</figcaption></figure>`).join("");
    root.innerHTML =
      `<div class="container"><header class="vg-head"><div><p class="kicker">Gallery</p><h2>${esc(cfg.title)}</h2></div></header>` +
      `<div class="vg-body" role="region" aria-roledescription="carousel" aria-label="${esc(cfg.name)} photos" tabindex="0">` +
      `<div class="vg-stage">${slides}</div>` +
      `<div class="vg-info"><div class="vg-panel"><h3>${esc(cfg.name)}</h3><p>${esc(cfg.blurb)}</p>${guests}${request}</div>` +
      `<div class="vg-controls"><button type="button" class="vg-arrow" data-dir="-1" aria-label="Previous photo">${ARROW("M15 5l-7 7 7 7")}</button>` +
      `<div class="vg-dots" role="group" aria-label="Choose a photo"></div>` +
      `<button type="button" class="vg-arrow" data-dir="1" aria-label="Next photo">${ARROW("M9 5l7 7-7 7")}</button>` +
      `<span class="vg-count" aria-live="polite"></span></div></div></div></div>`;
  };

  const init = root => {
    const cfg = GALLERIES[root.dataset.gallery];
    if (!cfg) return;
    build(root, cfg);

    const body = root.querySelector(".vg-body");
    const stage = root.querySelector(".vg-stage");
    const slides = [...root.querySelectorAll(".vg-slide")];
    const dotsBox = root.querySelector(".vg-dots");
    const count = root.querySelector(".vg-count");

    let current = slides[0];
    let busy = false;
    let queued = null;
    let inflight = null;

    const renderControls = () => {
      dotsBox.replaceChildren(...slides.map((slide, n) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "vg-dot" + (slide === current ? " is-active" : "");
        b.setAttribute("aria-label", `Photo ${n + 1} of ${slides.length}: ${slide.querySelector("img").alt}`);
        if (slide === current) b.setAttribute("aria-current", "true");
        b.addEventListener("click", () => show(slide));
        return b;
      }));
      count.textContent = `${slides.indexOf(current) + 1} / ${slides.length}`;
    };

    const show = async target => {
      if (busy) { queued = target; return; } // the latest request wins once the running fade ends
      if (target === current) return;
      busy = true;
      inflight = target;
      try { await target.querySelector("img").decode(); } catch (e) { /* show it anyway; the blurred backdrop covers any gap */ }
      const previous = current;
      current = target;
      target.classList.add("is-incoming");
      void target.offsetWidth; // commit the starting opacity before fading in
      target.classList.add("is-active");
      renderControls();
      setTimeout(() => {
        previous.classList.remove("is-active");
        target.classList.remove("is-incoming");
        busy = false;
        inflight = null;
        const next = queued;
        queued = null;
        if (next && next !== current) show(next);
      }, (REDUCED.matches ? 0 : 500) + 30);
    };

    const step = dir => {
      const from = [queued, inflight, current].find(Boolean);
      show(slides[(slides.indexOf(from) + dir + slides.length) % slides.length]);
    };

    root.querySelectorAll(".vg-arrow").forEach(b => b.addEventListener("click", () => step(Number(b.dataset.dir))));
    body.addEventListener("keydown", e => {
      if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    });

    // Touch / pen swipe on the photo.
    let startX = null;
    stage.addEventListener("pointerdown", e => { startX = e.clientX; });
    stage.addEventListener("pointerup", e => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
    });
    stage.addEventListener("pointercancel", () => { startX = null; });

    // Fetch the other photos once the page has loaded so switching never waits on the network.
    window.addEventListener("load", () => slides.forEach(s => { s.querySelector("img").loading = "eager"; }));

    renderControls();
  };

  document.querySelectorAll(".vg[data-gallery]").forEach(init);
})();
