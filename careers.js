/* ============================================================
   biject — careers page logic
   - Pulls open roles live from your Google Sheet (via Apps Script)
   - Falls back to the seeded role below until you wire it up
   - Submits applications (incl. résumé) back to the same Sheet
   See "Careers — Google Sheet Setup.md" for the 5-minute setup.
   ============================================================ */

/* ---- 1. CONFIG — paste your deployed Apps Script Web App URL here ---- */
const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxG2MucAfmtHAQd5xh_PqhIaxTo0Z0cakqKVJpnE3wmFA8towVJgzIuoM6Y7oDu7YX8/exec"
};

/* ---- 2. Fallback role — shown when no Sheet is connected yet ----
   This mirrors the Roles tab schema. Once your Sheet is live,
   roles come from there and you never touch this file again.       */
const FALLBACK_ROLES = [
  {
    title: "Research Associate — Financial Compliance Dataset & Formal Verification",
    team: "Research",
    location: "Remote",
    type: "Part-time / Contract",
    status: "Open",
    summary: "Translate the clause-dense language of financial regulation into structured, machine-readable knowledge a Lean 4 theorem prover can reason over. No coding — something harder.",
    about: "biject is building the world's first formally verified AI compliance infrastructure for financial services — using Lean 4 theorem proving to enforce SEC, FINRA, and CFPB regulatory mandates with mathematical certainty. We're looking for a sharp pre-law or finance undergraduate with deep fluency in financial regulation to help us build the foundational datasets that will train the next generation of AI-native compliance systems.\nThis is a ground-floor research role at the intersection of financial law, formal logic, and machine learning. You won't be coding. You'll be doing something harder: translating the ambiguous, clause-dense language of financial regulation into structured, machine-readable knowledge that a theorem prover can reason over.",
    responsibilities: [
      "Annotate and decompose regulatory text from SEC rules (e.g., Rule 15c3-5), FINRA rulebooks (e.g., Rule 3110), OCC bulletins, CFPB guidance, and ECOA/FCRA statutes into structured logical components suitable for Lean 4 formalization",
      "Build and curate natural-language ↔ formal-logic training pairs that map plain-English policy language to precise mathematical constraints — the raw material for NL2Lean-style fine-tuning",
      "Identify concept-to-symbol mappings across regulatory domains (e.g., \"capital threshold,\" \"adverse action,\" \"supervisory control\") and maintain a consistent financial terminology registry that prevents semantic drift during AI formalization",
      "Draft plain-English \"adverse action\" explanations reverse-engineered from formal Lean proof-failure traces, satisfying ECOA and CFPB plain-language disclosure requirements",
      "Research and summarize regulatory frameworks across domestic and international domains (Basel III, EU AI Act, GDPR, MiFID II) to support policy-library expansion",
      "Collaborate directly with engineers and researchers to validate whether formalized axioms faithfully capture the legal intent of the underlying statute"
    ],
    requirements: [
      "Enrolled in or recently completed an undergraduate program in pre-law, finance, economics, or a related field — with demonstrated coursework or self-study in financial regulation, securities law, or compliance",
      "Genuine command of the regulatory landscape: you know the difference between a FINRA rule and an SEC release, you understand what \"adverse action\" means under ECOA, and you can read a rulemaking document without a glossary",
      "Strong analytical writing: you can take a 40-page regulatory release and extract the core logical conditions it imposes on a covered entity",
      "Detail-oriented and methodical — our dataset quality is a direct function of annotation precision",
      "Curiosity about AI, formal methods, or the future of machine-readable law is a plus; no programming required"
    ],
    whyItMatters: "Probabilistic AI cannot govern itself in regulated financial environments. biject is solving this by building the formal-verification layer that makes autonomous financial AI mathematically safe. The datasets you help create will directly power the policy-translation engine that brokers, asset managers, and fintechs use to deploy AI with cryptographic compliance guarantees. This is foundational infrastructure work — the kind that shapes what financial intelligence looks like for the next decade.",
    compensation: "Flexible hours, project-based or hourly, commensurate with experience. Research credit and co-authorship considered for significant contributions. Ideal for someone building toward law school, a compliance career, or a research track in legal technology or AI governance."
  }
];

