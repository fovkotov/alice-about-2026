// Phone width-fit: uniform scale of the fixed 375px artboard to the device
// width. Desktop stage (812px / unscaled) is handled in CSS media query —
// clear any inline --fit-scale there so it cannot override --fit-scale: 1.
(function () {
  const PAGE_W = 375;
  const DESKTOP_MQ = "(min-width: 600px) and (hover: hover) and (pointer: fine)";
  const root = document.documentElement;

  const applyFitScale = () => {
    if (window.matchMedia(DESKTOP_MQ).matches) {
      root.style.removeProperty("--fit-scale");
      return;
    }
    // clientWidth excludes scrollbars (unlike 100vw). Prefer it to avoid
    // a horizontal overflow scrollbar feeding back into scale.
    let width = root.clientWidth || window.innerWidth || PAGE_W;
    const vv = window.visualViewport;
    // At default zoom only: some mobile browsers report a tighter visual
    // width than the layout viewport. Ignore pinch-zoom (vv.scale ≠ 1).
    if (vv && Math.abs(vv.scale - 1) < 0.02 && vv.width > 0) {
      width = Math.min(width, vv.width);
    }
    root.style.setProperty("--fit-scale", String(width / PAGE_W));
  };

  applyFitScale();
  window.addEventListener("resize", applyFitScale);
  window.addEventListener("orientationchange", applyFitScale);
  window.matchMedia(DESKTOP_MQ).addEventListener("change", applyFitScale);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", applyFitScale);
  }
})();

// Shared with sheet openers: true after a horizontal news-row drag.
let newsRowDragged = false;

const row = document.querySelector(".news-row");
if (row) {
  let dragging = false;
  let startX = 0;
  let startLeft = 0;
  let pointerId = null;
  let captured = false;

  row.addEventListener("pointerdown", (event) => {
    if (event.button != null && event.button !== 0) return;
    dragging = true;
    newsRowDragged = false;
    captured = false;
    pointerId = event.pointerId;
    startX = event.clientX;
    startLeft = row.scrollLeft;
    // Do not capture yet — early setPointerCapture on the row swallows
    // subsequent click events on nested button/link cards (Pin sheet).
  });

  row.addEventListener("pointermove", (event) => {
    if (!dragging || event.pointerId !== pointerId) return;
    const dx = event.clientX - startX;
    if (Math.abs(dx) <= 4) return;
    // Mouse/pen: take over scrolling once the gesture is clearly a drag.
    if (event.pointerType !== "touch") {
      newsRowDragged = true;
      if (!captured) {
        captured = true;
        try {
          row.setPointerCapture(event.pointerId);
        } catch (_) {
          /* ignore */
        }
      }
      row.scrollLeft = startLeft - dx;
      return;
    }
    // Touch keeps native overflow scroll. Only mark a drag after a clear
    // horizontal pan — tap jitter must not block Alice link navigation.
    if (Math.abs(dx) > 12) newsRowDragged = true;
  });

  const stop = (event) => {
    if (pointerId != null && event.pointerId !== pointerId) return;
    dragging = false;
    pointerId = null;
    captured = false;
  };
  row.addEventListener("pointerup", stop);
  row.addEventListener("pointercancel", stop);

  // Capture phase: after a drag, block both link navigation and Pin sheet open.
  row.addEventListener(
    "click",
    (event) => {
      if (!newsRowDragged) return;
      const card = event.target.closest(".news-card");
      if (!card || !row.contains(card)) return;
      event.preventDefault();
      event.stopPropagation();
      newsRowDragged = false;
    },
    true
  );

  // Tolstoy / Doctor / Rights: open Alice on a clear tap (same pattern as Pin).
  // Does not touch .news-card.pin — that stays on the sheet opener below.
  for (const link of row.querySelectorAll("a.news-card")) {
    let tap = null;
    let opened = false;
    link.addEventListener("pointerdown", (event) => {
      if (event.button != null && event.button !== 0) return;
      opened = false;
      tap = { id: event.pointerId, x: event.clientX, y: event.clientY };
    });
    link.addEventListener("pointerup", (event) => {
      if (!tap || event.pointerId !== tap.id) return;
      const dx = event.clientX - tap.x;
      const dy = event.clientY - tap.y;
      tap = null;
      if (newsRowDragged) return;
      if (Math.hypot(dx, dy) > 6) return;
      const href = link.getAttribute("href");
      if (!href) return;
      opened = true;
      window.open(href, "_blank", "noopener,noreferrer");
    });
    link.addEventListener("pointercancel", () => {
      tap = null;
    });
    link.addEventListener("click", (event) => {
      if (newsRowDragged) {
        event.preventDefault();
        return;
      }
      // pointerup already opened a tab — avoid a second one from click.
      if (opened) {
        event.preventDefault();
        opened = false;
      }
      // Keyboard activation: no pointerup open → native <a target=_blank> works.
    });
  }
}

