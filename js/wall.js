/* Watchers Bible landing · the supporter wall (Chapter Eight)
   Reads the same public endpoint the app reads ·
   watchersbible.vercel.app/api/donations, the Airtable ledger's approved
   rows · so the page and the app always show one wall. No credential ever
   reaches this page: the token lives server-side only.

   The wall is drawn as a ledger spread bound into the book: a left page
   ("Recently approved", newest first by the ledger's approval stamp, each
   entry marked with an illuminated initial) and a right page ("Top givers",
   ranked by size as the server ranked it · a dollar weighed against a peso
   there, never printed here · each entry marked with its rank, the podium
   sealed in full ink). A sewn gutter folds between the pages. Ten rows
   per page inline; "See all" unfolds the whole spread at once, so the
   ledger never shows one page written and its opposite blank.

   Names and organizations are giver-submitted text, so every string is
   escaped before it touches innerHTML · the app renders through React's
   escaping, this page does it by hand. The card stays hidden until data
   lands: a failure (offline visit, endpoint hiccup, ledger not yet wired)
   simply leaves no wall, like the app hides the section when the backend
   says so. One fetch per page view, no polling.

   The write-in is the page's own choreography, run once when the spread
   first enters view: the count of checked names ticks up, the ledger rules
   draw themselves, entries write in left page then right page in reading
   order, the newest gift's initial pulses once (the lamp is still warm),
   and the registrar's stamp lands last. Every hidden state lives inside
   the keyframes (fill-mode both), so the resting markup is always the
   finished page · prefers-reduced-motion, a failed script or an automation
   visit simply skips straight to it, like the rest of the page. */
