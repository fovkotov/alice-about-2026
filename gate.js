/**
 * Client-side password gate for static hosts (GitHub Pages / plain static).
 *
 * Soft protection only: HTML/JS source is public, so this is UX friction, not
 * real auth. Vercel uses middleware.js (server gate + HttpOnly cookie) — this
 * script skips when that host already delivered the page past the server gate.
 */
(function () {
  const COOKIE_NAME = "alice_gate";
  const COOKIE_TOKEN = "ok.v1";
  const STORAGE_KEY = "alice_gate";
  // Same shared unlock word as middleware.js — visible in source on static hosts.
  const PASSWORD = "alice";

  function readCookie(name) {
    const raw = document.cookie || "";
    for (const part of raw.split(";")) {
      const trimmed = part.trim();
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      if (trimmed.slice(0, eq) === name) return trimmed.slice(eq + 1);
    }
    return "";
  }

  function hasUnlockFlag() {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === COOKIE_TOKEN) return true;
    } catch {
      /* private mode */
    }
    return readCookie(COOKIE_NAME) === COOKIE_TOKEN;
  }

  /** Vercel middleware already blocked ungated HTML; cookie is HttpOnly there. */
  function isServerGatedHost() {
    const host = location.hostname;
    return host === "alice-about-2026.vercel.app" || /\.vercel\.app$/i.test(host);
  }

  function isUnlocked() {
    return hasUnlockFlag() || isServerGatedHost();
  }

  function persistUnlock() {
    try {
      sessionStorage.setItem(STORAGE_KEY, COOKIE_TOKEN);
    } catch {
      /* ignore */
    }
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie =
      [
        `${COOKIE_NAME}=${COOKIE_TOKEN}`,
        "Path=/",
        "SameSite=Lax",
        "Max-Age=2592000",
      ].join("; ") + secure;
  }

  function unlockDocument() {
    const root = document.documentElement;
    root.classList.remove("gate-locked", "gate-pending");
    root.classList.add("gate-open");
    const overlay = document.getElementById("alice-client-gate");
    if (overlay) overlay.remove();
  }

  function showError(form) {
    let err = form.querySelector(".err");
    if (!err) {
      err = document.createElement("p");
      err.className = "err";
      err.setAttribute("role", "alert");
      const btn = form.querySelector("button");
      form.insertBefore(err, btn);
    }
    err.textContent = "Неверный пароль";
  }

  function mountGate() {
    if (document.getElementById("alice-client-gate")) return;

    const overlay = document.createElement("div");
    overlay.id = "alice-client-gate";
    overlay.className = "alice-client-gate";
    overlay.innerHTML = `
      <form class="alice-client-gate-form" action="#" method="dialog" autocomplete="on">
        <div class="alice-client-gate-mark" aria-hidden="true"></div>
        <h1>Алиса AI</h1>
        <p class="alice-client-gate-sub">about 2026</p>
        <input type="password" name="password" placeholder="Пароль" autocomplete="current-password" autofocus required>
        <button type="submit">Войти</button>
      </form>
    `;

    const form = overlay.querySelector("form");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = form.querySelector('input[name="password"]');
      const value = input ? String(input.value || "") : "";
      if (value === PASSWORD) {
        persistUnlock();
        unlockDocument();
        return;
      }
      showError(form);
      if (input) {
        input.value = "";
        input.focus();
      }
    });

    const attach = () => {
      document.body.appendChild(overlay);
      const input = overlay.querySelector('input[name="password"]');
      if (input) input.focus();
    };

    if (document.body) attach();
    else document.addEventListener("DOMContentLoaded", attach, { once: true });
  }

  function boot() {
    if (isUnlocked()) {
      // Do not write alice_gate here on Vercel — middleware already set HttpOnly.
      unlockDocument();
      return;
    }

    document.documentElement.classList.add("gate-locked");
    document.documentElement.classList.remove("gate-pending");
    mountGate();
  }

  boot();
})();
