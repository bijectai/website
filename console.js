/* ============================================================
   biject — instrument console (live telemetry)
   ============================================================ */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- tab switching ---------- */
  var tabs = [].slice.call(document.querySelectorAll(".ctab"));
  var panels = [].slice.call(document.querySelectorAll(".cpanel"));
  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      tabs.forEach(function (x) { x.classList.remove("active"); });
      panels.forEach(function (p) { p.classList.remove("active"); });
      t.classList.add("active");
      var panel = document.querySelector('.cpanel[data-panel="' + t.dataset.panel + '"]');
      if (panel) panel.classList.add("active");
    });
  });

  /* ---------- data pools ---------- */
  var SYMS = ["AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "JPM", "XOM", "TSLA", "GME", "AMD", "BAC", "WMT", "KO", "PFE"];
  var CALLERS = ["exec-fleet-7", "alpha-desk-2", "rebal-bot-1", "mm-strategy-4", "ops-runbook", "retail-router", "tactical-9", "hedge-agent-3"];
  var REFUTALS = [
    { spec: "reg-sho", reason: "short in restricted security" },
    { spec: "concentration-limit", reason: "post-trade weight > 10% NAV cap" },
    { spec: "finra-2111", reason: "unsuitable for account profile" },
    { spec: "position-limit", reason: "exceeds desk position limit" },
    { spec: "finra-5210", reason: "pattern matches marking-the-close" },
    { spec: "restricted-list", reason: "symbol on firm restricted list" },
  ];
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function clockNow() { var d = new Date(); return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()); }
  function hex(n) { var s = ""; for (var i = 0; i < n; i++) s += "0123456789abcdef"[Math.floor(Math.random() * 16)]; return s; }

  /* ---------- running totals ---------- */
  var verified = 24891, proved = 24716, refuted = 175;
  var latWindow = [];
  for (var i = 0; i < 60; i++) latWindow.push(3 + Math.random() * 5);

  /* ---------- stat rail ---------- */
  var statRail = document.getElementById("statRail");
  var railDef = [
    { id: "verified", label: "Verified · today", cls: "", sub: "actions" },
    { id: "proved", label: "Proved", cls: "green", sub: "↦ executed" },
    { id: "refuted", label: "Refuted", cls: "amber", sub: "⊥ blocked" },
    { id: "median", label: "Median latency", cls: "green", sub: "p50" },
    { id: "specs", label: "Active axioms", cls: "", sub: ".olean" },
  ];
  var railVals = {};
  railDef.forEach(function (r) {
    var d = document.createElement("div");
    d.className = "stat-readout";
    d.innerHTML = '<div class="sr-label">' + r.label + '</div><div class="sr-val ' + r.cls + '" id="sr-' + r.id + '">—</div><div class="sr-sub">' + r.sub + "</div>";
    statRail.appendChild(d);
    railVals[r.id] = d.querySelector(".sr-val");
  });
  function fmt(n) { return n.toLocaleString("en-US"); }
  function median(arr) { var s = arr.slice().sort(function (a, b) { return a - b; }); return s[Math.floor(s.length / 2)]; }
  function renderRail() {
    railVals.verified.textContent = fmt(verified);
    railVals.proved.textContent = fmt(proved);
    railVals.refuted.textContent = fmt(refuted);
    railVals.median.textContent = median(latWindow).toFixed(1) + " µs";
    railVals.specs.textContent = "6";
  }

  /* ---------- proof feed ---------- */
  var feedRows = document.getElementById("feedRows");
  var feedMeta = document.getElementById("feedMeta");
  var MAXFEED = 11;
  function feedRowEl(ev) {
    var row = document.createElement("div");
    row.className = "feed-row feed-new";
    var sideTxt = ev.side === "sell_short" ? "short" : ev.side;
    var vClass = ev.proved ? "proved" : "refuted";
    var vTxt = ev.proved ? "⊢ PROVED" : "✗ REFUTED";
    row.innerHTML =
      '<span class="fc-time">' + ev.time + "</span>" +
      '<span class="fc-action"><b>' + sideTxt + " " + fmt(ev.qty) + "</b> " + ev.sym + "</span>" +
      '<span class="fc-caller">' + ev.caller + "</span>" +
      '<span><span class="feed-v ' + vClass + '">' + vTxt + "</span></span>" +
      '<span class="fc-lat">' + ev.lat.toFixed(1) + "µs</span>";
    return row;
  }

  /* ---------- audit ---------- */
  var auditRows = document.getElementById("auditRows");
  var MAXAUDIT = 9;
  function auditRowEl(ev) {
    var row = document.createElement("div");
    row.className = "audit-r feed-new";
    row.innerHTML =
      '<span class="au-id">aud_' + hex(6).toUpperCase() + "</span>" +
      '<span class="au-action">example : maxTradeValue ' + ev.qty + " " + ev.price + " 1000 = true</span>" +
      '<span class="au-time">' + ev.time + "</span>" +
      '<span class="au-check">⊢ proved</span>';
    return row;
  }

  /* ---------- latency sparkline ---------- */
  var sparkBars = document.getElementById("sparkBars");
  var latStats = document.getElementById("latStats");
  var NBARS = 46;
  var bars = [];
  function buildSpark() {
    sparkBars.innerHTML = "";
    bars = [];
    for (var i = 0; i < NBARS; i++) {
      var b = document.createElement("div");
      b.className = "bar";
      var v = latWindow[i % latWindow.length] || 4;
      setBar(b, v);
      sparkBars.appendChild(b);
      bars.push(b);
    }
  }
  function setBar(b, v) {
    var h = Math.min(100, (v / 12) * 100);
    b.style.height = h + "%";
    b.classList.toggle("over", v > 10);
  }
  function pushBar(v) {
    if (!bars.length) return;
    var b = bars.shift();
    sparkBars.appendChild(b);
    setBar(b, v);
    bars.push(b);
  }
  function renderLatStats() {
    var s = latWindow.slice().sort(function (a, b) { return a - b; });
    var p50 = s[Math.floor(s.length * 0.5)];
    var p99 = s[Math.floor(s.length * 0.99)] || s[s.length - 1];
    var mx = s[s.length - 1];
    latStats.innerHTML =
      statBox("p50", p50.toFixed(1) + " µs", "green") +
      statBox("p99", p99.toFixed(1) + " µs", "") +
      statBox("max", mx.toFixed(1) + " µs", "") +
      statBox("SLA breaches", s.filter(function (x) { return x > 10; }).length + "", "");
  }
  function statBox(l, v, cls) {
    return '<div class="lat-stat"><div class="ls-label">' + l + '</div><div class="ls-val ' + cls + '">' + v + "</div></div>";
  }

  /* ---------- spec registry (static) ---------- */
  var specs = [
    { name: "CAP-001", note: "trade value ≤ 10% daily capital · 15c3-5", ver: ".olean", owner: "Risk" },
    { name: "POS-002", note: "per-symbol position limit", ver: ".olean", owner: "Risk" },
    { name: "CRYPTO-003", note: "max crypto allocation ≤ 15% NAV", ver: ".olean", owner: "Portfolio" },
    { name: "CONC-004", note: "single-name concentration ≤ 10% NAV", ver: ".olean", owner: "Portfolio" },
    { name: "SHORT-005", note: "Reg SHO restricted-list check", ver: ".olean", owner: "Compliance" },
    { name: "SUIT-006", note: "FINRA 2111 suitability", ver: ".olean", owner: "Compliance" },
  ];
  var specRows = document.getElementById("specRows");
  specs.forEach(function (s) {
    var r = document.createElement("div");
    r.className = "spec-r";
    r.innerHTML =
      '<span class="sp-name">' + s.name + "<small>" + s.note + "</small></span>" +
      '<span class="sp-ver">' + s.ver + "</span>" +
      '<span class="sp-owner">' + s.owner + "</span>" +
      '<span class="sp-status">● enforced</span>';
    specRows.appendChild(r);
  });

  /* ---------- export toast ---------- */
  var exportBtn = document.getElementById("exportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      var orig = exportBtn.textContent;
      exportBtn.textContent = "↧ proof bundle queued";
      setTimeout(function () { exportBtn.textContent = orig; }, 1800);
    });
  }

  /* ---------- event generator ---------- */
  function makeEvent() {
    var isRef = Math.random() < 0.18;
    var sym = pick(SYMS);
    var side = isRef && Math.random() < 0.4 ? "sell_short" : pick(["buy", "sell"]);
    var qty = (Math.floor(Math.random() * 48) + 2) * 500;
    var price = Math.floor((20 + Math.random() * 480) * 100);
    var slaBreach = Math.random() < 0.03;
    var lat = slaBreach ? 10.2 + Math.random() * 3.5 : 2.1 + Math.random() * 6.6;
    return {
      time: clockNow(), sym: sym, side: side, qty: qty, price: price,
      caller: pick(CALLERS), proved: !isRef, lat: lat,
      ref: isRef ? pick(REFUTALS) : null,
    };
  }

  function ingest(ev) {
    verified++;
    if (ev.proved) proved++; else refuted++;
    latWindow.push(ev.lat); if (latWindow.length > 200) latWindow.shift();

    // feed
    feedRows.insertBefore(feedRowEl(ev), feedRows.firstChild);
    while (feedRows.children.length > MAXFEED) feedRows.removeChild(feedRows.lastChild);
    feedMeta.textContent = "streaming · " + fmt(verified) + " actions";

    // audit (only proved get a proof bundle id)
    if (ev.proved) {
      auditRows.insertBefore(auditRowEl(ev), auditRows.firstChild);
      while (auditRows.children.length > MAXAUDIT) auditRows.removeChild(auditRows.lastChild);
    }

    // latency
    pushBar(ev.lat);
    renderLatStats();
    renderRail();
  }

  /* ---------- prefill ---------- */
  function prefill() {
    for (var k = 0; k < MAXFEED; k++) {
      var ev = makeEvent();
      feedRows.appendChild(feedRowEl(ev));
      feedRows.lastChild.classList.remove("feed-new");
    }
    for (var a = 0; a < MAXAUDIT; a++) {
      var e2 = makeEvent(); e2.proved = true;
      auditRows.appendChild(auditRowEl(e2));
      auditRows.lastChild.classList.remove("feed-new");
    }
    feedMeta.textContent = "streaming · " + fmt(verified) + " actions";
    buildSpark();
    renderLatStats();
    renderRail();
  }
  prefill();

  /* ---------- live loop ---------- */
  function tick() {
    ingest(makeEvent());
    var next = 1100 + Math.random() * 1300;
    setTimeout(tick, next);
  }
  if (!reduced) setTimeout(tick, 1400);
})();
