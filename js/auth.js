import { state } from "./state.js";
import { initDb } from "./db.js";
import { loadFavorites } from "./favorites.js";
import { loadNotes } from "./notes.js";
import { applyNow } from "./search-list.js";
import { syncModeUI, showMyListings } from "./list-modes.js";

/* АККАУНТЫ */
export async function refreshAuth() {
  if (!initDb()) return;
  const { data } = await state.db.auth.getUser();
  state.currentUser = data.user || null;
  renderAuthUI();
  await loadFavorites();
  await loadNotes();
}

export function renderAuthUI() {
  const box = document.getElementById("authBox");
  const myWrap = document.getElementById("myToggleWrap");
  if (state.currentUser) {
    box.innerHTML = `
      <div class="account-menu" id="accountMenu">
        <button class="account-trigger" id="accountTrigger">Личный кабинет <span class="account-caret">▾</span></button>
        <div class="account-dropdown" id="accountDropdown">
          <a class="account-item" id="menuCabinet" href="#">Кабинет</a>
          <a class="account-item account-item-logout" id="menuLogout" href="#">⏎ Выход</a>
        </div>
      </div>`;
    const menu = document.getElementById("accountMenu");
    document.getElementById("accountTrigger").addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.toggle("open");
    });
    document.getElementById("menuCabinet").addEventListener("click", (e) => {
      e.preventDefault();
      menu.classList.remove("open");
      showMyListings();
    });
    document.getElementById("menuLogout").addEventListener("click", (e) => {
      e.preventDefault();
      menu.classList.remove("open");
      logout();
    });
    myWrap.style.display = "flex";
  } else {
    box.innerHTML = `<button class="btn-add" style="background:#0a6dd6" id="btnLogin">Войти</button>`;
    document.getElementById("btnLogin").addEventListener("click", () => openAuth());
    myWrap.style.display = "none";
    document.getElementById("onlyMine").checked = false;
  }
}
export async function signIn() {
  if (!initDb()) return;
  const email = document.getElementById("a_email").value.trim();
  const pass = document.getElementById("a_pass").value;
  const msg = document.getElementById("authMsg");
  const { error } = await state.db.auth.signInWithPassword({ email, password: pass });
  if (error) { msg.className = "form-msg err"; msg.textContent = "Не удалось войти: " + error.message; return; }
  msg.className = "form-msg ok"; msg.textContent = "Вход выполнен.";
  await refreshAuth(); if (state.currentView === "search") applyNow();
  setTimeout(closeAuth, 700);
}
export async function signUp() {
  if (!initDb()) return;
  const email = document.getElementById("a_email").value.trim();
  const pass = document.getElementById("a_pass").value;
  const msg = document.getElementById("authMsg");
  if (pass.length < 6) { msg.className = "form-msg err"; msg.textContent = "Пароль минимум 6 символов."; return; }
  const { data, error } = await state.db.auth.signUp({ email, password: pass });
  if (error) { msg.className = "form-msg err"; msg.textContent = "Ошибка регистрации: " + error.message; return; }
  if (data.session) {
    msg.className = "form-msg ok"; msg.textContent = "Аккаунт создан, вы вошли.";
    await refreshAuth(); if (state.currentView === "search") applyNow();
    setTimeout(closeAuth, 700);
  } else {
    msg.className = "form-msg ok";
    msg.textContent = "Аккаунт создан. Проверь почту и подтверди email, потом войди.";
  }
}
export async function logout() {
  await state.db.auth.signOut();
  state.currentUser = null; renderAuthUI();
  state.favMode = false;
  state.myMode = false;
  document.getElementById("navFav").classList.remove("active");
  syncModeUI();
  await loadFavorites();
  await loadNotes();
  if (state.currentView === "search") applyNow();
}

export function openAuth(hint) {
  document.getElementById("authMsg").textContent = "";
  document.getElementById("authSub").textContent = hint || "Войди или создай аккаунт, чтобы подавать объявления.";
  document.getElementById("authOverlay").classList.add("open");
}
export function closeAuth() { document.getElementById("authOverlay").classList.remove("open"); }

// клик вне меню "Личный кабинет" — закрыть (меню каждый раз перерисовывается,
// поэтому слушатель один, глобальный, ищет элемент заново)
document.addEventListener("click", (e) => {
  const menu = document.getElementById("accountMenu");
  if (menu && !menu.contains(e.target)) menu.classList.remove("open");
});

document.getElementById("btnSignIn").addEventListener("click", signIn);
document.getElementById("btnSignUp").addEventListener("click", signUp);
document.getElementById("authClose").addEventListener("click", closeAuth);
document.getElementById("authOverlay").addEventListener("click", (e) => { if (e.target.id === "authOverlay") closeAuth(); });
