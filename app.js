/* ============================================================
   biject — landing interactions
   ============================================================ */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- token helpers ---------- */
  function tok(t, c) { return { t: t, c: c || null }; }
  var BR = { br: true };

  function renderTokens(container, tokens) {
    container.innerHTML = "";
    var line = document.createElement("div");
    line.className = "term-line";
    container.appendChild(line);
    tokens.forEach(function (tk) {
      if (tk.br) {
        line = document.createElement("div");
        line.className = "term-line";
        container.appendChild(line);
        return;
      }
      var s = document.createElement("span");
      if (tk.c) s.className = tk.c;
      s.textContent = tk.t;
      line.appendChild(s);
    });
    return container;
  }

  /* ============================================================
     HERO VARIANTS
     ============================================================ */
  var ctas =
    '<div class="hero-ctas">' +
    '<a href="#pilot" class="btn btn-primary">Request pilot access</a>' +
    '<a href="#research" class="btn btn-ghost">Read the research paper →</a>' +
    "</div>";

  var heroBody = "";

  var variants = [
    // A — canonical
    '<span class="kicker">↦ Formal verification for agentic AI</span>' +
      '<h1 style="margin-top:20px;">Your AI agents,<br /><span class="line2">mathematically compliant.</span></h1>' +
      '<p class="subline">While other guardrails <b>estimate</b> compliance at 98%, biject <b>proves</b> it — or the action never executes.</p>' +
      heroBody + ctas,
    // B — proof-gate forward
    '<span class="kicker">↦ Proof-gated execution</span>' +
      '<h1 style="margin-top:20px;">Proved,<br /><span class="line2">or it never runs.</span></h1>' +
      '<p class="subline">A Lean 4 proof gate inline between your agent and the market. Every action is type-checked against compiled policy axioms in microseconds. <b>No proof, no order.</b></p>' +
      ctas,
    // C — stakes forward
    '<span class="kicker">↦ For agentic trading systems</span>' +
      '<h1 style="margin-top:20px;font-size:clamp(34px,5.2vw,68px);">The one time in sixty<br /><span class="line2">your guardrail is wrong.</span></h1>' +
      '<p class="subline">Probabilistic guardrails score compliance. biject <b>proves</b> it — replacing the statistical gap with a machine-verifiable Lean 4 proof, before execution.</p>' +
      ctas,
  ];

  var heroCopy = document.getElementById("heroCopy");
  function setVariant(i) {
    heroCopy.innerHTML = variants[i];
    document.querySelectorAll(".vs-btn").forEach(function (b) {
      b.classList.toggle("active", +b.dataset.v === i);
    });
    try { localStorage.setItem("biject-hero-variant", i); } catch (e) {}
  }
  var saved = 0;
  try { saved = +(localStorage.getItem("biject-hero-variant") || 0); } catch (e) {}
  if (isNaN(saved) || saved < 0 || saved > 2) saved = 0;
  setVariant(saved);
  document.querySelectorAll(".vs-btn").forEach(function (b) {
    b.addEventListener("click", function () { setVariant(+b.dataset.v); });
  });

  /* ============================================================
     HERO TERMINAL — Lean 4 conjecture → verdict, looping
     ============================================================ */
  var heroScenes = [
    {
      tokens: [
        tok("agent", "tl-fn"), tok(" → ", "tl-dim"), tok("execute_trade", "tl-fn"), tok("(", "tl-dim"),
        tok("symbol=", "tl-key"), tok('"TSLA"', "tl-str"), tok(", qty=", "tl-key"), tok("50000", "tl-num"),
        tok(", type=", "tl-key"), tok('"market"', "tl-str"), tok(")", "tl-dim"), BR, BR,
        tok("building conjecture…", "tl-comment"), BR,
        tok("  import ", "tl-key"), tok("PolicyEnv.CapitalRule", "tl-fn"), BR,
        tok("  example : ", "tl-key"), tok("maxTradeValue 50000 394500 1000", "tl-fn"),
        tok(" = ", "tl-dim"), tok("true", "tl-key"), tok(" := ", "tl-dim"), tok("by decide", "tl-key"), BR, BR,
        tok("submitting to Lean 4 kernel…", "tl-dim"),
      ],
      verdict: "refuted", timing: "4.7 µs",
      reason: "trade value $19.7M exceeds 10% of daily capital ($3.94M)",
      foot: "⊥ blocked · adverse action CAP-001 (SEC Rule 15c3-5)",
    },
    {
      tokens: [
        tok("agent", "tl-fn"), tok(" → ", "tl-dim"), tok("execute_trade", "tl-fn"), tok("(", "tl-dim"),
        tok("symbol=", "tl-key"), tok('"AAPL"', "tl-str"), tok(", qty=", "tl-key"), tok("5000", "tl-num"),
        tok(", type=", "tl-key"), tok('"market"', "tl-str"), tok(")", "tl-dim"), BR, BR,
        tok("building conjecture…", "tl-comment"), BR,
        tok("  import ", "tl-key"), tok("PolicyEnv.CapitalRule", "tl-fn"), BR,
        tok("  example : ", "tl-key"), tok("maxTradeValue 5000 21250 1000", "tl-fn"),
        tok(" = ", "tl-dim"), tok("true", "tl-key"), tok(" := ", "tl-dim"), tok("by decide", "tl-key"), BR, BR,
        tok("submitting to Lean 4 kernel…", "tl-dim"),
      ],
      verdict: "proved", timing: "3.1 µs",
      reason: "trade value $1.06M within 10% capital threshold",
      foot: "↦ proof verified · routed to execution",
    },
  ];

  function buildVerdict(scene) {
    var isP = scene.verdict === "proved";
    var glyph = isP ? "⊢" : "✗";
    var label = isP ? "PROVED" : "REFUTED";
    var v = document.createElement("div");
    v.className = "verdict " + (isP ? "is-proved" : "is-refuted");
    v.innerHTML =
      '<span class="badge">' + glyph + " " + label + "</span>" +
      '<span class="timing">' + scene.timing + "</span>" +
      '<span class="reason">' + scene.reason + "</span>";
    var foot = document.createElement("div");
    foot.className = "verdict-foot " + (isP ? "is-proved" : "is-refuted");
    foot.textContent = scene.foot;
    return { v: v, foot: foot };
  }

  function typeScene(body, scene, done) {
    body.innerHTML = "";
    var line = document.createElement("div");
    line.className = "term-line";
    body.appendChild(line);
    var cursor = document.createElement("span");
    cursor.className = "cursor";
    var i = 0;

    function placeCursor() {
      if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
      line.appendChild(cursor);
    }

    function step() {
      if (i >= scene.tokens.length) {
        if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
        revealVerdict();
        return;
      }
      var tk = scene.tokens[i++];
      if (tk.br) {
        line = document.createElement("div");
        line.className = "term-line";
        body.appendChild(line);
      } else {
        var s = document.createElement("span");
        if (tk.c) s.className = tk.c;
        s.textContent = tk.t;
        line.appendChild(s);
      }
      placeCursor();
      setTimeout(step, reduced ? 0 : 36 + Math.random() * 32);
    }

    function revealVerdict() {
      var built = buildVerdict(scene);
      body.appendChild(built.v);
      body.appendChild(built.foot);
      requestAnimationFrame(function () {
        built.v.classList.add("show");
        built.foot.classList.add("show");
      });
      setTimeout(done, reduced ? 2600 : 3600);
    }

    if (reduced) {
      renderTokens(body, scene.tokens);
      revealVerdict();
    } else {
      step();
    }
  }

  var termBody = document.getElementById("termBody");
  var sceneIdx = 0;
  function runHero() {
    typeScene(termBody, heroScenes[sceneIdx], function () {
      sceneIdx = (sceneIdx + 1) % heroScenes.length;
      setTimeout(runHero, reduced ? 1500 : 700);
    });
  }
  setTimeout(runHero, reduced ? 0 : 500);

  /* ============================================================
     LIVE DEMO — verifier scenarios (Lean 4)
     ============================================================ */
  var scenarios = [
    {
      tag: "AAPL small order", verdict: "proved",
      title: "Buy 5,000 AAPL", sub: "Trade value $1.06M — well inside the capital threshold.",
      tokens: [
        tok("verify", "tl-fn"), tok(" → ", "tl-dim"), tok("execute_trade", "tl-fn"), tok("(", "tl-dim"),
        tok("symbol=", "tl-key"), tok('"AAPL"', "tl-str"), tok(", qty=", "tl-key"), tok("5000", "tl-num"),
        tok(", price=", "tl-key"), tok("212.50", "tl-num"), tok(")", "tl-dim"), BR,
        tok("  example : ", "tl-key"), tok("maxTradeValue 5000 21250 1000", "tl-fn"), tok(" := ", "tl-dim"), tok("by decide", "tl-key"),
      ],
      timing: "3.1 µs", reason: "trade value $1.06M within 10% capital threshold",
      foot: "↦ routed to execution · aud_01HXYZ…",
    },
    {
      tag: "TSLA large order", verdict: "refuted",
      title: "Buy 50,000 TSLA", sub: "Trade value $19.7M exceeds 10% of daily capital.",
      tokens: [
        tok("verify", "tl-fn"), tok(" → ", "tl-dim"), tok("execute_trade", "tl-fn"), tok("(", "tl-dim"),
        tok("symbol=", "tl-key"), tok('"TSLA"', "tl-str"), tok(", qty=", "tl-key"), tok("50000", "tl-num"),
        tok(", price=", "tl-key"), tok("394.50", "tl-num"), tok(")", "tl-dim"), BR,
        tok("  example : ", "tl-key"), tok("maxTradeValue 50000 394500 1000", "tl-fn"), tok(" := ", "tl-dim"), tok("by decide", "tl-key"),
      ],
      timing: "4.7 µs", reason: "trade value $19.7M > 10% of daily capital ($3.94M)",
      foot: "⊥ blocked · adverse action CAP-001 (SEC Rule 15c3-5)",
    },
    {
      tag: "BTC overweight rebalance", verdict: "refuted",
      title: "Rebalance BTC → 30%", sub: "Target weight exceeds max crypto allocation (15%).",
      tokens: [
        tok("verify", "tl-fn"), tok(" → ", "tl-dim"), tok("rebalance_portfolio", "tl-fn"), tok("(", "tl-dim"),
        tok("asset=", "tl-key"), tok('"BTC"', "tl-str"), tok(", target_weight=", "tl-key"), tok("0.30", "tl-num"), tok(")", "tl-dim"), BR,
        tok("  example : ", "tl-key"), tok("maxAlloc 3000 1500", "tl-fn"), tok(" := ", "tl-dim"), tok("by decide", "tl-key"),
      ],
      timing: "2.9 µs", reason: "target weight 30% exceeds max crypto allocation 15%",
      foot: "⊥ blocked · policy CRYPTO-003 · proof trace logged",
    },
    {
      tag: "SPY index rebalance", verdict: "proved",
      title: "Rebalance SPY → 22%", sub: "Satisfies every active position constraint.",
      tokens: [
        tok("verify", "tl-fn"), tok(" → ", "tl-dim"), tok("rebalance_portfolio", "tl-fn"), tok("(", "tl-dim"),
        tok("asset=", "tl-key"), tok('"SPY"', "tl-str"), tok(", target_weight=", "tl-key"), tok("0.22", "tl-num"), tok(")", "tl-dim"), BR,
        tok("  example : ", "tl-key"), tok("posLimits 2200 satisfied", "tl-fn"), tok(" := ", "tl-dim"), tok("by decide", "tl-key"),
      ],
      timing: "3.4 µs", reason: "rebalance satisfies all position constraints",
      foot: "↦ rebalance approved · aud_01HXZ2…",
    },
  ];

  var scnList = document.getElementById("scnList");
  var demoBody = document.getElementById("demoBody");
  var runBtn = document.getElementById("runBtn");
  var runHint = document.getElementById("runHint");
  var activeScn = 0;
  var demoBusy = false;

  scenarios.forEach(function (s, i) {
    var b = document.createElement("button");
    b.className = "scn" + (i === 0 ? " active" : "");
    b.innerHTML =
      '<div class="scn-tag">' + s.tag + "</div>" +
      '<div class="scn-title">' + s.title + "</div>" +
      '<div class="scn-sub">' + s.sub + "</div>";
    b.addEventListener("click", function () {
      if (demoBusy) return;
      activeScn = i;
      document.querySelectorAll(".scn").forEach(function (x, j) {
        x.classList.toggle("active", j === i);
      });
      loadScenario(i);
      runHint.textContent = "Ready — submit to the kernel.";
    });
    scnList.appendChild(b);
  });

  function loadScenario(i) {
    renderTokens(demoBody, scenarios[i].tokens);
    var hint = document.createElement("div");
    hint.className = "term-line tl-comment";
    hint.style.marginTop = "14px";
    hint.textContent = "— conjecture ready, awaiting submission";
    demoBody.appendChild(hint);
  }

  function runDemo() {
    if (demoBusy) return;
    demoBusy = true;
    var s = scenarios[activeScn];
    renderTokens(demoBody, s.tokens);
    var status = document.createElement("div");
    status.className = "term-line tl-dim";
    status.style.marginTop = "14px";
    status.textContent = "⊢ submitting to Lean 4 kernel";
    demoBody.appendChild(status);
    runHint.textContent = "Type-checking…";

    var dots = 0;
    var iv = setInterval(function () {
      dots = (dots + 1) % 4;
      status.textContent = "⊢ submitting to Lean 4 kernel" + Array(dots + 1).join(".");
    }, reduced ? 0 : 150);

    setTimeout(function () {
      clearInterval(iv);
      status.remove();
      var built = buildVerdict(s);
      demoBody.appendChild(built.v);
      demoBody.appendChild(built.foot);
      requestAnimationFrame(function () {
        built.v.classList.add("show");
        built.foot.classList.add("show");
      });
      runHint.textContent = s.verdict === "proved"
        ? "PROVED — action routed to execution."
        : "REFUTED — no proof exists, action blocked.";
      demoBusy = false;
    }, reduced ? 250 : 1100);
  }
  runBtn.addEventListener("click", runDemo);
  loadScenario(0);

  /* ============================================================
     REGULATORY COVERAGE CARDS
     ============================================================ */
  var regs = [
    {
      code: "SEC Rule 15c3-5", title: "Market Access Rule",
      req: "Automated, pre-trade hard blocks on orders that exceed capital thresholds or create undue market risk — under the broker-dealer's direct and exclusive control.",
      sat: "Binary, pre-execution blocking via Lean kernel proof requirement. Policy axioms are compiled and controlled by the firm; no external LLM is involved in the decision.",
    },
    {
      code: "OCC 2011-12", title: "Model Risk Management",
      req: "Institutions must validate, monitor, and control the models they use for risk and decision-making.",
      sat: "Every policy axiom is a formally specified Lean 4 theorem — auditable, versioned, and mathematically validated before deployment. The Policy Environment is an immutable artifact, not a model.",
    },
    {
      code: "FINRA Rule 3110", title: "Supervision",
      req: "A supervisory system with tamper-evident records of supervisory procedures and their application.",
      sat: "Every action — allowed or blocked — is appended to a hash-linked log: the exact conjecture, full proof trace, binary verdict, and latency. Tamper-evident by construction.",
    },
    {
      code: "ECOA / FCRA", title: "Adverse Action Notices",
      req: "Entities denying credit or financial actions must provide specific, machine-generated explanations of the reason for denial.",
      sat: "The back-translation pipeline turns the kernel's error trace — which axiom and parameter caused the refutation — into a plain-language notice citing the policy and the exact values.",
    },
    {
      code: "EU AI Act", title: "Explainability",
      req: "High-risk AI systems in financial services must provide human-understandable explanations for their decisions.",
      sat: "Every REFUTED verdict produces a formal Lean error trace and a plain-language translation — derived from the proof failure itself, not a post-hoc rationalization.",
    },
    {
      code: "CFPB 2023", title: "AI Credit Decisions",
      req: "Lenders using AI must provide specific, accurate reasons for adverse actions — not vague, model-level explanations.",
      sat: "Notices cite the specific policy (e.g. CAP-001), the parameter values, and the mathematical relationship that caused the failure — meeting the CFPB's specificity requirement.",
    },
  ];
  var regGrid = document.getElementById("regGrid");
  regs.forEach(function (r) {
    var c = document.createElement("div");
    c.className = "reg-card";
    c.innerHTML =
      '<div class="reg-code">' + r.code + "</div>" +
      "<h3>" + r.title + "</h3>" +
      '<span class="reg-meta-label">Requires</span>' +
      '<p class="reg-req">' + r.req + "</p>" +
      '<span class="reg-meta-label">biject</span>' +
      '<div class="reg-sat"><span class="rs-mark">⊢</span><span>' + r.sat + "</span></div>";
    regGrid.appendChild(c);
  });

  /* ============================================================
     NAV scroll state + reveal-on-scroll
     ============================================================ */
  var nav = document.getElementById("nav");
  function onScroll() { nav.classList.toggle("scrolled", window.scrollY > 24); }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  var revEls = [].slice.call(document.querySelectorAll(".reveal"));
  function checkReveal() {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    for (var i = revEls.length - 1; i >= 0; i--) {
      var el = revEls[i];
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) {
        el.classList.add("in");
        revEls.splice(i, 1);
      }
    }
  }
  checkReveal();
  window.addEventListener("scroll", checkReveal, { passive: true });
  window.addEventListener("resize", checkReveal, { passive: true });
  setTimeout(function () {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  }, 2500);
})();
