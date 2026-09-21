/* Bayan AI — opening film, chapters and demos.
   Opening: on desktop the film (globe → map → coast) is a fixed layer
   scrubbed by scroll; on phones it autoplays once. Chapters: each app's
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

  const FILM_RATIO = 1916 / 1080;
  const OVERLAP = 8 / 24;
  const DESKTOP_VIDEO = "assets/videos/scrub/";
  const ASSET_VERSION = "20260921d"; // bump when a clip is re-encoded
  const MOBILE_POSTER = "assets/scenes/posters/";

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
  /* Opening film: two <video> elements alternate clips and are scrubbed. */
  /* ------------------------------------------------------------------ */
  class VideoSequence {
    constructor(videos, poster, clips, durations) {
      this.videos = videos;
      this.poster = poster;
      this.clips = clips;
      this.durations = durations;
      this.starts = durations.map((_, i) => durations.slice(0, i).reduce((s, d) => s + d, 0) - i * OVERLAP);
      this.total = durations.reduce((s, d) => s + d, 0) - (durations.length - 1) * OVERLAP;
      this.targets = new Map();
      this.tries = new Map();
      this.visible = [];
      this.videos.forEach((v) => {
        v.muted = true;
        v.playsInline = true;
        v.addEventListener("loadeddata", () => this.sync(v));
        v.addEventListener("seeked", () => this.sync(v));
      });
    }
    unload() {
      this.targets.clear();
      this.visible = [];
      this.videos.forEach((v) => {
        v.pause();
        delete v.dataset.clip;
        v.removeAttribute("src");
        v.removeAttribute("poster");
        v.style.opacity = "0";
        v.load();
      });
      this.poster.classList.remove("covered");
    }
    assign(index) {
      const v = this.videos[index % 2];
      if (v.dataset.clip !== this.clips[index]) {
        this.targets.delete(v);
        v.style.opacity = "0";
        v.dataset.clip = this.clips[index];
        v.preload = "auto";
        v.src = DESKTOP_VIDEO + this.clips[index] + ".mp4?v=" + ASSET_VERSION;
        v.load();
      }
      return v;
    }
    prime() {
      if (!this.videos[0].dataset.clip) {
        this.assign(0);
        this.targets.set(this.videos[0], 0);
      }
    }
    sync(v) {
      const target = this.targets.get(v);
      if (target === undefined || !v.duration || v.readyState < 2 || v.seeking) return;
      if (Math.abs(v.currentTime - target) > 0.045) {
        // Never loop on a seek the browser refuses (e.g. a server without Range support).
        const tries = this.tries.get(v) || { target: -1, n: 0 };
        if (tries.target === target && tries.n >= 3) return;
        this.tries.set(v, { target, n: tries.target === target ? tries.n + 1 : 1 });
        v.currentTime = target;
        return;
      }
      this.tries.delete(v);
      this.paint();
    }
    ready(v) {
      return v.readyState >= 2 && !v.seeking && Math.abs(v.currentTime - this.targets.get(v)) < 0.09;
    }
    paint() {
      const ready = this.visible.filter((x) => this.ready(x.video));
      if (!ready.length) return;
      if (this.visible.length === 2 && ready.length === 1) {
        const v = ready[0].video;
        v.style.opacity = "1";
        v.style.zIndex = "1";
        this.videos.filter((w) => w !== v).forEach((w) => (w.style.zIndex = "0"));
      } else {
        this.videos.forEach((v) => {
          const layer = this.visible.find((x) => x.video === v);
          v.style.opacity = layer ? String(layer.opacity) : "0";
          v.style.zIndex = layer ? String(layer.order) : "0";
        });
      }
      this.poster.classList.add("covered");
    }
    set(progress) {
      const n = this.clips.length;
      const time = clamp(progress) * (this.total - 0.045);
      let index = 0;
      for (let i = 1; i < n; i++) if (time >= this.starts[i]) index = i;
      const local = Math.max(0, time - this.starts[index]);
      const duration = this.durations[index];
      const current = this.assign(index);
      this.targets.set(current, Math.min(duration - 0.045, local));
      if (index > 0 && local < OVERLAP) {
        const previous = this.assign(index - 1);
        this.targets.set(previous, this.durations[index - 1] - OVERLAP + local);
        this.visible = [
          { video: previous, opacity: 1, order: 1 },
          { video: current, opacity: clamp(local / OVERLAP), order: 2 },
        ];
      } else {
        this.visible = [{ video: current, opacity: 1, order: 1 }];
        if (local > duration - 1.4 && index + 1 < n) {
          const next = this.assign(index + 1);
          this.targets.set(next, 0);
          this.sync(next);
        }
      }
      this.visible.forEach((x) => this.sync(x.video));
      this.paint();
    }
  }

  const hero = {
    el: $("#top"),
    film: $("#top .film"),
    frame: $("#top .film-frame"),
    poster: $("#top .sequence-poster"),
    videos: $$("#top .sequence-video"), // only the scrub pair; the phone clip is its own element
    copy: $("#top .hero-copy"),
    note: $("#top .journey-note"),
    bar: $("#top .motion-progress i"),
    smoothP: null,
    live: false,
    mobileState: "idle", // idle | ready | playing | ended
  };
  hero.desktopPoster = hero.poster.getAttribute("src");
  hero.clips = hero.el.dataset.clips.split(",");
  hero.durations = (hero.el.dataset.clipSeconds || "").split(",").map(Number);
  while (hero.durations.length < hero.clips.length || hero.durations.some((d) => !d)) hero.durations = hero.clips.map((_, i) => hero.durations[i] || 145 / 24);
  const ph = (hero.el.dataset.phases || "0,1,1,1").split(",").map(Number);
  hero.phase = { hold: ph[0], motionEnd: ph[1] };
  hero.seq = new VideoSequence(hero.videos, hero.poster, hero.clips, hero.durations);
  hero.mobileVideo = $("#top .mobile-film");
  hero.mobileVideo.addEventListener("ended", () => heroMobileFinish());

  function heroEnterDesktop() {
    hero.mobileVideo.pause();
    hero.seq.unload();
    hero.poster.classList.remove("covered");
    hero.smoothP = null;
    hero.mobileState = "idle";
    heroLayout();
  }
  function heroEnterMobile() {
    hero.seq.unload();
    hero.el.classList.remove("film-live");
    hero.frame.style.cssText = "";
    const v = hero.mobileVideo;
    v.muted = true;
    v.playsInline = true;
    v.loop = false;
    hero.mobileState = "idle";
    if (motionPaused) heroMobileFinish(true);
  }
  function heroLayout() {
    if (mode !== "desktop") return;
    const vw = hero.film.clientWidth || innerWidth;
    const vh = hero.film.clientHeight || innerHeight;
    const W = Math.max(vw, vh * FILM_RATIO);
    const H = W / FILM_RATIO;
    hero.frame.style.width = W + "px";
    hero.frame.style.height = H + "px";
    hero.frame.style.transform = `translate3d(${((vw - W) / 2).toFixed(2)}px,${((vh - H) / 2).toFixed(2)}px,0)`;
  }
  function heroRender(p) {
    const playback = motionPaused ? 0 : clamp((p - hero.phase.hold) / Math.max(1e-6, hero.phase.motionEnd - hero.phase.hold));
    hero.seq.set(playback);
    const fade = 1 - clamp((p - 0.13) / 0.2);
    hero.copy.style.opacity = fade.toFixed(3);
    hero.copy.style.transform = `translateY(${(-30 * clamp(p / 0.3)).toFixed(1)}px)`;
    hero.copy.style.pointerEvents = fade < 0.15 ? "none" : "";
    const n = clamp((p - 0.42) / 0.12);
    hero.note.style.opacity = n.toFixed(3);
    hero.note.style.transform = `translateY(${(24 * (1 - n)).toFixed(1)}px)`;
    if (hero.bar) hero.bar.style.transform = `scaleX(${playback.toFixed(4)})`;
  }
  function heroMobilePrepare() {
    if (hero.mobileState !== "idle") return;
    const v = hero.mobileVideo;
    v.preload = "auto";
    v.load();
    hero.mobileState = "ready";
  }
  function heroMobilePlay() {
    if (motionPaused || hero.mobileState === "ended") return;
    heroMobilePrepare();
    const attempt = hero.mobileVideo.play();
    if (attempt && attempt.catch) attempt.catch(() => heroMobileFinish(true));
    hero.mobileState = "playing";
  }
  function heroMobilePause() {
    if (hero.mobileState === "playing") {
      hero.mobileVideo.pause();
      hero.mobileState = "ready";
    }
  }
  function heroMobileFinish(stopNow = false) {
    // The clip holds its last frame. If motion is off (or playback is refused), show the final still.
    const v = hero.mobileVideo;
    if (stopNow) {
      v.pause();
      v.poster = MOBILE_POSTER + "opening-mobile-end.jpg";
      if (!v.currentTime) { v.removeAttribute("preload"); v.load(); }
    }
    hero.mobileState = "ended";
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
      resetFilter();
      placeChapters(true);
      heroEnterMobile();
      prepareObserver = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) heroMobilePrepare(); });
      }, { rootMargin: "120% 0px" });
      playObserver = new IntersectionObserver((entries) => {
        entries.forEach((e) => (e.intersectionRatio >= 0.45 ? heroMobilePlay() : heroMobilePause()));
      }, { threshold: [0, 0.45, 1] });
      prepareObserver.observe(hero.film);
      playObserver.observe(hero.film);
      const openFolder = $(".folder[open]");
      if (openFolder) $$(".app-chapter", openFolder).forEach((s) => preloadShots(appMap.get(s.dataset.app), "mobile"));
    } else {
      placeChapters(false);
      heroEnterDesktop();
      chapters.forEach((s) => preloadShots(appMap.get(s.dataset.app), "desktop"));
    }
    chapters.forEach((s) => updateStep(s, userSteps.get(s.dataset.app) ?? 0));
    requestRender();
  }

  /* ------------------------------------------------------------------ */
  /* Scroll loop                                                          */
  /* ------------------------------------------------------------------ */
  let scheduled = false;
  let previousFrame = 0;
  function requestRender() {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(render);
    }
  }
  function render(now = performance.now()) {
    scheduled = false;
    const dt = Math.min(64, now - previousFrame || 16);
    previousFrame = now;
    const vh = innerHeight;
    let moving = false;
    let dark;

    if (mode === "mobile") {
      const r = hero.film.getBoundingClientRect();
      dark = r.bottom > 40 && r.top < 40;
    } else {
      const r = hero.el.getBoundingClientRect();
      const live = r.bottom > 0 && r.top < vh;
      if (live !== hero.live) {
        hero.live = live;
        hero.el.classList.toggle("film-live", live);
      }
      dark = live && r.top < 90 && r.bottom > 90;
      if (r.bottom > -vh * 0.5) {
        const target = clamp(-r.top / Math.max(1, r.height - vh));
        if (hero.smoothP === null) hero.smoothP = target;
        if (!motionPaused) {
          hero.smoothP += (target - hero.smoothP) * (1 - Math.exp(-dt / 110));
          if (Math.abs(target - hero.smoothP) > 0.0004) moving = true;
          else hero.smoothP = target;
        } else hero.smoothP = target;
        heroRender(hero.smoothP);
      }
      // side rail: the last section whose top has passed the middle of the screen
      let active = "top";
      for (const s of chapters) {
        if (s.hidden) continue;
        if (s.getBoundingClientRect().top < vh * 0.5) active = s.id;
      }
      $$("a", rail).forEach((a) => {
        const is = a.hash === "#" + active;
        a.classList.toggle("active", is);
        if (is) a.setAttribute("aria-current", "location");
        else a.removeAttribute("aria-current");
      });
    }
    header.classList.toggle("on-light", !dark);
    rail.classList.toggle("on-light", !dark);
    if (moving) requestRender();
  }

  addEventListener("scroll", requestRender, { passive: true });
  let resizeTimer = 0;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { heroLayout(); requestRender(); }, 60);
    requestRender();
  });
  small.addEventListener("change", applyMode);
  addEventListener("load", () => { heroLayout(); requestRender(); });

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
