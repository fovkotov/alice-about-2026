/**
 * Client-side password gate for static hosts (GitHub Pages).
 * Soft protection only — UX friction, not real auth.
 */
(function () {
  const COOKIE_NAME = "alice_gate";
  const COOKIE_TOKEN = "ok.v1";
  const STORAGE_KEY = "alice_gate";
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

  function isUnlocked() {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === COOKIE_TOKEN) return true;
    } catch (_) {}
    return readCookie(COOKIE_NAME) === COOKIE_TOKEN;
  }

  function persistUnlock() {
    try { sessionStorage.setItem(STORAGE_KEY, COOKIE_TOKEN); } catch (_) {}
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie =
      [COOKIE_NAME + "=" + COOKIE_TOKEN, "Path=/", "SameSite=Lax", "Max-Age=2592000"].join("; ") +
      secure;
  }

  function unlockDocument() {
    document.documentElement.classList.remove("gate-locked", "gate-pending");
    document.documentElement.classList.add("gate-open");
    const overlay = document.getElementById("alice-client-gate");
    if (overlay) overlay.remove();
  }

  function showError(form) {
    let err = form.querySelector(".err");
    if (!err) {
      err = document.createElement("p");
      err.className = "err";
      err.setAttribute("role", "alert");
      form.insertBefore(err, form.querySelector("button"));
    }
    err.textContent = "Неверный пароль";
  }

  function mountGate() {
    if (document.getElementById("alice-client-gate")) return;
    const overlay = document.createElement("div");
    overlay.id = "alice-client-gate";
    overlay.className = "alice-client-gate";
    overlay.innerHTML =
      '<form class="alice-client-gate-form" action="#" method="dialog" autocomplete="on">' +
      '<div class="alice-client-gate-mark" aria-hidden="true"></div>' +
      "<h1>Алиса AI</h1>" +
      '<p class="alice-client-gate-sub">about 2026</p>' +
      '<input type="password" name="password" placeholder="Пароль" autocomplete="current-password" autofocus required>' +
      '<button type="submit">Войти</button></form>';
    const form = overlay.querySelector("form");
    form.addEventListener("submit", function (event) {
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
    function attach() {
      document.body.appendChild(overlay);
      const input = overlay.querySelector('input[name="password"]');
      if (input) input.focus();
    }
    if (document.body) attach();
    else document.addEventListener("DOMContentLoaded", attach, { once: true });
  }

  if (isUnlocked()) unlockDocument();
  else {
    document.documentElement.classList.add("gate-locked");
    document.documentElement.classList.remove("gate-pending");
    mountGate();
  }
})();
