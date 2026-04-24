
document.addEventListener("DOMContentLoaded", () => {
  // Change this if blockquote id changes
  const DEFAULT_BQ_ID = "nameid";

  const LINK_SELECTOR = ".list__item .archive__item a[rel='permalink'], .list__item .archive__item a[href]";

  // Cache previews so fetch each page once
  const cache = new Map(); // url -> previewText

  // Track current hover + abort in-flight fetches when user moves away
  let activeLink = null;
  let activeAbort = null;

  // reuse  single floating teaser element 
  let teaser = document.getElementById("teaching-teaser");
  if (!teaser) {
    teaser = document.createElement("div");
    teaser.id = "teaching-teaser";
    teaser.setAttribute("role", "tooltip");
    teaser.setAttribute("aria-hidden", "true");
    teaser.style.cssText = `
      position: fixed;
      z-index: 9999;
      max-width: 420px;
      padding: 12px 14px;
      border: 1px solid #ddd;
      border-radius: 10px;
      background: #fff;
      box-shadow: 0 8px 22px rgba(0,0,0,0.12);
      opacity: 0;
      transform: translateY(6px);
      pointer-events: none;
      transition: opacity 120ms ease, transform 120ms ease;
      white-space: pre-wrap;
      font: 13px/1.35 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      color: #333;
    `;
    document.body.appendChild(teaser);
  }

  const GAP = 12;
  const PAD = 10;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  

  function showTeaser(text, linkEl) {
    teaser.innerHTML = `<b>Description: </b>${escapeHtml(text)}`;
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

  // retains symbols and spacing from original text
  function escapeHtml(str) {
    return (str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;")
      .replaceAll("\n", "<br>");
  }

  function positionTeaserNextToLink(linkEl) {
    const linkRect = linkEl.getBoundingClientRect();
    const teaserRect = teaser.getBoundingClientRect();

    let x = linkRect.right + GAP;
    let y = linkRect.top;

    // If it would overflow to the right, place it to the left
    if (x + teaserRect.width + PAD > window.innerWidth) {
      x = linkRect.left - GAP - teaserRect.width;
    }

    // Clamp to viewport
    x = clamp(x, PAD, window.innerWidth - teaserRect.width - PAD);
    y = clamp(y, PAD, window.innerHeight - teaserRect.height - PAD);

    teaser.style.left = `${x}px`;
    teaser.style.top = `${y}px`;
  }

  function normalizeText(s) {
    return (s || "").replace(/\s+/g, " ").trim();
  }

  function safeEscape(sel) {
    return (window.CSS && CSS.escape) ? CSS.escape(sel) : sel.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  async function fetchPreviewFromPage(url, bqId, signal) {
    if (cache.has(url)) return cache.get(url);

    const res = await fetch(url, { signal, cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch failed (${res.status})`);

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    // seek blockquote id, falls back to any blockquote
    const bq =
      doc.querySelector(`blockquote#${safeEscape(bqId)}`) ||
      doc.querySelector("blockquote[id]") ||
      doc.querySelector("blockquote");

    const text = bq ? normalizeText(bq.textContent) : "";
    cache.set(url, text);
    return text;
  }

  // Inject data-src/data-bqid onto matching links
  document.querySelectorAll(LINK_SELECTOR).forEach((a) => {
    const href = a.getAttribute("href");
    if (!href) return;
    a.dataset.src = new URL(href, window.location.href).toString();
    a.dataset.bqid = a.dataset.bqid || DEFAULT_BQ_ID;
  });

  //  Hover teaser (no excerpt injection) 
  document.addEventListener("mouseover", async (e) => {
    const a = e.target.closest(LINK_SELECTOR);
    if (!a) return;

    const url = a.dataset.src || new URL(a.getAttribute("href"), window.location.href).toString();
    const bqid = a.dataset.bqid || DEFAULT_BQ_ID;

    activeLink = a;

    // Cancel any previous fetch
    if (activeAbort) activeAbort.abort();
    activeAbort = new AbortController();

    try {
      const preview = await fetchPreviewFromPage(url, bqid, activeAbort.signal);
      if (activeAbort.signal.aborted) return;
      if (activeLink !== a) return;

      // If no preview, hide "No preview"
      if (!preview) {
        hideTeaser();
        return;
      }

      showTeaser(preview, a); // update + reposition
    } catch (err) {
      if (activeAbort.signal.aborted) return;
      if (activeLink !== a) return;
      hideTeaser();
    }
  });

  document.addEventListener("mouseout", (e) => {
    const a = e.target.closest(LINK_SELECTOR);
    if (!a) return;

    // If moving to an element still inside the same link, ignore
    if (a.contains(e.relatedTarget)) return;

    hideTeaser();
  });

  // Keep things tidy
  window.addEventListener("scroll", hideTeaser, { passive: true });
  window.addEventListener("resize", () => {
    const hovered = document.querySelector(`${LINK_SELECTOR}:hover`);
    if (hovered && teaser.getAttribute("aria-hidden") === "false") {
      positionTeaserNextToLink(hovered);
    }
  }, { passive: true });
});