/* ============================================================
   Boot
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initReveal();
  initFileInput();
  loadRoles();
  initForm();
  if (!CONFIG.APPS_SCRIPT_URL) {
    const b = document.getElementById("setupBanner");
    if (b) b.style.display = "flex";
  }
});

/* ---------- nav scroll state ---------- */
function initNav() {
  const nav = document.getElementById("nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* ---------- reveal on scroll ---------- */
function initReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) { els.forEach(e => e.classList.add("in")); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  els.forEach(e => io.observe(e));
}

/* ============================================================
   Roles — fetch + render
   ============================================================ */
async function loadRoles() {
  let roles = FALLBACK_ROLES;
  if (CONFIG.APPS_SCRIPT_URL) {
    try {
      const res = await fetch(CONFIG.APPS_SCRIPT_URL + "?action=roles", { method: "GET" });
      const data = await res.json();
      if (Array.isArray(data) && data.length) {
        roles = data.filter(r => (r.status || "Open").toLowerCase() !== "closed");
      } else if (Array.isArray(data.roles)) {
        roles = data.roles.filter(r => (r.status || "Open").toLowerCase() !== "closed");
      }
    } catch (err) {
      console.warn("[careers] Could not load roles from Sheet, using fallback.", err);
    }
  }
  renderRoles(roles);
  populateRoleSelect(roles);
}

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

/* split a cell into a list: supports newlines, " | ", or "; " */
function toList(val) {
  if (Array.isArray(val)) return val.filter(Boolean);
  if (!val) return [];
  return String(val).split(/\r?\n|\s*\|\s*|\s*;\s*/).map(s => s.trim()).filter(Boolean);
}

function renderRoles(roles) {
  const list = document.getElementById("rolesList");
  list.innerHTML = "";
  if (!roles.length) {
    list.appendChild(el("div", "roles-empty", "No open roles at the moment — but we always read open applications below."));
    return;
  }

  roles.forEach((role, i) => {
    const card = el("div", "role");
    const id = "role-" + i;

    /* summary header (button toggles detail) */
    const summary = el("button", "role-summary");
    summary.type = "button";
    summary.setAttribute("aria-expanded", "false");

    const headline = el("div", "role-headline");
    headline.appendChild(el("div", "role-title", role.title || "Untitled role"));
    const meta = el("div", "role-meta");
    if (role.team) meta.appendChild(el("span", "role-chip team", role.team));
    if (role.location) meta.appendChild(el("span", "role-chip", role.location));
    if (role.type) meta.appendChild(el("span", "role-chip", role.type));
    headline.appendChild(meta);
    if (role.summary) headline.appendChild(el("div", "role-blurb", role.summary));
    summary.appendChild(headline);

    const cta = el("div", "role-cta");
    cta.appendChild(el("span", "role-toggle", 'View details <span class="chev"></span>'));
    summary.appendChild(cta);

    /* detail */
    const detail = el("div", "role-detail");
    const inner = el("div", "role-detail-inner");
    const pad = el("div", "role-detail-pad");

    if (role.about) {
      const b = el("div", "rd-block");
      b.appendChild(el("div", "rd-label", "About the role"));
      toList(role.about).forEach(par => b.appendChild(el("p", null, escapeHtml(par))));
      pad.appendChild(b);
    }
    const resp = toList(role.responsibilities);
    if (resp.length) pad.appendChild(blockList("What you'll do", resp));
    const req = toList(role.requirements);
    if (req.length) pad.appendChild(blockList("What we're looking for", req));
    if (role.whyItMatters) {
      const b = el("div", "rd-block");
      b.appendChild(el("div", "rd-label", "Why this matters"));
      toList(role.whyItMatters).forEach(par => b.appendChild(el("p", null, escapeHtml(par))));
      pad.appendChild(b);
    }

    const foot = el("div", "rd-foot");
    if (role.compensation) {
      const comp = el("div", "rd-comp");
      comp.innerHTML = '<span class="rd-label" style="margin-bottom:6px;">Compensation & structure</span>' + escapeHtml(role.compensation);
      foot.appendChild(comp);
    }
    const applyBtn = el("button", "btn btn-primary", "Apply for this role ↦");
    applyBtn.type = "button";
    applyBtn.addEventListener("click", (e) => { e.stopPropagation(); goToApply(role.title); });
    foot.appendChild(applyBtn);
    pad.appendChild(foot);

    inner.appendChild(pad);
    detail.appendChild(inner);

    summary.addEventListener("click", () => {
      const isOpen = card.classList.toggle("open");
      summary.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    card.appendChild(summary);
    card.appendChild(detail);
    list.appendChild(card);
  });
}

function blockList(label, items) {
  const b = el("div", "rd-block");
  b.appendChild(el("div", "rd-label", label));
  const ul = el("ul", "rd-list");
  items.forEach(it => {
    const li = el("li");
    li.appendChild(el("span", "mk", "↦"));
    li.appendChild(el("span", null, escapeHtml(it)));
    ul.appendChild(li);
  });
  b.appendChild(ul);
  return b;
}

function populateRoleSelect(roles) {
  const sel = document.getElementById("f-role");
  // keep the first two static options (placeholder + open application)
  roles.forEach(r => {
    if (!r.title) return;
    const o = document.createElement("option");
    o.value = r.title; o.textContent = r.title;
    sel.appendChild(o);
  });
}

function goToApply(roleTitle) {
  const sel = document.getElementById("f-role");
  if (roleTitle) {
    const match = [...sel.options].find(o => o.value === roleTitle);
    sel.value = match ? roleTitle : "Open application";
  }
  const target = document.getElementById("apply");
  const y = target.getBoundingClientRect().top + window.scrollY - 70;
  window.scrollTo({ top: y, behavior: "smooth" });
  setTimeout(() => document.getElementById("f-name").focus({ preventScroll: true }), 480);
}

/* ============================================================
   File input
   ============================================================ */
const MAX_FILE_BYTES = 8 * 1024 * 1024;
let pickedFile = null;

function initFileInput() {
  const input = document.getElementById("f-resume");
  const drop = document.getElementById("fileDrop");
  const label = document.getElementById("fileLabel");
  const hint = document.getElementById("fileHint");

  input.addEventListener("change", () => {
    const f = input.files[0];
    if (!f) { reset(); return; }
    if (f.size > MAX_FILE_BYTES) {
      drop.classList.remove("has-file");
      label.textContent = "File too large";
      hint.textContent = "Maximum size is 8 MB — please attach a smaller file.";
      input.value = ""; pickedFile = null;
      return;
    }
    pickedFile = f;
    drop.classList.add("has-file");
    label.textContent = f.name;
    hint.textContent = (f.size / 1024 / 1024).toFixed(2) + " MB · click to replace";
  });

  function reset() {
    pickedFile = null;
    drop.classList.remove("has-file");
    label.textContent = "Attach a file";
    hint.textContent = "PDF, DOC or DOCX · up to 8 MB";
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]); // strip data: prefix
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* ============================================================
   Form submit
   ============================================================ */
function initForm() {
  const form = document.getElementById("applyForm");
  const btn = document.getElementById("submitBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = '<span class="spin"></span> Submitting…';

    const payload = {
      action: "apply",
      role: val("f-role"),
      name: val("f-name"),
      email: val("f-email"),
      location: val("f-location"),
      link: val("f-link"),
      heard: val("f-heard"),
      page: location.href,
      submittedAt: new Date().toISOString()
    };

    try {
      if (pickedFile) {
        payload.resume = {
          name: pickedFile.name,
          mimeType: pickedFile.type || "application/octet-stream",
          data: await fileToBase64(pickedFile)
        };
      }

      if (!CONFIG.APPS_SCRIPT_URL) {
        console.log("[careers] No Apps Script URL set. Application payload:", payload);
        showResult("ok", "↦ Application captured (demo mode)",
          "No Google Sheet is connected yet, so this was logged to the browser console only. Once you paste your Apps Script URL into <b>careers.js</b>, submissions will land in your Sheet automatically.");
      } else {
        const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" }, // text/plain avoids CORS preflight
          body: JSON.stringify(payload)
        });
        const out = await res.json().catch(() => ({}));
        if (out && out.ok === false) throw new Error(out.error || "Server rejected the submission.");
        showResult("ok", "↦ Application received",
          "Thank you — your application is in. We read every submission and aim to reply within two weeks at <b>" + escapeHtml(payload.email) + "</b>.");
      }
      form.reset();
      document.getElementById("fileDrop").classList.remove("has-file");
      document.getElementById("fileLabel").textContent = "Attach a file";
      document.getElementById("fileHint").textContent = "PDF, DOC or DOCX · up to 8 MB";
      pickedFile = null;
    } catch (err) {
      console.error("[careers] submit failed", err);
      showResult("err", "Something went wrong",
        "We couldn't submit your application just now. Please try again, or email it to <a href=\"mailto:hello@biject.ai\">hello@biject.ai</a>.");
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });
}

function val(id) { return (document.getElementById(id).value || "").trim(); }

function showResult(kind, title, body) {
  const box = document.getElementById("formResult");
  document.getElementById("frMark").textContent = kind === "ok" ? "↦" : "⚠";
  document.getElementById("frTitle").textContent = title;
  document.getElementById("frBody").innerHTML = body;
  box.className = "form-result show " + kind;
  const y = box.getBoundingClientRect().top + window.scrollY - 120;
  window.scrollTo({ top: y, behavior: "smooth" });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
}
