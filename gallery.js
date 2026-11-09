// Vehicle photo carousels: one reusable cross-fade core, two presentations, one configuration per vehicle.
//
//  1. Gallery section: <section class="vg section-dark" data-gallery="sprinter|g-wagon"> (the section may hold a plain
//     fallback grid of the same photos, which is replaced once the script runs). Manual navigation only.
//  2. Hero carousel: <figure class="vp-hero-media" data-hero-gallery="limo-bus|executive-sprinter|maybach-sprinter|g-wagon"> turns the hero photo of a vehicle page
//     into a carousel. It auto-advances slowly and pauses on hover, focus, touch, a hidden tab, or when scrolled out of
//     view; there is also a pause button, and reduced-motion visitors get no autoplay.
//
// Slides are stacked and cross-faded: the incoming slide fades in on top of the outgoing one, which stays fully visible
// until the fade finishes, so a blank frame never shows. To add photos to a vehicle, add an entry to its slides list.
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

  // Hero carousels. fit "cover" fills the hero (pos = focal point); "contain" shows the whole photo over a blurred copy.
  // Slide 1 must match the <img> already in the page's hero so nothing changes before the script runs.
  const HEROES = {
    "limo-bus": {
      name: "Limousine bus",
      slides: [
        { src: "assets/limo-bus-hero-exterior.webp", w: 918, h: 612, fit: "cover", pos: "28% center", alt: "Black limousine bus with a chrome grille, parked in a tree-lined lot" },
        { src: "assets/limo-bus-gallery-side.webp", w: 939, h: 626, fit: "contain", alt: "Black limousine bus seen from the side" },
        { src: "assets/limo-bus-cabin.webp", w: 860, h: 1216, fit: "contain", alt: "Limousine bus cabin with leather seating along both side walls and an open centre aisle" },
        { src: "assets/limo-bus-cabin-purple.webp", w: 900, h: 543, fit: "contain", alt: "Limousine bus cabin with leather lounge seating along both side walls, a purple lit aisle and a starlight ceiling" }
      ]
    }
  };

  // Heroes that reuse a photo list from GALLERIES: "first" is the photo already in the page's hero <img>, "exclude" drops photos from this page only, "cover" lists the
  // photos that fill the hero (with their focal point); every other photo is shown whole over a blurred copy.
  HEROES["executive-sprinter"] = {
    name: "Mercedes-Benz Sprinter",
    from: "sprinter",
    first: "assets/sprinter-exterior-enhanced.webp",
    exclude: ["assets/executive-sprinter.webp", "assets/sprinter-panel-rear-bench.webp", "assets/sprinter-panel-captain-chairs.webp", "assets/sprinter-panel-front-screen.webp"],
    cover: { "assets/sprinter-exterior-enhanced.webp": "74% center", "assets/sprinter-cabin-lounge.webp": "center" }
  };
  HEROES["maybach-sprinter"] = HEROES["executive-sprinter"]; // the Maybach page uses exactly the same photos and settings
  HEROES["g-wagon"] = {
    name: "Mercedes-Benz G-Wagon",
    from: "g-wagon",
    first: "assets/g-wagon-enhanced.webp",
    cover: { "assets/g-wagon-enhanced.webp": "center 15%" }
  };

  // Four Sprinter cabin photos that the limo bus page also shows after its own photos (same files as the Sprinter galleries).
  HEROES["limo-bus"].slides.push(...[
    "assets/executive-sprinter.webp",
    "assets/sprinter-panel-rear-bench.webp",
    "assets/sprinter-panel-captain-chairs.webp",
    "assets/sprinter-panel-front-screen.webp"
  ].map(src => ({ ...GALLERIES.sprinter.slides.find(s => s.src === src), fit: "contain" })));

  const heroSlides = cfg => {
    if (!cfg.from) return cfg.slides;
    const list = GALLERIES[cfg.from].slides.filter(s => !(cfg.exclude || []).includes(s.src));
    const at = list.findIndex(s => s.src === cfg.first);
    if (at > 0) list.unshift(...list.splice(at, 1));
    return list.map(s => ({ ...s, fit: cfg.cover && s.src in cfg.cover ? "cover" : "contain", pos: cfg.cover && cfg.cover[s.src] }));
  };

  const AUTOPLAY_MS = 5500;
  const FADE_MS = 600;
  const ARROW = d => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`;
  const PREV = ARROW("M15 5l-7 7 7 7");
  const NEXT = ARROW("M9 5l7 7-7 7");
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)");

  // Shared cross-fade core. slides: elements stacked in one frame. Calls onChange(current) after every switch.
  const carousel = (slides, onChange) => {
    let current = slides[0];
    let busy = false;
    let queued = null;
    let inflight = null;

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
      onChange(current);
      setTimeout(() => {
        previous.classList.remove("is-active");
        target.classList.remove("is-incoming");
        busy = false;
        inflight = null;
        const next = queued;
        queued = null;
        if (next && next !== current) show(next);
      }, (REDUCED.matches ? 0 : FADE_MS) + 30);
    };

    const step = dir => {
      const from = [queued, inflight, current].find(Boolean);
      show(slides[(slides.indexOf(from) + dir + slides.length) % slides.length]);
    };

    // Left/right arrow keys on keyEl; horizontal swipe on swipeEl. onTouch(true/false) reports touch contact.
    const bind = (keyEl, swipeEl, onTouch = () => {}) => {
      keyEl.addEventListener("keydown", e => {
        if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
        if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
      });
      let startX = null;
      swipeEl.addEventListener("pointerdown", e => { startX = e.clientX; if (e.pointerType !== "mouse") onTouch(true); });
      const end = e => {
        const dx = startX === null ? 0 : e.clientX - startX;
        startX = null;
        onTouch(false);
        if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
      };
      swipeEl.addEventListener("pointerup", end);
      swipeEl.addEventListener("pointercancel", () => { startX = null; onTouch(false); });
    };

    return { show, step, bind, current: () => current };
  };

  const eagerLoadLater = slides => window.addEventListener("load", () => slides.forEach(s => { s.querySelector("img").loading = "eager"; }));

  // ---------- 1. Gallery section ----------
  const buildSection = (root, cfg) => {
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
      `<div class="vg-controls"><button type="button" class="vg-arrow" data-dir="-1" aria-label="Previous photo">${PREV}</button>` +
      `<div class="vg-dots" role="group" aria-label="Choose a photo"></div>` +
      `<button type="button" class="vg-arrow" data-dir="1" aria-label="Next photo">${NEXT}</button>` +
      `<span class="vg-count" aria-live="polite"></span></div></div></div></div>`;
  };

  const initSection = root => {
    const cfg = GALLERIES[root.dataset.gallery];
    if (!cfg) return;
    buildSection(root, cfg);
    const slides = [...root.querySelectorAll(".vg-slide")];
    const dotsBox = root.querySelector(".vg-dots");
    const count = root.querySelector(".vg-count");
    const c = carousel(slides, () => render());

    const render = () => {
      dotsBox.replaceChildren(...slides.map((slide, n) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "vg-dot" + (slide === c.current() ? " is-active" : "");
        b.setAttribute("aria-label", `Photo ${n + 1} of ${slides.length}: ${slide.querySelector("img").alt}`);
        if (slide === c.current()) b.setAttribute("aria-current", "true");
        b.addEventListener("click", () => c.show(slide));
        return b;
      }));
      count.textContent = `${slides.indexOf(c.current()) + 1} / ${slides.length}`;
    };

    root.querySelectorAll(".vg-arrow").forEach(b => b.addEventListener("click", () => c.step(Number(b.dataset.dir))));
    c.bind(root.querySelector(".vg-body"), root.querySelector(".vg-stage"));
    eagerLoadLater(slides);
    render();
  };

  // ---------- 2. Hero carousel ----------
  const initHero = fig => {
    const cfg = HEROES[fig.dataset.heroGallery];
    if (!cfg) return;
    const existing = fig.querySelector("img"); // the static hero photo: it becomes slide 1, so nothing flickers

    const stage = document.createElement("div");
    stage.className = "vgh-stage";
    const slides = heroSlides(cfg).map((s, i) => {
      const el = document.createElement("div");
      el.className = "vgh-slide" + (i ? "" : " is-active") + (s.fit === "contain" ? " is-contain" : "");
      el.style.setProperty("--vg-bg", `url('${s.src}')`);
      if (s.pos) el.style.setProperty("--pos", s.pos);
      let img = existing && i === 0 ? existing : document.createElement("img");
      if (!(existing && i === 0)) {
        img.src = s.src;
        img.alt = s.alt;
        img.width = s.w;
        img.height = s.h;
        img.loading = "lazy";
        img.decoding = "async";
      }
      el.append(img);
      return el;
    });
    stage.append(...slides);

    const controls = document.createElement("div");
    controls.className = "vgh-controls";
    controls.innerHTML =
      `<button type="button" class="vgh-btn" data-dir="-1" aria-label="Previous photo">${PREV}</button>` +
      `<div class="vgh-dots" role="group" aria-label="Choose a photo"></div>` +
      `<button type="button" class="vgh-btn" data-dir="1" aria-label="Next photo">${NEXT}</button>` +
      `<span class="vgh-count" aria-live="off"></span>` +
      `<button type="button" class="vgh-btn vgh-pause" aria-label="Pause automatic slideshow" aria-pressed="false">` +
      `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path class="vgh-icon-pause" d="M8 5v14M16 5v14" fill="none" stroke="currentColor" stroke-width="2"/>` +
      `<path class="vgh-icon-play" d="M8 5l11 7-11 7z" fill="currentColor"/></svg></button>`;

    fig.setAttribute("role", "region");
    fig.setAttribute("aria-roledescription", "carousel");
    fig.setAttribute("aria-label", `${cfg.name} photos`);
    fig.tabIndex = 0;
    fig.classList.add("is-carousel");
    fig.append(stage, controls);

    const dotsBox = controls.querySelector(".vgh-dots");
    const count = controls.querySelector(".vgh-count");
    const pauseBtn = controls.querySelector(".vgh-pause");

    // Autoplay: runs only when nothing is holding it back. Every switch (manual or automatic) restarts the timer.
    let timer = null;
    const hold = { hover: false, focus: false, touch: false, hidden: false, offscreen: false, user: false };
    const running = () => !REDUCED.matches && !Object.values(hold).some(Boolean);
    const schedule = () => {
      clearTimeout(timer);
      if (running()) timer = setTimeout(() => { if (running()) c.step(1); else schedule(); }, AUTOPLAY_MS);
    };
    const setHold = (key, value) => { hold[key] = value; schedule(); };

    const c = carousel(slides, () => { render(); schedule(); });

    const render = () => {
      dotsBox.replaceChildren(...slides.map((slide, n) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "vgh-dot" + (slide === c.current() ? " is-active" : "");
        b.setAttribute("aria-label", `Photo ${n + 1} of ${slides.length}: ${slide.querySelector("img").alt}`);
        if (slide === c.current()) b.setAttribute("aria-current", "true");
        b.addEventListener("click", () => c.show(slide));
        return b;
      }));
      count.textContent = `${slides.indexOf(c.current()) + 1} / ${slides.length}`;
    };

    controls.querySelectorAll(".vgh-btn[data-dir]").forEach(b => b.addEventListener("click", () => c.step(Number(b.dataset.dir))));
    pauseBtn.addEventListener("click", () => {
      const on = !hold.user;
      pauseBtn.setAttribute("aria-pressed", String(on));
      pauseBtn.setAttribute("aria-label", on ? "Play automatic slideshow" : "Pause automatic slideshow");
      fig.classList.toggle("is-paused", on);
      setHold("user", on);
    });
    c.bind(fig, stage, touching => setHold("touch", touching));

    fig.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") setHold("hover", true); });
    fig.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") setHold("hover", false); });
    fig.addEventListener("focusin", () => setHold("focus", true));
    fig.addEventListener("focusout", () => setHold("focus", false));
    document.addEventListener("visibilitychange", () => setHold("hidden", document.hidden));
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(entries => setHold("offscreen", !entries[entries.length - 1].isIntersecting), { threshold: 0.35 }).observe(fig);
    }
    REDUCED.addEventListener("change", schedule);

    eagerLoadLater(slides);
    render();
    schedule();
  };

  document.querySelectorAll(".vg[data-gallery]").forEach(initSection);
  document.querySelectorAll("[data-hero-gallery]").forEach(initHero);
})();
