/* Watchers Bible landing · the giving chapter (Chapter Ten)
   The listing request posts to the app's own backend
   (watchersbible.vercel.app/api/donations) — the exact endpoint the app's
   give sheet uses, same fields, same proof pair (receipt screenshot OR
   transaction reference), same honeypot. The server independently
   re-validates everything and rate-limits per IP; nothing publishes
   without the developer's hand-flip in the ledger.

   Written in the same ES5 idiom as main.js: one IIFE, no dependencies.
   Motion is finite and one-shot only, guarded by prefers-reduced-motion,
   like the rest of the page. */
(function () {
  "use strict";

  var API = "https://watchersbible.vercel.app/api/donations";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var section = document.getElementById("give");
  if (!section) return;

  var tileQuiet = document.getElementById("tileQuiet");
  var tileShow = document.getElementById("tileShow");
  var choiceRow = document.querySelector(".give-choice");
  var quietNote = document.getElementById("giveQuietNote");
  var form = document.getElementById("giveForm");
  var done = document.getElementById("giveDone");
  var nameIn = document.getElementById("gvName");
  var amountIn = document.getElementById("gvAmount");
  var sentOut = document.getElementById("gvSent");
  var refIn = document.getElementById("gvRef");
  var fileIn = document.getElementById("gvFile");
  var attachBtn = document.getElementById("gvAttach");
  var preview = document.getElementById("gvPreview");
  var thumb = document.getElementById("gvThumb");
  var meta = document.getElementById("gvMeta");
  var removeBtn = document.getElementById("gvRemove");
  var noteIn = document.getElementById("gvNote");
  var contactIn = document.getElementById("gvContact");
  var errorOut = document.getElementById("gvError");
  var submitBtn = document.getElementById("gvSubmit");

  var state = { show: false, currency: "PHP", receipt: null, busy: false };
  var thumbUrl = null;

  /* ── deep link: the app's Give button lands on ?give=1#give ──────────
     Anchor jumps are already smooth (CSS scroll-behavior) and the reveal
     sweeps in main.js catch sections in view — but a deep-linked visitor
     should see the offering settled and greeted, not mid-animation, so
     the section reveals immediately and the QR cards pulse once. */
  function revealGive() {
    Array.prototype.forEach.call(
      section.querySelectorAll(".rv, .stat, .chapter-label, .lede, .footnote, .h2-flourish"),
      function (el) { el.classList.add("in"); }
    );
    if (reduced) return;
    section.classList.remove("give-arrive");
    void section.offsetWidth; /* restart the one-shot on repeat visits */
    section.classList.add("give-arrive");
  }
  var params = new URLSearchParams(window.location.search);
  if (params.get("give") === "1" || window.location.hash === "#give" || window.location.hash === "#giveList") {
    revealGive();
    window.setTimeout(function () {
      section.scrollIntoView({ block: "start" });
    }, 80);
  }

  /* ── the quiet/listed choice ───────────────────────────────────────── */
  function pick(show) {
    if (state.show === show) return;
    state.show = show;
    tileQuiet.classList.toggle("is-on", !show);
    tileQuiet.setAttribute("aria-pressed", String(!show));
    tileShow.classList.toggle("is-on", show);
    tileShow.setAttribute("aria-pressed", String(show));
    quietNote.hidden = show;
    form.hidden = !show;
    if (show) {
      /* one glide, one pulse: the form announces itself where it stands */
      form.classList.remove("form-arrive");
      void form.offsetWidth;
      form.classList.add("form-arrive");
      window.setTimeout(function () {
        form.scrollIntoView({ block: "start" });
      }, 60);
    }
  }
  tileQuiet.addEventListener("click", function () { pick(false); });
  tileShow.addEventListener("click", function () { pick(true); });

  /* ── currency chips ────────────────────────────────────────────────── */
  var curBtns = Array.prototype.slice.call(form.querySelectorAll(".gf-cur button"));
  curBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      state.currency = b.getAttribute("data-cur");
      curBtns.forEach(function (o) {
        var on = o === b;
        o.classList.toggle("is-on", on);
        o.setAttribute("aria-pressed", String(on));
      });
      paintSent();
    });
  });

  /* ₱5,000 / $120.50 — whole units stay whole, cents only when they exist */
  function fmtAmount(v) {
    var digits = Number.isInteger(v) ? 0 : 2;
    try {
      return new Intl.NumberFormat(state.currency === "USD" ? "en-US" : "en-PH", {
        style: "currency", currency: state.currency, maximumFractionDigits: digits,
      }).format(v);
    } catch (e) {
      return state.currency + " " + v.toLocaleString();
    }
  }
  function paintSent() {
    var v = Number(amountIn.value);
    if (amountIn.value !== "" && Number.isFinite(v) && v >= 1) {
      sentOut.textContent = fmtAmount(v) + " sent";
      sentOut.hidden = false;
    } else {
      sentOut.hidden = true;
    }
    paintCanSubmit();
  }
  amountIn.addEventListener("input", paintSent);

  /* ── the receipt: compressed on a canvas like the app does ─────────── */
  function compressReceipt(file) {
    return new Promise(function (resolve, reject) {
      function draw(source, w, h) {
        try {
          var scale = Math.min(1, 1280 / Math.max(w, h));
          var cw = Math.max(1, Math.round(w * scale));
          var ch = Math.max(1, Math.round(h * scale));
          var canvas = document.createElement("canvas");
          canvas.width = cw;
          canvas.height = ch;
          canvas.getContext("2d").drawImage(source, 0, 0, cw, ch);
          canvas.toBlob(function (b) {
            if (b) resolve(b); else reject(new Error("compress failed"));
          }, "image/jpeg", 0.82);
        } catch (e) { reject(e); }
      }
      if (window.createImageBitmap) {
        createImageBitmap(file).then(function (bm) {
          draw(bm, bm.width, bm.height);
        }).catch(function () { legacy(); });
      } else {
        legacy();
      }
      function legacy() {
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () { draw(img, img.naturalWidth, img.naturalHeight); URL.revokeObjectURL(url); };
        img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("read failed")); };
        img.src = url;
      }
    });
  }
  function clearReceipt() {
    if (thumbUrl) { URL.revokeObjectURL(thumbUrl); thumbUrl = null; }
    state.receipt = null;
    preview.hidden = true;
    fileIn.value = "";
    paintCanSubmit();
  }
  attachBtn.addEventListener("click", function () { fileIn.click(); });
  removeBtn.addEventListener("click", clearReceipt);
  fileIn.addEventListener("change", function () {
    var f = fileIn.files && fileIn.files[0];
    if (!f) return;
    setError(null);
    compressReceipt(f).then(function (blob) {
      state.receipt = blob;
      if (thumbUrl) URL.revokeObjectURL(thumbUrl);
      thumbUrl = URL.createObjectURL(blob);
      thumb.src = thumbUrl;
      meta.textContent = " · " + Math.round(blob.size / 1024) + " KB, compressed";
      preview.hidden = false;
      paintCanSubmit();
    }).catch(function () {
      setError("Could not read that image");
    });
  });

  /* ── errors print above the submit button and scroll into view ────── */
  function setError(msg) {
    if (msg) {
      errorOut.textContent = msg;
      errorOut.hidden = false;
      errorOut.scrollIntoView({ block: "nearest" });
    } else {
      errorOut.hidden = true;
    }
  }

  /* ── submit gating mirrors the app: amount, name, and one proof ────── */
  function proofReady() {
    return state.receipt !== null || refIn.value.trim().length > 0;
  }
  function paintCanSubmit() {
    var v = Number(amountIn.value);
    var ok = amountIn.value !== "" && Number.isFinite(v) && v >= 1 &&
      nameIn.value.trim().length >= 2 && proofReady();
    submitBtn.disabled = !ok || state.busy;
  }
  nameIn.addEventListener("input", paintCanSubmit);
  refIn.addEventListener("input", paintCanSubmit);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (state.busy) return;
    setError(null);
    var v = Number(amountIn.value);
    if (!Number.isFinite(v) || v < 1) { setError("Please enter the gift amount"); return; }
    if (nameIn.value.trim().length < 2) { setError("Please enter the name to list"); return; }
    if (!proofReady()) { setError("Please attach a receipt screenshot or enter the reference number"); return; }

    state.busy = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending\u2026";

    finish(state.receipt ? state.receipt : null);
    function finish(blob) {
      var send = function (receiptData) {
        /* honeypot: a real user never reaches the hidden field */
        var honey = "";
        var h = form.querySelector(".gv-honey");
        if (h) honey = h.value;
        fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nameIn.value.trim(),
            amount: v,
            currency: state.currency,
            showName: true,
            reference: refIn.value.trim(),
            receiptData: receiptData,
            message: noteIn.value.trim().slice(0, 500),
            contact: contactIn.value.trim().slice(0, 120),
            honey: honey,
          }),
        }).then(function (r) {
          return r.json().catch(function () { return null; }).then(function (j) {
            return { status: r.status, json: j };
          });
        }).then(function (res) {
          if (res.status === 200 && res.json && res.json.ok) {
            thank();
          } else {
            fail((res.json && res.json.error) || "Could not submit right now. Please try again.");
          }
        }).catch(function () {
          fail("No connection. Try again when you are online.");
        });
      };
      if (!blob) { send(null); return; }
      var fr = new FileReader();
      fr.onload = function () { send(String(fr.result).split(",")[1] || null); };
      fr.onerror = function () { fail("The receipt image could not be read"); };
      fr.readAsDataURL(blob);
    }
    function fail(msg) {
      state.busy = false;
      submitBtn.textContent = "Submit for the supporter list";
      setError(msg);
      paintCanSubmit();
    }
  });

  function thank() {
    choiceRow.hidden = true;
    quietNote.hidden = true;
    form.hidden = true;
    done.hidden = false;
    clearReceipt();
    done.scrollIntoView({ block: "center" });
  }
})();
