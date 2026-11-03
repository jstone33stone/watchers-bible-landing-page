/* Watchers Bible landing · motion director
   One rAF loop for scroll work, IntersectionObserver for entrances,
   every effect guarded by prefers-reduced-motion. */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;
  var skipCover = root.classList.contains("skip-cover");
  var isBot = navigator.webdriver === true; /* automation gets content, not ceremony */

  /* ── 1. book cover intro / e-ink flash ─────────────────────────── */
  var cover = document.querySelector(".cover");
  var flash = document.querySelector(".eink-flash");
  if (!reduced && !isBot) {
    if (skipCover) {
      flash.classList.add("run");
    } else if (cover) {
      setTimeout(function () { cover.classList.add("open"); }, 420);
      setTimeout(function () {
        cover.classList.add("done");
        try { sessionStorage.wbSeen = "1"; } catch (e) {}
      }, 1350);
    }
  } else if (cover) {
    cover.classList.add("done");
  }

  /* ── 2. ink-soak headings: wrap words in staggered spans ───────── */
  document.querySelectorAll(".ink-soak").forEach(function (h, hi) {
    var words = h.textContent.trim().split(/\s+/);
    h.textContent = "";
    words.forEach(function (w, i) {
      var s = document.createElement("span");
      s.textContent = w;
      s.style.setProperty("--wd", (i * 0.07 + hi * 0.02).toFixed(2) + "s");
      h.appendChild(s);
      if (i < words.length - 1) h.appendChild(document.createTextNode(" "));
    });
  });

  /* ── 3. reveal-on-enter, choreographed per section ─────────────── */
  var toReveal = [
    ".compare", ".stat-row", ".adslot-stage", ".stamp",
    ".feature-grid", ".teaser-grid", ".shelf-stage", ".spread",
    ".badge-row-center", ".platform-chips", ".footnote",
    ".chapter-label", ".lede:not([data-fill])"
  ];
  /* containers whose children are choreographed in CSS: they take .in, never .rv */
  var CHOREO = ".compare, .adslot-stage, .feature-grid, .teaser-grid, .badge-row-center, .platform-chips";
  var REVEAL_SELECTOR = ".ink-soak, .rv, .stat, .stamp, .shelf-stage, .spread, .cmp-paper, .h2-flourish, " + CHOREO + ", .chapter-label, .lede:not([data-fill])";
  var revealEls = document.querySelectorAll(toReveal.join(","));
  revealEls.forEach(function (el) {
    if (el.matches(CHOREO)) return;
    if (!el.classList.contains("rv") && !el.classList.contains("stat") &&
        !el.classList.contains("stamp") && !el.classList.contains("shelf-stage") &&
        !el.classList.contains("spread") && !el.classList.contains("stamp")) {
      el.classList.add("rv");
    }
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      el.classList.add("in");
      if (el.classList.contains("spread")) el.classList.add("open"); /* pop-up book */
      io.unobserve(el);
    });
  }, { threshold: 0.3, rootMargin: "0px 0px -8% 0px" });

  document.querySelectorAll(REVEAL_SELECTOR).forEach(function (el) { io.observe(el); });

  /* safety sweep: on machines where IntersectionObserver delivery is
     slow (backgrounded panes, low-power modes), reveal anything in
     view ourselves; runs on beats, on load, and throttled while scrolling */
  var pendingReveals = Array.prototype.slice.call(
    document.querySelectorAll(REVEAL_SELECTOR)
  );
  function sweepReveals() {
    if (!pendingReveals.length) return;
    var vh = window.innerHeight;
    pendingReveals = pendingReveals.filter(function (el) {
      if (el.classList.contains("in")) return false;
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.96 && r.bottom > 0) {
        el.classList.add("in");
        if (el.classList.contains("spread")) el.classList.add("open");
        return false;
      }
      return true;
    });
  }
  [800, 2000, 4000].forEach(function (t) { setTimeout(sweepReveals, t); });
  window.addEventListener("load", sweepReveals);

  /* ── 2c. hero phone: real screenshots flipping like e-ink pages ── */
  var heroPhone = document.querySelector(".phone-hero");
  var heroShots = Array.prototype.slice.call(document.querySelectorAll("#heroShots .shot-img"));
  var heroDots = Array.prototype.slice.call(document.querySelectorAll(".dots .dot"));
  var heroCaption = document.getElementById("heroCaption");
  var HERO_CAPTIONS = [
    "Home · the verse of the day",
    "Bible · Genesis 1, in your ink",
    "Library · highlights and notes",
    "Settings · the Paper theme"
  ];
  var heroIdx = 0, heroTimer = null;
  function heroGo(i, user) {
    i = (i + heroShots.length) % heroShots.length;
    if (i === heroIdx) { if (user) heroRestart(); return; }
    if (heroPhone && !reduced) {
      heroPhone.classList.remove("wiping");
      void heroPhone.offsetWidth; /* restart the wipe */
      heroPhone.classList.add("wiping");
    }
    setTimeout(function () {
      heroShots[heroIdx].classList.remove("is-on");
      heroShots[heroIdx].setAttribute("aria-hidden", "true");
      if (heroDots[heroIdx]) heroDots[heroIdx].classList.remove("is-on");
      heroIdx = i;
      heroShots[heroIdx].classList.add("is-on");
      heroShots[heroIdx].removeAttribute("aria-hidden");
      if (heroDots[heroIdx]) heroDots[heroIdx].classList.add("is-on");
      if (heroCaption) heroCaption.textContent = HERO_CAPTIONS[heroIdx];
    }, reduced ? 0 : 170);
    if (user) heroRestart();
  }
  function heroRestart() {
    if (heroTimer) { clearInterval(heroTimer); heroTimer = null; }
    if (!reduced) heroTimer = setInterval(function () { heroGo(heroIdx + 1); }, 4200);
  }
  if (heroShots.length) {
    heroDots.forEach(function (d, i) {
      d.addEventListener("click", function () { heroGo(i, true); });
    });
    if (heroPhone) {
      heroPhone.addEventListener("click", function () { heroGo(heroIdx + 1, true); });
      heroPhone.addEventListener("mouseenter", function () {
        if (heroTimer) { clearInterval(heroTimer); heroTimer = null; }
      });
      heroPhone.addEventListener("mouseleave", heroRestart);
    }
    heroRestart();
  }

  /* ── 3b. quill flourish under every chapter heading + ghost numerals ── */
  var SVG_NS = "http://www.w3.org/2000/svg";
  var ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
  document.querySelectorAll(".chapter").forEach(function (ch, i) {
    var h2 = ch.querySelector("h2");
    if (h2) {
      var svg = document.createElementNS(SVG_NS, "svg");
      svg.setAttribute("class", "h2-flourish");
      svg.setAttribute("viewBox", "0 0 150 18");
      svg.setAttribute("aria-hidden", "true");
      var p = document.createElementNS(SVG_NS, "path");
      p.setAttribute("pathLength", "1");
      p.setAttribute("d", "M4,12 C30,4 44,16 75,9 C106,3 118,14 146,8");
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", "#4b4e47");
      p.setAttribute("stroke-width", "1.4");
      p.setAttribute("stroke-linecap", "round");
      svg.appendChild(p);
      h2.insertAdjacentElement("afterend", svg);
      if (typeof io !== "undefined") io.observe(svg);
    }
    var num = document.createElement("span");
    num.className = "ghost-numeral";
    num.textContent = ROMAN[i] || "";
    num.setAttribute("aria-hidden", "true");
    ch.insertBefore(num, ch.firstChild);
  });

  /* ── 4. pop-up spread theme chips + paper flutter burst ────────── */
  var mini = document.getElementById("miniPhone");

  /* ── 3c. stagger indices for choreographed children ────────────── */
  document.querySelectorAll(".feature-grid").forEach(function (g) {
    g.querySelectorAll(".feature").forEach(function (f, i) { f.style.setProperty("--i", i); });
  });
  document.querySelectorAll(".badge-row-center, .platform-chips").forEach(function (row) {
    Array.prototype.forEach.call(row.children, function (c, i) { c.style.setProperty("--i", i); });
  });
  document.querySelectorAll(".theme-chips").forEach(function (row) {
    row.querySelectorAll(".tchip").forEach(function (c, i) { c.style.setProperty("--i", i); });
  });

  /* ── 3d. the paper-comfort statement: split into words so the
     scroll can ink them in (skipped for reduced motion) ──────────── */
  var fillEl = document.querySelector(".lede[data-fill]");
  var fillWords = [];
  var fillCount = 0;
  if (fillEl && !reduced) {
    var fWords = fillEl.textContent.trim().split(/\s+/);
    fillEl.textContent = "";
    fWords.forEach(function (w, i) {
      var s = document.createElement("span");
      s.textContent = w;
      fillEl.appendChild(s);
      if (i < fWords.length - 1) fillEl.appendChild(document.createTextNode(" "));
      fillWords.push(s);
    });
  }
  function spawnFlutter(host) {
    if (reduced || !host) return;
    var r = host.getBoundingClientRect();
    var pr = host.parentElement.getBoundingClientRect();
    var cx = r.left - pr.left + r.width / 2;
    var cy = r.top - pr.top + r.height / 2;
    for (var i = 0; i < 7; i++) {
      var s = document.createElement("span");
      s.className = "flutter go";
      s.style.left = cx + "px";
      s.style.top = cy + "px";
      var a = (Math.PI * 2 * i) / 7 + Math.random() * 0.6;
      var dist = 30 + Math.random() * 44;
      s.style.setProperty("--fx", (Math.cos(a) * dist).toFixed(0) + "px");
      s.style.setProperty("--fy", (Math.sin(a) * dist - 22).toFixed(0) + "px");
      s.style.setProperty("--fr", (Math.random() * 300 - 150).toFixed(0) + "deg");
      s.style.animationDelay = (i * 0.035).toFixed(2) + "s";
      host.parentElement.appendChild(s);
      (function (n) { setTimeout(function () { n.remove(); }, 1050); })(s);
    }
  }
  document.querySelectorAll(".tchip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      document.querySelectorAll(".tchip").forEach(function (c) {
        c.classList.remove("is-on");
        c.setAttribute("aria-selected", "false");
      });
      chip.classList.add("is-on");
      chip.setAttribute("aria-selected", "true");
      if (mini) mini.setAttribute("data-t", chip.getAttribute("data-t"));
      spawnFlutter(mini);
    });
  });

  /* ── 5. one rAF loop: ribbon progress, folio, diorama parallax,
        ghost-numeral drift, scroll-inked statement ─────────────────── */
  var ribbon = document.getElementById("ribbonFill");
  var folioNum = document.getElementById("folioNum");
  var depthEls = Array.prototype.slice.call(document.querySelectorAll("[data-depth]"));
  var hero = document.getElementById("hero");
  var chaps = Array.prototype.slice.call(document.querySelectorAll(".chapter"));
  var numerals = Array.prototype.slice.call(document.querySelectorAll(".ghost-numeral"));
  var ticking = false;

  var scrollBeats = 0;
  function onScrollFrame() {
    ticking = false;
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var frac = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    if (ribbon) {
      ribbon.style.height = (frac * 100).toFixed(2) + "%";
    }
    if (folioNum) {
      folioNum.textContent = String(Math.min(24, Math.max(1, Math.round(frac * 23) + 1)));
    }
    if (!reduced && hero) {
      var y = window.scrollY;
      if (y < window.innerHeight * 1.4) {
        depthEls.forEach(function (el) {
          var d = parseFloat(el.getAttribute("data-depth")) || 0;
          el.style.transform = "translate3d(0," + (y * d * -1).toFixed(1) + "px,0)";
        });
      }
    }
    if (!reduced) {
      var vh = window.innerHeight;
      /* batched reads first, then writes — no layout thrash */
      var rects = [];
      for (var ci = 0; ci < chaps.length; ci++) rects.push(chaps[ci].getBoundingClientRect());
      var fillRect = fillWords.length ? fillEl.getBoundingClientRect() : null;
      for (ci = 0; ci < chaps.length; ci++) {
        var cr = rects[ci];
        if (cr.bottom < -120 || cr.top > vh + 120) continue;
        var cp = Math.min(1, Math.max(0, (vh - cr.top) / (vh + cr.height)));
        numerals[ci].style.setProperty("--drift", ((0.5 - cp) * 110).toFixed(1) + "px");
      }
      if (fillWords.length) {
        var fp = Math.min(1, Math.max(0, (vh * 0.94 - fillRect.top) / (vh * 0.5)));
        var target = Math.round(fp * fillWords.length);
        if (target !== fillCount) {
          var lo = Math.min(target, fillCount), hi = Math.max(target, fillCount);
          for (var wi = lo; wi < hi; wi++) fillWords[wi].classList.toggle("is-inked", wi < target);
          fillCount = target;
        }
      }
    }
    if ((scrollBeats = (scrollBeats + 1) % 45) === 0) sweepReveals();
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScrollFrame); }
  }, { passive: true });
  onScrollFrame();

  /* gentle mouse parallax on the hero sky + phone tilt (desktop only) */
  if (!reduced && window.matchMedia("(pointer: fine)").matches && hero) {
    var tiltPhone = document.querySelector(".phone-hero");
    hero.addEventListener("mousemove", function (e) {
      var nx = e.clientX / window.innerWidth - 0.5;
      var ny = e.clientY / window.innerHeight - 0.5;
      var sun = document.querySelector(".sun");
      if (sun) sun.style.marginLeft = (nx * 20).toFixed(1) + "px";
      if (tiltPhone) {
        tiltPhone.style.transform = "rotate(2deg) rotateY(" + (nx * 7).toFixed(2) + "deg) rotateX(" + (-ny * 5).toFixed(2) + "deg)";
      }
    }, { passive: true });
    hero.addEventListener("mouseleave", function () {
      if (tiltPhone) tiltPhone.style.transform = "rotate(2deg)";
    });
  }

  /* ── 6. origami dove flock flybys ──────────────────────────────── */
  var doves = Array.prototype.slice.call(document.querySelectorAll(".dove-flyby"));
  if (doves.length && !reduced) {
    var flyAll = function () {
      doves.forEach(function (d) {
        d.classList.remove("fly");
        void d.offsetWidth; /* restart animation */
        d.classList.add("fly");
      });
    };
    setTimeout(flyAll, skipCover ? 1400 : 1900);
    setInterval(flyAll, 52000);
  }

  /* ── 8. ink blot easter egg ────────────────────────────────────── */
  if (!reduced) {
    document.addEventListener("click", function (e) {
      if (e.target.closest("a, button, .phone, .mini-phone, .shots-strip, .shelf, .tchip, .feature, .teaser, .compare, .topbar")) return;
      var b = document.createElement("span");
      b.className = "blot";
      b.style.left = e.clientX + "px";
      b.style.top = e.clientY + "px";
      b.setAttribute("aria-hidden", "true");
      document.body.appendChild(b);
      setTimeout(function () { b.remove(); }, 750);
    });
  }
})();
