// For each .panel, set a per-panel CSS variable --imgheight equal to
// the rendered height of that panel's <img>, so its .mask can do:
// .mask { height: var(--imgheight); }
document.addEventListener("DOMContentLoaded", () => {
  const panels = document.querySelectorAll(".panel");
  if (!panels.length) return;

  panels.forEach((panel) => {
    const img = panel.querySelector("img");
    if (!img) return;

    const update = () => {
      const h = img.getBoundingClientRect().height; // rendered px height
      if (h > 0) panel.style.setProperty("--imgheight", `${h}px`);
    };

    const bindObservers = () => {
      update();

      // Keep in sync if the image/panel resizes (responsive layouts)
      if ("ResizeObserver" in window) {
        const ro = new ResizeObserver(update);
        ro.observe(img);
      } else {
        // Fallback: update on window resize
        window.addEventListener("resize", update, { passive: true });
      }
    };

    // Wait for image to load if needed (handles cached vs not cached)
    if (img.complete) bindObservers();
    else img.addEventListener("load", bindObservers, { once: true });
  });
});