const studio = document.querySelector(".studio");
const studioCard = studio?.querySelector(".tilt.center");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (studio && !reduceMotion) {
  const reveal = () => studio.classList.add("cards-in");
  const reset = () => studio.classList.remove("cards-in");
  if (studioCard && "IntersectionObserver" in window) {
    // Replay bounce every leave → re-enter: reset when fully out, reveal at ~50% in view.
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          reveal();
        } else if (!entry.isIntersecting) {
          reset();
        }
      }
    }, { threshold: [0, 0.5] });
    observer.observe(studioCard);
  } else {
    reveal();
  }
}

const welcome = document.querySelector(".tasks .task-card .welcome");
const chips = welcome?.querySelector(".chips");
if (chips && !reduceMotion) {
  chips.classList.add("chips-staged");
  const playChips = () => chips.classList.add("chips-play");
  const resetChips = () => chips.classList.remove("chips-play");
  const chipTarget = welcome || chips;
  if ("IntersectionObserver" in window) {
    // Replay fly-in every leave → re-enter: reset when fully out, play at ~50% in view.
    const chipObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          playChips();
        } else if (!entry.isIntersecting) {
          resetChips();
        }
      }
    }, { threshold: [0, 0.5] });
    chipObserver.observe(chipTarget);
  } else {
    playChips();
  }
}

const taskPlate = document.querySelector(".memory-card");
if (taskPlate) {
  const toggleTask = () => {
    const checked = taskPlate.getAttribute("aria-checked") === "true";
    taskPlate.setAttribute("aria-checked", checked ? "false" : "true");
  };
  taskPlate.addEventListener("click", toggleTask);
  taskPlate.addEventListener("keydown", (event) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    toggleTask();
  });
}

(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const scaler = document.querySelector(".scaler");
  const DISMISS_PX = 72;
  const FLICK = 0.45;
  let lockCount = 0;
  let scrollY = 0;
  let scalerTop = 0;

  const lockPage = () => {
    if (lockCount === 0) {
      scrollY = window.scrollY;
      scalerTop = scaler ? scaler.scrollTop : 0;
      document.documentElement.classList.add("sheet-lock");
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      if (scaler) scaler.style.overflow = "hidden";
    }
    lockCount += 1;
  };

  const unlockPage = () => {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount > 0) return;
    document.documentElement.classList.remove("sheet-lock");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    if (scaler) scaler.style.overflow = "";
    window.scrollTo(0, scrollY);
    if (scaler) scaler.scrollTop = scalerTop;
  };

  const bindSheet = (root, openTriggers) => {
    if (!root) return null;
    const stack = root.querySelector(".sheet-stack");
    const backdrop = root.querySelector(".sheet-backdrop");
    const panel = root.querySelector(".sheet-panel");
    const body = root.querySelector(".sheet-body");
    const grabber = root.querySelector(".sheet-grabber");
    if (!stack || !backdrop || !panel || !body || !grabber) return null;

    let open = false;
    let drag = null;
    let hideTimer = 0;

    const animate = (on) => {
      const use = on && !reduce.matches;
      stack.classList.toggle("is-anim", use);
      backdrop.classList.toggle("is-anim", use);
    };

    const place = (y, opacity) => {
      stack.style.transform = `translateY(${y}px)`;
      backdrop.style.opacity = String(opacity);
    };

    const finishHide = () => {
      window.clearTimeout(hideTimer);
      root.classList.remove("is-on");
      root.setAttribute("aria-hidden", "true");
      root.inert = true;
      animate(false);
      place(window.innerHeight, 0);
      unlockPage();
      open = false;
    };

    const openSheet = () => {
      if (open) return;
      window.clearTimeout(hideTimer);
      open = true;
      body.scrollTop = 0;
      lockPage();
      root.inert = false;
      root.classList.add("is-on");
      root.setAttribute("aria-hidden", "false");
      animate(false);
      place(window.innerHeight, 0);
      stack.getBoundingClientRect();
      animate(true);
      place(0, 1);
      panel.focus({ preventScroll: true });
    };

    const closeSheet = () => {
      if (!open && !root.classList.contains("is-on")) return;
      open = false;
      if (reduce.matches) {
        finishHide();
        return;
      }
      animate(true);
      place(window.innerHeight, 0);
      hideTimer = window.setTimeout(finishHide, 300);
    };

    stack.addEventListener("transitionend", (event) => {
      if (event.target !== stack || event.propertyName !== "transform") return;
      if (!open) finishHide();
    });

    for (const trigger of openTriggers) {
      if (!trigger) continue;
      // Click for mouse/keyboard; pointerup as fallback when a parent
      // scroll-row would otherwise swallow the synthesized click.
      trigger.addEventListener("click", (event) => {
        if (newsRowDragged) {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        openSheet();
      });

      if (!trigger.classList.contains("pin")) continue;
      let tap = null;
      trigger.addEventListener("pointerdown", (event) => {
        if (event.button != null && event.button !== 0) return;
        tap = { id: event.pointerId, x: event.clientX, y: event.clientY };
      });
      trigger.addEventListener("pointerup", (event) => {
        if (!tap || event.pointerId !== tap.id) return;
        const dx = event.clientX - tap.x;
        const dy = event.clientY - tap.y;
        tap = null;
        if (newsRowDragged) return;
        if (Math.hypot(dx, dy) > 6) return;
        event.preventDefault();
        openSheet();
      });
      trigger.addEventListener("pointercancel", () => {
        tap = null;
      });
    }

    backdrop.addEventListener("click", () => {
      closeSheet();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && root.classList.contains("is-on")) closeSheet();
    });

    grabber.addEventListener("pointerdown", (event) => {
      if (!root.classList.contains("is-on")) return;
      if (event.button != null && event.button !== 0) return;
      drag = {
        id: event.pointerId,
        startY: event.clientY,
        lastY: event.clientY,
        lastT: performance.now(),
        velocity: 0,
        y: 0,
      };
      animate(false);
      grabber.setPointerCapture(event.pointerId);
    });

    grabber.addEventListener("pointermove", (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const now = performance.now();
      const dt = Math.max(1, now - drag.lastT);
      drag.velocity = (event.clientY - drag.lastY) / dt;
      drag.lastY = event.clientY;
      drag.lastT = now;
      const y = Math.max(0, event.clientY - drag.startY);
      drag.y = y;
      const travel = Math.max(stack.offsetHeight, 1);
      place(y, Math.max(0, 1 - y / travel));
    });

    const endDrag = (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const { y, velocity } = drag;
      drag = null;
      const flick = velocity > FLICK && y > 16;
      if (y > DISMISS_PX || flick) closeSheet();
      else {
        open = true;
        animate(true);
        place(0, 1);
      }
    };

    grabber.addEventListener("pointerup", endDrag);
    grabber.addEventListener("pointercancel", endDrag);

    root.inert = true;
    return { open: openSheet, close: closeSheet };
  };

  bindSheet(document.querySelector('[data-sheet="welcome"]'), [
    document.querySelector(".task-card"),
  ]);
  bindSheet(document.querySelector('[data-sheet="pin"]'), [
    document.querySelector(".news-card.pin"),
  ]);
})();

