import { state } from "./state.js";
import { showList, applyNow } from "./search-list.js";
import { navigateToSearch } from "./search-view.js";
import { openAuth } from "./auth.js";
import { clearFavorites } from "./favorites.js";

// показывает/прячет жёлтую панель фильтров, сорт-бар и элементы "Избранного"
// в зависимости от текущего режима (обычный поиск / Избранное / Мои объявления)
export function syncModeUI() {
  document.querySelector(".filters").style.display = (state.favMode || state.myMode) ? "none" : "";
  document.getElementById("sortBar").style.display = (state.favMode || state.myMode) ? "none" : "";
  document.getElementById("btnClearFav").style.display = state.favMode ? "" : "none";
  document.getElementById("favTabs").style.display = state.favMode ? "" : "none";
}

// "Кабинет" — показывает объявления текущего пользователя (в стиле "Избранное",
// но без своего переключателя в шапке — открывается только из меню профиля)
export function showMyListings() {
  if (!state.currentUser) { openAuth("Войди, чтобы смотреть свои объявления."); return; }
  state.favMode = false;
  state.myMode = true;
  document.getElementById("navFav").classList.remove("active");
  document.getElementById("navSale").classList.remove("active");
  document.getElementById("navRent").classList.remove("active");
  // showSearchView()/showList() сами возвращают панель фильтров видимой — прячем её после них
  if (state.currentView === "search") { showList(); applyNow(); }
  else navigateToSearch(false);
  syncModeUI();
}

document.getElementById("navFav").addEventListener("click", () => {
  if (!state.currentUser) { openAuth("Войди, чтобы смотреть избранное."); return; }
  state.favMode = !state.favMode;
  state.myMode = false;
  document.getElementById("navFav").classList.toggle("active", state.favMode);
  document.getElementById("navSale").classList.toggle("active", !state.favMode && state.activeDeal === "sale");
  document.getElementById("navRent").classList.toggle("active", !state.favMode && state.activeDeal === "rent");
  if (state.currentView === "search") { showList(); applyNow(); }
  else navigateToSearch(false);
  syncModeUI();
});

document.getElementById("btnClearFav").addEventListener("click", clearFavorites);
document.querySelectorAll("#favTabs .fav-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#favTabs .fav-tab").forEach(b => b.classList.toggle("on", b === btn));
  });
});
