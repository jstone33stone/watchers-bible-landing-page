/* Watchers Bible landing · the supporter wall (Chapter Eight)
   Reads the same public endpoint the app reads —
   watchersbible.vercel.app/api/donations, the Airtable ledger's approved
   rows — so the page and the app always show one wall. No credential ever
   reaches this page: the token lives server-side only.

   The two lists mirror the app's manners: "Recently approved" is newest
   first by the ledger's approval stamp, "Top givers" ranks by size as the
   server ranked it (a dollar weighed against a peso there, never printed
   here). Ten rows inline, "See all" reveals the rest of that list.

   Names and organizations are giver-submitted text, so every string is
   escaped before it touches innerHTML — the app renders through React's
   escaping, this page does it by hand. The card stays hidden until data
   lands: a failure (offline visit, endpoint hiccup, ledger not yet wired)
   simply leaves no wall, like the app hides the section when the backend
   says so. One fetch per page view, no polling, no motion — the rows are
   static, and the page's reveal choreography never touches this card. */
(function () {
  "use strict";

  var API = "https://watchersbible.vercel.app/api/donations";
  var INLINE_MAX = 10;

  var card = document.getElementById("giveWall");
  var lists = document.getElementById("wallLists");
  if (!card || !lists || !window.fetch) return;

  /* giver-submitted text: escape before it reaches innerHTML */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ₱5,000 / $120.50 — whole units stay whole, cents only when they exist
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

  /* One row: the ranked list numbers its marks (podium in full ink), the
     recent list marks rows with a dot — the same gift reads differently
     depending on which list it sits in, as in the app. */
  function rowHtml(g, ranked, rank) {
    var mark;
    if (ranked) {
      mark = '<span class="wall-mark' + (rank <= 3 ? " is-podium" : "") + '">' + rank + "</span>";
    } else {
      mark = '<span class="wall-mark is-dot"><span aria-hidden="true"></span></span>';
    }
    var org = g.org ? '<span class="wall-org">' + esc(g.org) + "</span>" : "";
    return (
      '<li class="wall-row">' +
      mark +
      '<span class="wall-who"><span class="wall-name">' + esc(g.name) + "</span>" + org + "</span>" +
      '<span class="wall-amt"><span class="a">' + esc(fmtAmount(g.amount, g.currency)) + "</span>" +
      '<span class="d">' + esc(fmtDate(g.date)) + "</span></span>" +
      "</li>"
    );
  }

  /* One labeled list, ten rows inline, the rest behind a See-all button
     that only ever expands (the app's manner). */
  function listHtml(label, items, ranked) {
    var ol = "";
    var extras = 0;
    for (var i = 0; i < items.length; i++) {
      var row = rowHtml(items[i], ranked, i + 1);
      if (i >= INLINE_MAX) {
        extras += 1;
        row = row.replace("<li ", '<li data-extra="1" style="display:none" ');
      }
      ol += row;
    }
    var more = "";
    if (extras > 0) {
      more = '<button type="button" class="wall-more" data-for="' +
        esc(label) + '">See all ' + items.length + "</button>";
    }
    return (
      '<p class="wall-label">' + esc(label) + "</p>" +
      '<ol class="wall-rows" aria-label="' + esc(label) + '">' + ol + "</ol>" +
      more
    );
  }

  function expand(btn) {
    var label = btn.getAttribute("data-for");
    var scope = btn.parentNode;
    var hidden_rows = scope.querySelectorAll('[data-extra="1"]');
    for (var i = 0; i < hidden_rows.length; i++) hidden_rows[i].removeAttribute("style");
    btn.parentNode.removeChild(btn);
  }

  function render(wall) {
    if (!wall || wall.configured !== true || !wall.givers || wall.givers.length === 0) {
      return; /* card stays hidden — no wall to show */
    }
    lists.innerHTML =
      listHtml("Recently approved", recentFirst(wall.givers), false) +
      listHtml("Top givers", wall.givers, true);
    card.removeAttribute("hidden");
    var btns = card.querySelectorAll(".wall-more");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function (e) { expand(e.currentTarget); });
    }
  }

  fetch(API)
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(render)
    .catch(function () { /* card stays hidden */ });
})();