const memoryPlate = document.querySelector(".memory-widget");
if (memoryPlate) {
  memoryPlate.addEventListener("click", () => {
    const pressed = memoryPlate.getAttribute("aria-pressed") === "true";
    memoryPlate.setAttribute("aria-pressed", pressed ? "false" : "true");
  });
}

(function () {
  const hello = document.querySelector(".hello");
  const rest = hello?.querySelector(".hello-rest");
  if (!hello || !rest) return;

  // Exact remainder after «привет!» — keep copy unchanged.
  const REST = " я алиса ai — нейросеть яндекса для ваших задач";
  // animate-text typewriter.json showcase.timing.enter stagger (speed_multiplier 0.72)
  const ENTER_STAGGER_MS = 33;
  // Same moment as .hello bubble-pop delay
  const START_MS = 120;

  const fillRest = () => {
    rest.textContent = REST;
    rest.removeAttribute("aria-hidden");
  };

  const runTypewriter = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      fillRest();
      return;
    }

    // Append visible glyphs only — never park opacity:0 / hidden chars in the
    // DOM (they still take layout and race the bubble ahead of the typewriter).
    const units = Array.from(REST);
    units.forEach((ch, index) => {
      window.setTimeout(() => {
        rest.appendChild(document.createTextNode(ch));
      }, START_MS + index * ENTER_STAGGER_MS);
    });
  };

  // Do not start while the password gate is up — wait for gate.js unlock.
  const root = document.documentElement;
  if (root.classList.contains("gate-open")) {
    runTypewriter();
    return;
  }

  let started = false;
  let observer = null;
  const startOnce = () => {
    if (started) return;
    started = true;
    document.removeEventListener("alice-gate-open", startOnce);
    if (observer) observer.disconnect();
    runTypewriter();
  };

  document.addEventListener("alice-gate-open", startOnce, { once: true });
  observer = new MutationObserver(() => {
    if (root.classList.contains("gate-open")) startOnce();
  });
  observer.observe(root, { attributes: true, attributeFilter: ["class"] });
})();
