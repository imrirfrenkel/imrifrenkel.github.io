
document.addEventListener("DOMContentLoaded", () => {
  const LINK_SELECTOR =
    ".list__item .archive__item a[rel='permalink'], .list__item .archive__item a[href]";

  const cache = new Map(); // pageUrl -> { text, bqid }
  let activeLink = null;
  let activeAbort = null;

  // ---------- Teaser UI ----------
  let teaser = document.getElementById("teaching-teaser");
  if (!teaser) {
    teaser = document.createElement("div");
    teaser.id = "teaching-teaser";
    teaser.setAttribute("role", "tooltip");
    teaser.setAttribute("aria-hidden", "true");
    teaser.style.cssText = `
      position:fixed;
      z-index:9999;
      max-width:420px;
      padding:12px 14px;
      border:1px solid #ddd; 
      border-radius:10px; 
      background:#e9fff8;
      box-shadow:0 8px 22px rgba(0,0,0,0.12);
      opacity:0; 
      transform:translateY(6px);
      pointer-events:none;
      transition:opacity 120ms ease, transform 120ms ease;
      font:13px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      color:#333;
    `;
    document.body.appendChild(teaser);
  }

  const GAP = 12;
  const PAD = 10;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const normalizeText = (s) => (s || "").replace(/\s+/g, " ").trim();
  const esc = (s) => (window.CSS && CSS.escape) ? CSS.escape(s) : s.replace(/[^a-zA-Z0-9_-]/g, "\\$&");

  function positionTeaserNextToLink(linkEl) {
    const linkRect = linkEl.getBoundingClientRect();
    const teaserRect = teaser.getBoundingClientRect();

    let x = linkRect.right + GAP;
    let y = linkRect.top;

    if (x + teaserRect.width + PAD > window.innerWidth) {
      x = linkRect.left - GAP - teaserRect.width;
    }

    x = clamp(x, PAD, window.innerWidth - teaserRect.width - PAD);
    y = clamp(y, PAD, window.innerHeight - teaserRect.height - PAD);

    teaser.style.left = `${x}px`;
    teaser.style.top = `${y}px`;
  }

  // Bold "Description:" prefix + text after
  function showTeaser(descriptionText, linkEl) {
    teaser.innerHTML = `<b>Description: </b>${escapeHtml(descriptionText)}`;
    teaser.style.opacity = "1";
    teaser.style.transform = "translateY(0)";
    teaser.setAttribute("aria-hidden", "false");
    positionTeaserNextToLink(linkEl);
  }

  function showLoading(linkEl) {
    teaser.innerHTML = `<b>Description: </b>Loading…`;
    teaser.style.opacity = "1";
    teaser.style.transform = "translateY(0)";
    teaser.setAttribute("aria-hidden", "false");
    positionTeaserNextToLink(linkEl);
  }

  function hideTeaser() {
    teaser.style.opacity = "0";
    teaser.style.transform = "translateY(6px)";
    teaser.setAttribute("aria-hidden", "true");
    teaser.innerHTML = "";
    activeLink = null;

    if (activeAbort) activeAbort.abort();
    activeAbort = null;
  }

  function escapeHtml(str) {
    return (str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;")
      .replaceAll("\n", "<br>");
  }

  async function loadPreviewAndBqid(pageUrl, preferredBqid, signal) {
    if (cache.has(pageUrl)) return cache.get(pageUrl);

    const res = await fetch(pageUrl, { signal, cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch failed (${res.status})`);

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    let bq = null;
    if (preferredBqid) bq = doc.querySelector(`blockquote#${esc(preferredBqid)}`);
    if (!bq) bq = doc.querySelector("blockquote[id]");
    if (!bq) bq = doc.querySelector("blockquote");

    const out = {
      text: bq ? normalizeText(bq.textContent) : "",
      bqid: (bq && bq.id) ? bq.id : ""
    };

    cache.set(pageUrl, out);
    return out;
  }

  // Inject data-src for all matching links (bqid discovered on hover)
  document.querySelectorAll(LINK_SELECTOR).forEach((a) => {
    const href = a.getAttribute("href");
    if (!href) return;
    a.dataset.src = new URL(href, window.location.href).toString();
  });

  // Hover logic
  document.addEventListener("mouseover", async (e) => {
    const a = e.target.closest(LINK_SELECTOR);
    if (!a) return;

    const pageUrl = a.dataset.src || new URL(a.getAttribute("href"), window.location.href).toString();

    activeLink = a;
    if (activeAbort) activeAbort.abort();
    activeAbort = new AbortController();

    showLoading(a);

    try {
      const { text, bqid } = await loadPreviewAndBqid(pageUrl, a.dataset.bqid, activeAbort.signal);
      if (activeAbort.signal.aborted) return;
      if (activeLink !== a) return;

      if (bqid) a.dataset.bqid = bqid;
      if (!text) { hideTeaser(); return; }

      showTeaser(text, a);
    } catch {
      if (activeAbort?.signal.aborted) return;
      if (activeLink !== a) return;
      hideTeaser();
    }
  });

  document.addEventListener("mouseout", (e) => {
    const a = e.target.closest(LINK_SELECTOR);
    if (!a) return;
    if (a.contains(e.relatedTarget)) return;
    hideTeaser();
  });

  window.addEventListener("scroll", hideTeaser, { passive: true });
  window.addEventListener("resize", () => {
    const hovered = document.querySelector(`${LINK_SELECTOR}:hover`);
    if (hovered && teaser.getAttribute("aria-hidden") === "false") {
      positionTeaserNextToLink(hovered);
    }
  }, { passive: true });
});


/* ======= Function for pulling skills terms and displaying description teaser ============= 
============================================================================================*/
// load terms from JSON //
(() => {
  const TERMS_JSON_URL = "/../assets/js/cv_skilldesc.json";
  const TEASER_ID = "term-teaser";

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const termsJSON = await fetchTermsJSON(TERMS_JSON_URL);
      initTermTeasers(termsJSON);
    } catch (error) {
      console.error("Term teaser initialization failed:", error);
    }
  });

  async function fetchTermsJSON(url) {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Could not load ${url}. HTTP status: ${response.status}`);
    }

    return response.json();
  }

  function initTermTeasers(termsJSON) {
    const teaser = createTeaserElement();
    const termIndex = buildTermIndex(termsJSON);
    const aliasIndex = buildAliasIndex();

    let activeElement = null;
    let activeEntry = null;

    document.addEventListener("pointermove", (event) => {
      const hovered = event.target.closest("table li, table td, table th");

      if (!hovered) {
        hideTeaser();
        return;
      }

      const label = getElementOwnText(hovered);
      const entry = findEntry(label, termIndex, aliasIndex);

      if (!entry || !entry.introductory_paragraph) {
        hideTeaser();
        return;
      }

      if (hovered !== activeElement || entry !== activeEntry) {
        activeElement = hovered;
        activeEntry = entry;

        teaser.innerHTML = `
          <span class="teaser-title">${escapeHTML(entry.term || entry.resolved_entry || label)}</span>
          <span>${escapeHTML(entry.introductory_paragraph)}</span>
        `;

        teaser.style.display = "block";
      }

      positionTeaser(teaser, event.clientX, event.clientY);
    });

    document.addEventListener("pointerout", (event) => {
      const leavingTableElement = event.target.closest("table li, table td, table th");
      const enteringTableElement = event.relatedTarget
        ? event.relatedTarget.closest("table li, table td, table th")
        : null;

      if (leavingTableElement && leavingTableElement !== enteringTableElement) {
        hideTeaser();
      }
    });

    function hideTeaser() {
      teaser.style.display = "none";
      activeElement = null;
      activeEntry = null;
    }
  }

  function createTeaserElement() {
    let teaser = document.getElementById(TEASER_ID);

    if (!teaser) {
      teaser = document.createElement("div");
      teaser.id = TEASER_ID;
      document.body.appendChild(teaser);
    }

    teaser.style.position = "fixed";
    teaser.style.display = "none";
    teaser.style.maxWidth = "420px";
    teaser.style.padding = "0.75rem 0.9rem";
    teaser.style.border = "1px solid #d0d0d0";
    teaser.style.borderRadius = "0.5rem";
    teaser.style.background = "#f0fffa";
    teaser.style.color = "#222222";
    teaser.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.18)";
    teaser.style.fontSize = "0.9rem";
    teaser.style.lineHeight = "1.35";
    teaser.style.zIndex = "999999";
    teaser.style.pointerEvents = "none";

    const styleId = "term-teaser-style";

    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        #${TEASER_ID} .teaser-title {
          display: block;
          font-weight: 700;
          margin-bottom: 0.35rem;
        }

        #mse td,
        #mse li {
          cursor: help;
        }

        #course td,
        #course li {
          cursor: help;
        }
      `;
      document.head.appendChild(style);
    }

    return teaser;
  }

  function buildTermIndex(termsJSON) {
    const index = new Map();
    const termsArray = Array.isArray(termsJSON) ? termsJSON : termsJSON.terms;

    if (!Array.isArray(termsArray)) {
      throw new Error("terms.json must contain either a top-level array or an object with a 'terms' array.");
    }

    termsArray.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;

      addKey(index, entry.term, entry);
      addKey(index, entry.resolved_entry, entry);

      if (entry.term) {
        addKey(index, extractParenthetical(entry.term), entry);
      }

      if (entry.resolved_entry) {
        addKey(index, extractParenthetical(entry.resolved_entry), entry);
      }
    });

    return index;
  }

  function addKey(index, key, entry) {
    if (!key) return;

    const normalized = normalizeTerm(key);

    if (normalized) {
      index.set(normalized, entry);
    }
  }

  function buildAliasIndex() {
    const aliases = {
      "scanning electron microscopy sem": "SEM",
      "scanning electron microscope sem": "SEM",

      "atomic force microscopy afm": "AFM",

      "nuclear magnetic resonance nmr": "NMR",

      "fourier transform infrared spectroscopy ftir": "FTIR",
      "fourier-transform infrared spectroscopy ftir": "FTIR",

      "electron diffraction spectroscopy eds": "EDS",
      "energy dispersive x ray spectroscopy eds": "EDS",
      "energy-dispersive x-ray spectroscopy eds": "EDS",

      "x ray photon spectroscopy xps": "XPS",
      "x ray photoelectron spectroscopy xps": "XPS",
      "x-ray photoelectron spectroscopy xps": "XPS",

      "x ray diffraction xrd": "XRD",
      "x-ray diffraction xrd": "XRD",

      "dynamic mechanical analysis dma": "DMA",
      "differential scanning calorimetry dsc": "DSC",

      "rheology": "Rheology",
      "profilometry": "Profilometry",
      "interferometry": "Interferometry",
      "laser confocal microscopy": "Laser Confocal Microscopy",

      "mercury intrusion porosimetry": "Mercury Intrusion Porosimeter",
      "mercury intrusion porosimeter": "Mercury Intrusion Porosimeter",

      "gas chromatography mass spectroscopy gc ms": "GC-MS",
      "gas chromatography mass spectrometry gc ms": "GC-MS",
      "gas chromatography - mass spectroscopy gc-ms": "GC-MS",

      "gel permeation chromatography gpc": "GPC",

      "quartz crystal micobalance qcm": "QCM",
      "quartz crystal microbalance qcm": "QCM",

      "electrochemical impedence spectroscopy": "Electrochemical Impedance Spectroscopy",
      "electrochemical impedance spectroscopy": "Electrochemical Impedance Spectroscopy",

      "thermogravimetic analysis tga": "TGA",
      "thermogravimetric analysis tga": "TGA",

      "wet contact surface angle": "Wet Contact Angle",
      "wet contact angle": "Wet Contact Angle",

      "adhesion force testing peel pull off shear": "Adhesion (peel, pull-off, shear)",
      "adhesion peel pull off shear": "Adhesion (peel, pull-off, shear)",

      "additve manufacturing am 3d printing": "Additive Manufacturing",
      "additive manufacturing am 3d printing": "Additive Manufacturing",
      "additive manufacturing 3d printing": "Additive Manufacturing",

      "fdm": "FDM",
      "dlp": "DLP",
      "sla": "SLA",
      "ink jet": "Ink Jet",
      "inkjet": "Ink Jet",
      "powderbed": "Powder Bed",
      "powder bed": "Powder Bed",

      "atomic layer deposition ald": "ALD",
      "pulsed laser deposition pld": "PLD",
      "chemical vapor deposition cvd": "CVD",

      "ion milling": "Ion Milling",
      "electrolyte deposition": "Electrolyte Deposition",

      "sublimation freeze drying": "Sublimation Freeze Drying",
      "critical co2 drying": "Critical CO2 Drying",
      "critical co 2 drying": "Critical CO2 Drying",

      "mobile phase film coating flow spin": "Thin Film Coating (Flow, Spin)",
      "thin film coating flow spin": "Thin Film Coating (Flow, Spin)",

      "computer numerical control machining cnc": "CNC",
      "cnc": "CNC",

      "laser cutting": "Laser Cutting",
      "uvo plasma etching": "UVO Plasma Etching",

      "e beam lithography": "e-Beam Lithography",
      "electron beam lithography": "e-Beam Lithography",

      "polymerization": "Polymerization: radical (UV, Thermal, RAFT)",
      "radical": "Polymerization: radical (UV, Thermal, RAFT)",
      "uv": "Polymerization: radical (UV, Thermal, RAFT)",
      "thermal": "Polymerization: radical (UV, Thermal, RAFT)",
      "raft": "Polymerization: radical (UV, Thermal, RAFT)",

      "ionic": "ionic",
      "condensate precipitation": "condensate/precipitation",
      "condensate": "condensate/precipitation",
      "precipitation": "condensate/precipitation",

      "step growth": "step-growth",
      "step-growth": "step-growth",

      "sol gel": "Sol-gel",
      "sol-gel": "Sol-gel",

      "ceramic matrix composites cmc": "CMC",
      "ceramic matrix composite cmc": "CMC",
      "cmc": "CMC",

      "schlink line chemistry": "Schlink Line",
      "schlenk line chemistry": "Schlink Line",
      "schlink line": "Schlink Line",
      "schlenk line": "Schlink Line",

      "glovebox": "Glovebox",

      "cleanroom class 10 iso4": "Cleanroom (Class 10; ISO4)",
      "cleanroom class 10 iso 4": "Cleanroom (Class 10; ISO4)"
    };

    const normalizedAliases = new Map();

    Object.entries(aliases).forEach(([displayText, jsonTerm]) => {
      normalizedAliases.set(normalizeTerm(displayText), jsonTerm);
    });

    return normalizedAliases;
  }

  function findEntry(rawLabel, termIndex, aliasIndex) {
    const normalized = normalizeTerm(rawLabel);

    if (!normalized) {
      return null;
    }

    if (termIndex.has(normalized)) {
      return termIndex.get(normalized);
    }

    if (aliasIndex.has(normalized)) {
      const jsonTerm = aliasIndex.get(normalized);
      return termIndex.get(normalizeTerm(jsonTerm)) || null;
    }

    const parentheticalText = extractParenthetical(rawLabel);

    if (parentheticalText) {
      const normalizedParenthetical = normalizeTerm(parentheticalText);

      if (termIndex.has(normalizedParenthetical)) {
        return termIndex.get(normalizedParenthetical);
      }

      if (aliasIndex.has(normalizedParenthetical)) {
        const jsonTerm = aliasIndex.get(normalizedParenthetical);
        return termIndex.get(normalizeTerm(jsonTerm)) || null;
      }
    }

    const acronym = extractFinalAcronym(rawLabel);

    if (acronym) {
      const normalizedAcronym = normalizeTerm(acronym);

      if (termIndex.has(normalizedAcronym)) {
        return termIndex.get(normalizedAcronym);
      }

      if (aliasIndex.has(normalizedAcronym)) {
        const jsonTerm = aliasIndex.get(normalizedAcronym);
        return termIndex.get(normalizeTerm(jsonTerm)) || null;
      }
    }

    return null;
  }

  function getElementOwnText(element) {
    const clone = element.cloneNode(true);

    clone.querySelectorAll("ul, ol, table").forEach((child) => {
      child.remove();
    });

    return clone.textContent.trim();
  }

  function extractParenthetical(value) {
    const match = String(value).match(/\(([^)]+)\)/);

    if (!match) {
      return "";
    }

    return match[1];
  }

  function extractFinalAcronym(value) {
    const matches = String(value).match(/\(([A-Za-z0-9-]+)\)\s*$/);

    if (!matches) {
      return "";
    }

    return matches[1];
  }

  function normalizeTerm(value) {
    return String(value)
      .replace(/₂/g, "2")
      .replace(/–|—/g, "-")
      .replace(/&/g, " and ")
      .replace(/\+/g, " plus ")
      .replace(/\//g, " ")
      .replace(/-/g, " ")
      .replace(/[()]/g, " ")
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  }

  function positionTeaser(teaser, x, y) {
    const offset = 18;

    let left = x + offset;
    let top = y + offset;

    teaser.style.left = `${left}px`;
    teaser.style.top = `${top}px`;

    const rect = teaser.getBoundingClientRect();

    if (rect.right > window.innerWidth - 8) {
      left = x - rect.width - offset;
    }

    if (rect.bottom > window.innerHeight - 8) {
      top = y - rect.height - offset;
    }

    teaser.style.left = `${Math.max(8, left)}px`;
    teaser.style.top = `${Math.max(8, top)}px`;
  }

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();

/* ============================================================================================================
=== Script to inject id = header's text content, to allow for toc functionality, creates list elements, =======
=== then orders the toc based on order of appearance in document    ===========================================
===============================================================================================================*/
// Run after DOM is ready
(function ready(fn) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
  else fn();
})(function () {
  const archive = document.querySelector(".archive");
  if (!archive) return;

  // ----------------------------
  // 0) Insert the TOC sidebar HTML BEFORE <div class="archive">
  // ----------------------------
  let toc = document.querySelector("ul.toc__menu#markdown-toc");

  if (!toc) {
    const aside = document.createElement("aside");
    aside.className = "sidebar__right";
    aside.innerHTML = `
      <nav class="toc">
        <header>
          <h4 class="nav__title" style="border-bottom: 1px solid lightgrey; margin-bottom: 0.2em;">
            <i class="fa fa-file-text"></i> In This CV
          </h4>
        </header>
        <ul class="toc__menu" id="markdown-toc"></ul>
      </nav>
    `;

    archive.insertAdjacentElement("beforebegin", aside);
    toc = aside.querySelector("ul.toc__menu#markdown-toc");
  }

  // ----------------------------
  // helpers
  // ----------------------------
  const used = new Set();

  function makeIdFromText(txt) {
    return (txt || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9_-]/g, "");
  }

  function uniqueId(base, fallback) {
    let id = base || fallback;
    let n = 2;
    while (used.has(id) || document.getElementById(id)) {
      id = `${base || fallback}${n++}`;
    }
    used.add(id);
    return id;
  }

  function getTableHeaderTitle(th) {
    const t = (th.textContent || "").replace(/\s+/g, " ").trim();
    return t || "Table Header";
  }

  function findPrecedingH1(node, eligibleH1s) {
    for (let i = eligibleH1s.length - 1; i >= 0; i--) {
      const h1 = eligibleH1s[i];
      const pos = h1.compareDocumentPosition(node);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return h1;
    }
    return null;
  }

  // ----------------------------
  // Assign ids to H1s
  // ----------------------------
  const h1sAll = Array.from(archive.querySelectorAll("h1"));
  if (!h1sAll.length) return;

  const h1s = h1sAll.slice(1); // skip first h1 "CV"
  const records = []; // {type:'h1'|'th', id,title,parentH1Id?}

  h1s.forEach((h1) => {
    const title = (h1.textContent || "").trim();
    const id = uniqueId(makeIdFromText(title), "h1");
    h1.id = id;
    records.push({ type: "h1", id, title });
  });

  // ----------------------------
  // Assign ids to table headers and group under preceding H1
  // ----------------------------
  const ths = Array.from(archive.querySelectorAll("th"));

  ths.forEach((th) => {
    const title = getTableHeaderTitle(th);
    const id = uniqueId(makeIdFromText(title), "th");
    th.id = id;

    const parentH1 = findPrecedingH1(th, h1s);
    const parentH1Id = parentH1 ? parentH1.id : null;

    records.push({ type: "th", id, title, parentH1Id });
  });

  // ----------------------------
  // Build TOC
  // ----------------------------
  toc.innerHTML = "";

  const h1LiMap = new Map();

  // Top-level H1 items
  records.filter(r => r.type === "h1").forEach(({ id, title }) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.textContent = title;
    a.href = `#${id}`;
    li.appendChild(a);

    const sub = document.createElement("ul");
    sub.className = "toc__submenu";
    li.appendChild(sub);

    toc.appendChild(li);
    h1LiMap.set(id, { li, sub });
  });

  // Nested TH items
  records
    .filter(r => r.type === "th" && r.parentH1Id && h1LiMap.has(r.parentH1Id))
    .forEach(({ id, title, parentH1Id }) => {
      const { sub } = h1LiMap.get(parentH1Id);
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.textContent = title;
      a.href = `#${id}`;
      li.appendChild(a);
      sub.appendChild(li);
    });

  // Remove empty submenus
  h1LiMap.forEach(({ sub }) => {
    if (!sub.children.length) sub.remove();
  });
});

/* ==== JS to toggle between fixed and sticky positioning on SCROLL ============ */

document.addEventListener("DOMContentLoaded", () => {
  const el = document.querySelector(".sidebar__right");
  if (!el) return;

  const STICK_AT = 20; // px scrolled before switching to 65px top
  const onScroll = () => el.classList.toggle("is-stuck", window.scrollY > STICK_AT);

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
});