(function () {
  "use strict";

  var API = "https://watchersbible.vercel.app/api/donations";
  var INLINE_MAX = 10;
  /* write-in stagger, milliseconds: rows enter in reading order, left
     page then right page, capped so a long ledger never holds the stage */
  var STAGGER_BASE = 240;
  var STAGGER_STEP = 42;
  var STAGGER_CAP = 1150;

  var card = document.getElementById("giveWall");
  var lists = document.getElementById("wallLists");
  var countEl = document.getElementById("wallCountN");
  if (!card || !lists || !window.fetch) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isBot = navigator.webdriver === true;

  /* giver-submitted text: escape before it reaches innerHTML */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ₱5,000 / $120.50 · whole units stay whole, cents only when they exist
     (the same manner the app and the give form print in) */
  function fmtAmount(v, cur) {
    var digits = (v === Math.floor(v)) ? 0 : 2;
    try {
      return new Intl.NumberFormat(cur === "USD" ? "en-US" : "en-PH", {
        style: "currency", currency: cur, maximumFractionDigits: digits,
      }).format(v);
    } catch (e) {
      return cur + " " + v.toLocaleString();
    }
  }

  /* "Nov 12" within the current year, "Nov 12, 2025" otherwise */
  function fmtDate(s) {
    if (!s) return "";
    var d = new Date(s + "T00:00:00");
    if (isNaN(d.getTime())) return "";
    var sameYear = d.getFullYear() === new Date().getFullYear();
    try {
      var opts = { month: "short", day: "numeric" };
      if (!sameYear) opts.year = "numeric";
      return new Intl.DateTimeFormat("en-US", opts).format(d);
    } catch (e) {
      return s;
    }
  }

  /* Newest-first for "Recently approved": the approval stamp when the row
     carries one, else the gift date; rows with neither sink to the end. */
  function stampOf(g) { return g.createdAt || g.date || ""; }
  function recentFirst(givers) {
    return givers.slice().sort(function (a, b) {
      var ka = stampOf(a), kb = stampOf(b);
      if (ka === kb) return 0;
      if (!ka) return 1;
      if (!kb) return -1;
      return ka < kb ? 1 : -1;
    });
  }

  /* the giver's choice: the ledger may hold quiet gifts listed as
     Anonymous · they wear a lamp where a name's initial would sit */
  function isAnon(g) {
    return !g.name || /^anonymous$/i.test(String(g.name).trim());
  }
  function initialOf(g) {
    var c = String(g.name).trim().charAt(0);
    return c ? c.toUpperCase() : "\u00B7";
  }

  var LAMP =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M12,4.6 C14.5,8.4 15.6,10.6 12,13.8 C8.4,10.6 9.5,8.4 12,4.6 Z"/>' +
    '<path d="M8.2,16.8 C9.8,18.2 14.2,18.2 15.8,16.8"/></g></svg>';

  /* One entry's mark: the ranked list numbers its roundels (podium sealed
     in full ink), the recent list carries the name's illuminated initial ·
     the same gift reads differently depending on which page it sits on,
     as in the app. */
  function markHtml(g, ranked, rank, newest) {
    var cls = "wall-init";
    if (ranked && rank <= 3) cls += " is-podium";
    if (newest) cls += " is-newest";
    var inner;
    if (ranked) {
      inner = String(rank);
    } else if (isAnon(g)) {
      inner = LAMP;
    } else {
      inner = esc(initialOf(g));
    }
    return '<span class="' + cls + '" aria-hidden="true">' + inner + "</span>";
  }

  function rowHtml(g, ranked, rank, newest) {
    var anon = isAnon(g);
    var org = g.org ? '<span class="wall-org">' + esc(g.org) + "</span>" : "";
    return (
      '<li class="wall-row">' +
      markHtml(g, ranked, rank, newest) +
      '<span class="wall-who"><span class="wall-name' + (anon ? " is-anon" : "") + '">' +
      esc(anon ? "Anonymous" : g.name) + "</span>" + org + "</span>" +
      '<span class="wall-amt"><span class="a">' + esc(fmtAmount(g.amount, g.currency)) + "</span>" +
      '<span class="d">' + esc(fmtDate(g.date)) + "</span></span>" +
      "</li>"
    );
  }

  function delayFor(i) {
    return Math.min(STAGGER_BASE + i * STAGGER_STEP, STAGGER_CAP);
  }

  /* One page of the spread: ten rows inline, the rest behind a See-all
     button that only ever expands (the app's manner). baseIndex offsets
     the write-in stagger so the right page begins where the left ends. */
  function pageHtml(label, items, ranked, baseIndex) {
    var ol = "";
    var extras = 0;
    for (var i = 0; i < items.length; i++) {
      var newest = (!ranked && i === 0);
      var row = rowHtml(items[i], ranked, i + 1, newest);
      if (i >= INLINE_MAX) {
        extras += 1;
        row = row.replace("<li ", '<li data-extra="1" hidden ');
      } else {
        row = row.replace("<li ", '<li style="--wd:' + delayFor(baseIndex + i) + '" ');
      }
      ol += row;
    }
    var more = "";
    if (extras > 0) {
      more = '<button type="button" class="wall-more" data-for="' +
        esc(label) + '">See all ' + items.length + "</button>";
    }
    return (
      '<section class="wall-page">' +
      '<h4 class="wall-label">' + esc(label) + "</h4>" +
      '<ol class="wall-rows">' + ol + "</ol>" +
      more +
      "</section>"
    );
  }

  /* the sewn gutter that folds between the two pages */
  var GUTTER = '<div class="wall-binding" aria-hidden="true"><i></i><i></i><i></i></div>';

  /* ── the write-in, run once when the spread first enters view ────── */
  var revealed = false;
  function countUp(n) {
    if (!(n > 0)) return;
    var t0 = null;
    var DUR = 900;
    function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / DUR);
      var e = 1 - Math.pow(1 - p, 3); /* ease-out cubic */
      countEl.textContent = String(Math.max(1, Math.round(e * n)));
      if (p < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }
  function reveal() {
    if (revealed) return;
    revealed = true;
    card.classList.add("wall-in");
    if (countEl && !reduced && !isBot) countUp(parseInt(countEl.textContent, 10) || 0);
  }

  /* ── See all: the spread opens as one · both pages unfold together so
     the ledger never shows one page written and its opposite blank ──── */
  function expandAll() {
    var pages = card.querySelectorAll(".wall-page");
    for (var p = 0; p < pages.length; p++) {
      var hiddenRows = pages[p].querySelectorAll('[data-extra="1"]');
      for (var i = 0; i < hiddenRows.length; i++) {
        hiddenRows[i].removeAttribute("hidden");
        hiddenRows[i].style.setProperty("--wd", String(Math.min(60 + i * 42, 620)));
      }
    }
    var btns = card.querySelectorAll(".wall-more");
    for (var b = 0; b < btns.length; b++) {
      if (btns[b].parentNode) btns[b].parentNode.removeChild(btns[b]);
    }
  }

  function render(wall) {
    if (!wall || wall.configured !== true || !wall.givers || wall.givers.length === 0) {
      return; /* card stays hidden · no wall to show */
    }
    if (countEl) countEl.textContent = String(wall.givers.length);
    lists.innerHTML =
      pageHtml("Recently approved", recentFirst(wall.givers), false, 0) +
      GUTTER +
      pageHtml("Top givers", wall.givers, true, INLINE_MAX);
    card.removeAttribute("hidden");

    var btns = card.querySelectorAll(".wall-more");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () { expandAll(); });
    }

    /* the write-in waits for the spread to be seen; reduced motion,
       automation and old browsers simply find the ledger already written */
    if (revealed || reduced || isBot || !("IntersectionObserver" in window)) {
      reveal();
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) { io.disconnect(); reveal(); break; }
      }
    }, { threshold: 0.12 });
    io.observe(card);
  }

  fetch(API)
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(render)
    .catch(function () { /* card stays hidden */ });
})();
