/* ==========================================================================
   Custom script portolio page
   ========================================================================== */
//Script to inject id = header's text content, to allow for toc functionality, creates list elements, then orders the toc based on order of appearance in document
    // Run after DOM is ready (safe whether script is in <head> or end of <body>)
(function ready(fn) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
  else fn();
})(function () {
  const archive = document.querySelector(".archive");
  if (!archive) return;

  // condenses header content
  function makeIdFromText(txt) {
    return txt
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "")          // remove whitespace
      .replace(/[^a-z0-9_-]/g, ""); // remove non-id-friendly chars
  }

  // Create ids on all h2s inside .archive (in document order)
  const h2s = archive.querySelectorAll("h2"); 
  const used = new Set();
  const headers = [];

  h2s.forEach((h2) => {
    const title = (h2.textContent || "").trim();
    const base = makeIdFromText(title);
    let id = base || "h2";

    let n = 2;
    while (used.has(id) || document.getElementById(id)) {
      id = `${base || "h2"}${n++}`;
    }

    h2.id = id;
    used.add(id);
    headers.push({ id, title });
  });

  // Reorder TOC li items to match h2 order
  const toc = document.querySelector('ul.toc__menu#markdown-toc');
  if (!toc) return;

  const norm = (s) => (s || "").trim().replace(/\s+/g, " ").toLowerCase();

  // Index existing li by href target and by link text
  const byHref = new Map();
  const byText = new Map();
  const allLis = Array.from(toc.querySelectorAll(":scope > li"));

  allLis.forEach((li) => {
    const a = li.querySelector("a");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    const target = href.startsWith("#") ? href.slice(1) : "";
    if (target) byHref.set(target, li);
    byText.set(norm(a.textContent), li);
  });

  const usedLis = new Set();
  const frag = document.createDocumentFragment();

  headers.forEach(({ id, title }) => {
    let li = byHref.get(id) || byText.get(norm(title));

    if (!li) {
      // create li if a matching li doesn't exist 
      li = document.createElement("li");
      const a = document.createElement("a");
      a.textContent = title;
      a.href = `#${id}`;
      li.appendChild(a);
    } else {
      // Ensure the matching li points to the new id
      const a = li.querySelector("a");
      if (a) {
        a.href = `#${id}`;
        // keep TOC text synced to the header text
        a.textContent = title;
      }
    }

    usedLis.add(li);
    frag.appendChild(li); // appending moves existing nodes into the new order
  });

  // Append any extra TOC li that didn't match a header
  allLis.forEach((li) => {
    if (!usedLis.has(li)) frag.appendChild(li);
  });

  toc.innerHTML = "";
  toc.appendChild(frag);
});