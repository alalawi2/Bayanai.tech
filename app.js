/* Bayan AI — opening film, chapters and demos.
   Opening: a still of the globe on desktop; on phones the film plays once
   and holds its last frame. Chapters: each app's
   screenshot sits inside an illustrated laptop (desktop) or phone (mobile);
   tabs cross-fade between states and the card opens the full-size demo. */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));

  const apps = JSON.parse($("#app-data").textContent);
  const appMap = new Map(apps.map((a) => [a.id, a]));
  const small = matchMedia("(max-width: 760px), ((max-width: 1100px) and (orientation: portrait))");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let motionPaused = reduced.matches;
  const header = $(".site-header");
  const rail = $(".side-rail");
  const userSteps = new Map();
  let mode = null;

  /* ------------------------------------------------------------------ */
  /* Screenshots                                                          */
  /* ------------------------------------------------------------------ */
  const screenPath = (a, step, m) =>
    "assets/screens/" + a.id + "-" + String(step + 1).padStart(2, "0") + "-" + a.states[step] + "-" + (m === "mobile" ? "mobile" : "desktop") + ".png";
  const preloaded = new Set();
  function preloadShots(a, m) {
    if (!a) return;
    const key = a.id + ":" + m;
    if (preloaded.has(key)) return;
    preloaded.add(key);
    a.states.forEach((_, i) => { const im = new Image(); im.src = screenPath(a, i, m); });
  }
  function updateStep(section, step, manual = false) {
    const a = appMap.get(section.dataset.app);
    if (!a) return;
    step = clamp(step, 0, a.states.length - 1);
    if (manual) userSteps.set(a.id, step);
    const glass = $(".screen-glass", section);
    const key = mode + ":" + step;
    if (glass && glass.dataset.step !== key) {
      glass.dataset.step = key;
      let shots = $$(".shot", glass);
      if (shots.length < 2) {
        glass.replaceChildren();
        shots = [0, 1].map(() => {
          const img = document.createElement("img");
          img.className = "shot";
          img.alt = "";
          img.decoding = "async";
          glass.append(img);
          return img;
        });
      }
      const current = shots.find((s) => s.classList.contains("is-current"));
      const next = shots.find((s) => s !== current) || shots[0];
      next.src = screenPath(a, step, mode);
      const show = () => {
        if (glass.dataset.step !== key) return;
        next.classList.add("is-current");
        if (current && current !== next) current.classList.remove("is-current");
      };
      if (next.complete && next.naturalWidth) show();
      else if (next.decode) next.decode().then(show, show);
      else next.addEventListener("load", show, { once: true });
    }
    $$("[data-demo-step]", section).forEach((b) => b.setAttribute("aria-pressed", Number(b.dataset.demoStep) === step));
  }

  /* ------------------------------------------------------------------ */
  /* Opening film (phones only; desktop shows a still): the clip plays   */
  /* once while the opening is on screen and holds its last frame.        */
  /* ------------------------------------------------------------------ */
  const hero = {
    film: $("#top .film"),
    video: $("#top .hero-film"),
    state: "idle", // idle | ready | playing | ended
  };
  hero.video.addEventListener("ended", () => heroFinish());

  function heroEnter() {
    const v = hero.video;
    v.pause();
    v.muted = true;
    v.playsInline = true;
    v.loop = false;
    v.preload = "none";
    v.poster = v.dataset.poster;
    v.src = v.dataset.src;
    hero.state = "idle";
    if (motionPaused) heroFinish(true);
  }
  function heroLeave() {
    // Desktop shows the still; drop the clip so nothing downloads.
    const v = hero.video;
    v.pause();
    v.removeAttribute("poster");
    if (v.getAttribute("src")) { v.removeAttribute("src"); v.load(); }
    hero.state = "idle";
  }
  function heroPrepare() {
    if (hero.state !== "idle") return;
    hero.video.preload = "auto";
    hero.video.load();
    hero.state = "ready";
  }
  function heroPlay() {
    if (motionPaused || hero.state === "ended") return;
    heroPrepare();
    const attempt = hero.video.play();
    if (attempt && attempt.catch) attempt.catch(() => heroFinish(true));
    hero.state = "playing";
  }
  function heroPause() {
    if (hero.state === "playing") {
      hero.video.pause();
      hero.state = "ready";
    }
  }
  function heroFinish(stopNow = false) {
    // The clip holds its last frame. If motion is off (or playback is refused), show the final still.
    const v = hero.video;
    if (stopNow) {
      v.pause();
      v.poster = v.dataset.end;
      if (!v.currentTime) { v.removeAttribute("preload"); v.load(); }
    }
    hero.state = "ended";
  }

  /* ------------------------------------------------------------------ */
  /* Modes                                                                */
  /* ------------------------------------------------------------------ */
  const chapters = $$(".app-chapter");
  const movable = $$(".app-chapter, .workflow").map((el) => ({ el, parent: el.parentNode, next: el.nextElementSibling }));
  function placeChapters(intoFolders) {
    if (intoFolders) {
      movable.forEach(({ el }) => {
        if (el.classList.contains("workflow")) return;
        const body = $('.folder[data-category="' + el.dataset.category + '"] .folder-body');
        if (body) body.append(el);
      });
      movable.forEach(({ el }) => {
        if (!el.classList.contains("workflow")) return;
        const after = document.getElementById(el.dataset.folderAfter);
        if (after) after.after(el);
      });
    } else {
      [...movable].reverse().forEach(({ el, parent, next }) => parent.insertBefore(el, next));
    }
  }

  let playObserver = null;
  let prepareObserver = null;
  function applyMode() {
    const next = small.matches ? "mobile" : "desktop";
    if (next === mode) return;
    mode = next;
    if (playObserver) { playObserver.disconnect(); prepareObserver.disconnect(); playObserver = prepareObserver = null; }
    if (mode === "mobile") {
      heroEnter();
      prepareObserver = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) heroPrepare(); });
      }, { rootMargin: "120% 0px" });
      playObserver = new IntersectionObserver((entries) => {
        entries.forEach((e) => (e.intersectionRatio >= 0.45 ? heroPlay() : heroPause()));
      }, { threshold: [0, 0.45, 1] });
      prepareObserver.observe(hero.film);
      playObserver.observe(hero.film);
      resetFilter();
      placeChapters(true);
      const openFolder = $(".folder[open]");
      if (openFolder) $$(".app-chapter", openFolder).forEach((s) => preloadShots(appMap.get(s.dataset.app), "mobile"));
    } else {
      heroLeave();
      placeChapters(false);
      chapters.forEach((s) => preloadShots(appMap.get(s.dataset.app), "desktop"));
    }
    chapters.forEach((s) => updateStep(s, userSteps.get(s.dataset.app) ?? 0));
    requestRender();
  }

  /* ------------------------------------------------------------------ */
  /* Scroll loop                                                          */
  /* ------------------------------------------------------------------ */
  let scheduled = false;
  let railActive = null;
  let lastDark = null;
  const railLinks = $$("a", rail);
  function requestRender() {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(render);
    }
  }
  function render() {
    scheduled = false;
    // Read every position first, then write: interleaving the two forces
    // the browser to re-run layout in the middle of a frame.
    const r = hero.film.getBoundingClientRect();
    const dark = r.bottom > 40 && r.top < 40;
    if (mode === "desktop") {
      // side rail: the last section whose top has passed the middle of the screen
      const vh = innerHeight;
      let active = "top";
      for (const s of chapters) {
        if (s.hidden) continue;
        if (s.getBoundingClientRect().top < vh * 0.5) active = s.id;
        else break; // chapters are in document order
      }
      if (active !== railActive) {
        railActive = active;
        railLinks.forEach((a) => {
          const is = a.hash === "#" + active;
          a.classList.toggle("active", is);
          if (is) a.setAttribute("aria-current", "location");
          else a.removeAttribute("aria-current");
        });
      }
    }
    if (dark !== lastDark) {
      lastDark = dark;
      header.classList.toggle("on-light", !dark);
      rail.classList.toggle("on-light", !dark);
    }
  }

  addEventListener("scroll", requestRender, { passive: true });
  addEventListener("resize", requestRender);
  small.addEventListener("change", applyMode);
  addEventListener("load", requestRender);

  /* ------------------------------------------------------------------ */
  /* Controls                                                             */
  /* ------------------------------------------------------------------ */
  const menu = $(".menu-toggle");
  menu.addEventListener("click", () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", open);
    header.classList.toggle("menu-open", open);
  });

  function resetFilter() {
    const all = $('[data-filter="All solutions"]');
    if (all && all.getAttribute("aria-pressed") !== "true") all.click();
  }
  const scrollBehavior = () => (reduced.matches ? "instant" : "smooth");
  function openFolderOnly(folder) {
    $$(".folder[open]").forEach((o) => { if (o !== folder) o.open = false; });
    if (!folder.open) {
      folder.dataset.programmatic = "1";
      folder.open = true;
    }
    $$(".app-chapter", folder).forEach((s) => preloadShots(appMap.get(s.dataset.app), "mobile"));
  }
  function scrollToChapter(target) {
    // Land with the chapter's heading right under the fixed header and the sticky folder title.
    const folder = target.closest(".folder");
    const summaryH = folder ? $("summary", folder).offsetHeight : 0;
    const y = target.getBoundingClientRect().top + scrollY - header.offsetHeight - summaryH - 4;
    window.scrollTo({ top: Math.max(0, y), behavior: scrollBehavior() });
  }

  $$('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      menu.setAttribute("aria-expanded", "false");
      header.classList.remove("menu-open");
      if (a.hash.length < 2) return;
      const target = document.querySelector(a.hash);
      if (!target) return;
      if (target.hidden) resetFilter();
      if (target.dataset.app) userSteps.delete(target.dataset.app);
      const folder = target.closest(".folder");
      if (folder && mode === "mobile") {
        e.preventDefault();
        openFolderOnly(folder);
        scrollToChapter(target);
        history.replaceState(null, "", a.hash);
      }
    }),
  );

  // Category folders (mobile): one open at a time. When the user taps a
  // folder, keep it in view even though another folder above it collapses.
  $$(".folder").forEach((f) =>
    f.addEventListener("toggle", () => {
      if (!f.open) return;
      const programmatic = f.dataset.programmatic === "1";
      delete f.dataset.programmatic;
      $$(".folder[open]").forEach((o) => { if (o !== f) o.open = false; });
      $$(".app-chapter", f).forEach((s) => preloadShots(appMap.get(s.dataset.app), mode));
      if (programmatic) return;
      const y = f.getBoundingClientRect().top + scrollY - header.offsetHeight - 2;
      window.scrollTo({ top: Math.max(0, y), behavior: scrollBehavior() });
    }),
  );

  $$("[data-filter]").forEach((button) =>
    button.addEventListener("click", () => {
      const category = button.dataset.filter;
      $$("[data-filter]").forEach((b) => b.setAttribute("aria-pressed", b === button));
      let count = 0;
      $$(".app-chapter:not(#research)").forEach((s) => {
        s.hidden = category !== "All solutions" && s.dataset.category !== category;
        if (!s.hidden) count++;
      });
      $(".filter-count").textContent = "Showing " + count + " solution" + (count === 1 ? "" : "s");
      requestRender();
    }),
  );

  $$("[data-demo-step]").forEach((b) =>
    b.addEventListener("click", () => updateStep(b.closest(".app-chapter"), Number(b.dataset.demoStep), true)),
  );

  /* ------------------------------------------------------------------ */
  /* Dialog                                                               */
  /* ------------------------------------------------------------------ */
  const dialog = $(".demo-dialog");
  let dialogApp = null;
  function showDialogStep(step) {
    $(".dialog-screen img", dialog).src = screenPath(dialogApp, step, mode);
    $$("[data-dialog-step]", dialog).forEach((b) => b.setAttribute("aria-pressed", Number(b.dataset.dialogStep) === step));
  }
  function openDemo(id, step = 0) {
    dialogApp = appMap.get(id);
    if (!dialogApp) return;
    preloadShots(dialogApp, mode);
    $("#demo-title").textContent = dialogApp.name;
    $(".dialog-note", dialog).textContent =
      id === "medad" ? "Illustrative interface · ACTIVE R&D · Clinician review remains part of the workflow." : "Illustrative interface based on the project’s described features.";
    const tabs = $(".dialog-tabs", dialog);
    tabs.replaceChildren();
    dialogApp.labels.forEach((label, i) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.dataset.dialogStep = i;
      b.addEventListener("click", () => showDialogStep(i));
      tabs.append(b);
    });
    showDialogStep(clamp(step, 0, dialogApp.states.length - 1));
    dialog.showModal();
    document.body.classList.add("dialog-open");
  }
  $$("[data-open-demo]").forEach((b) => b.addEventListener("click", () => openDemo(b.dataset.openDemo, userSteps.get(b.dataset.openDemo) || 0)));
  $(".close-dialog", dialog).addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
    }
  });
  dialog.addEventListener("close", () => document.body.classList.remove("dialog-open"));

  // The device card opens the full-size demo (click, Enter or Space).
  const openFromCard = (card) => {
    const section = card.closest(".app-chapter");
    if (section) openDemo(section.dataset.app, userSteps.get(section.dataset.app) || 0);
  };
  document.addEventListener("click", (event) => {
    const card = event.target.closest(".demo-card");
    if (card) openFromCard(card);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest && event.target.closest(".demo-card");
    if (card) { event.preventDefault(); openFromCard(card); }
  });

  applyMode();
  requestRender();
})();
