(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- Theme ---------- */
  $("#themeToggle").addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("blarm-theme", next);
    if (lbs) lbs.draw();
  });

  /* ---------- Top bar ---------- */
  const topbar = $("#topbar");
  const onScroll = () => topbar.classList.toggle("scrolled", window.scrollY > 260);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const navLinks = $$(".nav-links a");
  const sections = navLinks.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach((s) => navObserver.observe(s));

  /* ---------- KaTeX ---------- */
  window.addEventListener("load", () => {
    if (window.renderMathInElement) {
      renderMathInElement(document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
        ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
        throwOnError: false,
      });
    }
  });

  /* ---------- Tabs ---------- */
  $$("[data-tabs]").forEach((group) => {
    const tabs = $$(".tab", group);
    tabs.forEach((tab) => tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle("active", on);
        t.setAttribute("aria-selected", on);
        const panel = document.getElementById(t.dataset.target);
        panel.classList.toggle("active", on);
        $$("video", panel).forEach((v) => (on ? playIfVisible(v) : v.pause()));
      });
    }));
  });

  /* ---------- Video playback only when visible ---------- */
  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting && v.offsetParent !== null) v.play().catch(() => {});
      else v.pause();
    });
  }, { threshold: 0.15 });
  function playIfVisible(v) {
    const r = v.getBoundingClientRect();
    if (r.bottom > 0 && r.top < window.innerHeight) v.play().catch(() => {});
  }
  $$(".hero-reel video, .lim-figure video, .same-object video").forEach((v) => videoObserver.observe(v));

  /* ---------- Skinning viewer: two examples at a time ---------- */
  function initSkinViewer(manifest) {
    const grid = $("#skinGrid");
    if (!grid) return;
    const PER_PAGE = 2;
    const state = { ds: "actionbench", page: 0 };
    const items = () => manifest[state.ds] || [];
    const pages = () => Math.ceil(items().length / PER_PAGE);

    function card(item) {
      const el = document.createElement("div");
      el.className = "skin-card";
      el.innerHTML =
        `<div class="skin-panels">` +
        `<video class="input" muted loop playsinline preload="auto" poster="static/videos/${item.slug}.jpg" src="static/videos/${item.slug}.mp4"></video>` +
        `<video muted loop playsinline preload="auto" poster="static/skinning/${item.slug}.jpg" src="static/skinning/${item.slug}.mp4"></video>` +
        `</div>` +
        `<div class="skin-meta"><span>Input video</span><span>Skinning weights</span></div>` +
        `<div class="skin-name">${item.label}</div>`;
      return el;
    }

    function render() {
      const list = items();
      const start = state.page * PER_PAGE;
      const shown = [];
      for (let i = 0; i < Math.min(PER_PAGE, list.length); i++) shown.push(list[(start + i) % list.length]);
      grid.innerHTML = "";
      grid.style.animation = "none"; void grid.offsetWidth; grid.style.animation = "";
      shown.forEach((item) => grid.appendChild(card(item)));
      const videos = $$("video", grid);
      Promise.all(videos.map((v) => new Promise((res) => {
        if (v.readyState >= 3) res(); else v.addEventListener("canplay", res, { once: true });
      }))).then(() => videos.forEach((v) => { v.currentTime = 0; playIfVisible(v); }));
      videos.forEach((v) => videoObserver.observe(v));
      $("#skinPage").textContent = `${state.page + 1} / ${pages()}`;
      const shownSlugs = new Set(shown.map((s) => s.slug));
      $$(".skin-chip").forEach((c) => c.classList.toggle("on", shownSlugs.has(c.dataset.slug)));
    }

    function renderChips() {
      const box = $("#skinChips");
      box.innerHTML = "";
      items().forEach((item, i) => {
        const b = document.createElement("button");
        b.className = "skin-chip";
        b.dataset.slug = item.slug;
        b.textContent = item.label;
        b.addEventListener("click", () => { state.page = Math.floor(i / PER_PAGE); render(); });
        box.appendChild(b);
      });
    }

    $$("#skinTabs .tab").forEach((tab) => tab.addEventListener("click", () => {
      $$("#skinTabs .tab").forEach((t) => {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-selected", t === tab);
      });
      state.ds = tab.dataset.ds;
      state.page = 0;
      renderChips();
      render();
    }));
    $("#skinPrev").addEventListener("click", () => { state.page = (state.page - 1 + pages()) % pages(); render(); });
    $("#skinNext").addEventListener("click", () => { state.page = (state.page + 1) % pages(); render(); });
    renderChips();
    render();
  }

  /* ---------- Results grid ---------- */
  fetch("static/videos/manifest.json")
    .then((r) => r.json())
    .then((manifest) => {
      initSkinViewer(manifest);
      $$(".video-grid").forEach((grid) => {
        const items = manifest[grid.dataset.dataset] || [];
        items.forEach((item) => {
          const card = document.createElement("div");
          card.className = "vcard";
          card.innerHTML =
            `<video muted loop playsinline preload="metadata" poster="static/videos/${item.slug}.jpg">` +
            `<source src="static/videos/${item.slug}.mp4" type="video/mp4"></video>` +
            `<div class="vcard-meta"><span>Ground truth</span><span>BLARM</span></div>` +
            `<div class="vcard-name">${item.label}<small>${item.frames} frames</small></div>`;
          card.addEventListener("click", () =>
            openLightbox("video", `static/videos/${item.slug}.mp4`,
              `${item.label} · left: ground truth (input video) · right: BLARM`));
          grid.appendChild(card);
          videoObserver.observe($("video", card));
        });
      });
    })
    .catch(() => {
      $$(".video-grid").forEach((g) => (g.innerHTML = '<p class="muted">Serve this folder over HTTP to load the result videos.</p>'));
    });

  /* ---------- Lightbox ---------- */
  const lightbox = $("#lightbox");
  const lbBody = $("#lightboxBody");
  const lbCaption = $("#lightboxCaption");
  function openLightbox(kind, src, caption) {
    lbBody.innerHTML = kind === "video"
      ? `<video src="${src}" autoplay muted loop playsinline controls></video>`
      : `<img src="${src}" alt="">`;
    lbCaption.textContent = caption || "";
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
  }
  function closeLightbox() {
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    lbBody.innerHTML = "";
  }
  lightbox.addEventListener("click", (e) => { if (e.target === lightbox || e.target.classList.contains("lightbox-close")) closeLightbox(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });
  $$("img[data-zoom]").forEach((img) => img.addEventListener("click", () => {
    const cap = img.closest("figure")?.querySelector("figcaption");
    openLightbox("img", img.src, cap ? cap.textContent.trim() : img.alt);
  }));

  /* ---------- Runtime bars (log scale) ---------- */
  const bars = $("#runtimeBars");
  if (bars) {
    const rows = $$(".bar-row", bars);
    const vals = rows.map((r) => parseFloat(r.dataset.value));
    const lo = Math.log10(1), hi = Math.log10(Math.max(...vals) * 1.15);
    new IntersectionObserver((entries, obs) => {
      if (!entries[0].isIntersecting) return;
      rows.forEach((r, i) => {
        $("i", r).style.width = (100 * (Math.log10(vals[i]) - lo) / (hi - lo)).toFixed(1) + "%";
      });
      obs.disconnect();
    }, { threshold: 0.4 }).observe(bars);
  }

  /* ---------- Copy BibTeX ---------- */
  $("#copyBib").addEventListener("click", (e) => {
    navigator.clipboard.writeText($("#bibText").textContent).then(() => {
      e.target.textContent = "Copied";
      setTimeout(() => (e.target.textContent = "Copy"), 1400);
    });
  });

  /* ---------- Linear blend skinning demo ---------- */
  const lbs = (function () {
    const canvas = $("#lbsCanvas");
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    const sharp = $("#lbsSharp"), sharpOut = $("#lbsSharpOut"), timeIn = $("#lbsTime"), playBtn = $("#lbsPlay");
    const NX = 64, NY = 7, L = 1.0, H = 0.17;
    let t = 0, playing = true, last = performance.now();

    const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const hexToRgb = (h) => {
      const m = h.replace("#", "");
      return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
    };

    function rigid(p, ang, tx, ty, px, py) {
      const c = Math.cos(ang), s = Math.sin(ang);
      const x = p[0] - px, y = p[1] - py;
      return [c * x - s * y + px + tx, s * x + c * y + py + ty];
    }

    function draw() {
      const W = canvas.width, Hc = canvas.height;
      const k = parseFloat(sharp.value);
      sharpOut.textContent = "k = " + k.toFixed(0);
      const colA = hexToRgb(css("--blue")), colB = hexToRgb(css("--ours"));
      ctx.clearRect(0, 0, W, Hc);

      const phase = 2 * Math.PI * t;
      const angA = 0.1 * Math.sin(phase + 0.6);
      const angB = 0.6 * Math.sin(phase);
      const rootY = 0.03 * Math.sin(2 * phase);

      const scale = W * 0.3, ox = W * 0.4, oy = Hc * 0.5;
      const toScreen = (p) => [ox + p[0] * scale, oy - p[1] * scale];

      const pts = [], wts = [];
      for (let j = 0; j < NY; j++) {
        for (let i = 0; i < NX; i++) {
          const x = -L + (2 * L * i) / (NX - 1);
          const y = -H + (2 * H * j) / (NY - 1);
          const w = 1 / (1 + Math.exp(-k * (x - 0.05)));
          const pa = rigid([x, y], angA, 0, 0, -L, 0);
          const pb = rigid(rigid([x, y], angB, 0, 0, 0.05, 0), angA, 0, 0, -L, 0);
          const blended = [(1 - w) * pa[0] + w * pb[0], (1 - w) * pa[1] + w * pb[1] + rootY];
          pts.push(blended);
          wts.push(w);
        }
      }

      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = css("--text-faint");
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.5;
      const r0 = toScreen([-L, H]), r1 = toScreen([L, -H]);
      ctx.strokeRect(r0[0], r0[1], r1[0] - r0[0], r1[1] - r0[1]);
      ctx.restore();

      for (let j = 0; j < NY - 1; j++) {
        for (let i = 0; i < NX - 1; i++) {
          const a = j * NX + i, b = a + 1, c = a + NX + 1, d = a + NX;
          const w = (wts[a] + wts[b] + wts[c] + wts[d]) / 4;
          const col = colA.map((v, q) => Math.round((1 - w) * v + w * colB[q]));
          ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
          ctx.beginPath();
          [a, b, c, d].forEach((idx, n) => {
            const s = toScreen(pts[idx]);
            n ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]);
          });
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      const pivot = toScreen(rigid([0.05, 0], angA, 0, rootY, -L, 0));
      ctx.fillStyle = css("--text");
      ctx.beginPath();
      ctx.arc(pivot[0], pivot[1], 4, 0, 2 * Math.PI);
      ctx.fill();

      const lx = W * 0.86, ly = Hc * 0.14, bw = 120, bh = 10;
      const grad = ctx.createLinearGradient(lx, 0, lx + bw, 0);
      grad.addColorStop(0, `rgb(${colA})`);
      grad.addColorStop(1, `rgb(${colB})`);
      ctx.fillStyle = grad;
      ctx.fillRect(lx - bw / 2, ly, bw, bh);
      ctx.fillStyle = css("--text-muted");
      ctx.font = "500 15px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("weight on component B", lx, ly - 10);
      ctx.textAlign = "left";
      ctx.fillText("A", lx - bw / 2, ly + bh + 20);
      ctx.textAlign = "right";
      ctx.fillText("B", lx + bw / 2, ly + bh + 20);
    }

    function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (playing) {
        t = (t + dt * 0.35) % 1;
        timeIn.value = Math.round(t * 1000);
      }
      draw();
      requestAnimationFrame(loop);
    }

    sharp.addEventListener("input", draw);
    timeIn.addEventListener("input", () => {
      t = timeIn.value / 1000;
      playing = false;
      playBtn.textContent = "Play";
      playBtn.setAttribute("aria-pressed", "false");
    });
    playBtn.addEventListener("click", () => {
      playing = !playing;
      playBtn.textContent = playing ? "Pause" : "Play";
      playBtn.setAttribute("aria-pressed", String(playing));
    });
    requestAnimationFrame(loop);
    return { draw };
  })();
})();
