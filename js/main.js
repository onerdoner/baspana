/* Точка входа: подключает все модули (каждый сам развешивает свои
   обработчики кнопок при импорте) и запускает приложение. */
import { state } from "./state.js";
import "./db.js";
import "./confirm-dialog.js";
import "./favorites.js";
import "./notes.js";
import "./auth.js";
import "./listings-query.js";
import "./map-instance.js";
import "./listing-detail.js";
import "./complex-page.js";
import "./hot-offers.js";
import "./search-list.js";
import "./search-view.js";
import "./list-modes.js";
import "./city-modal.js";
import "./submit-form.js";

import { refreshAuth } from "./auth.js";
import { loadAndOpenListing } from "./listing-detail.js";
import { showComplexPage } from "./complex-page.js";
import { deserializeFilters } from "./listings-query.js";
import { showSearchView, showHomeView } from "./search-view.js";

document.getElementById("logo").addEventListener("click", () => {
  if (state.currentView === "listing" || state.currentView === "complex") {
    location.href = location.pathname;
  } else if (state.currentView === "search" || state.currentView === "form") {
    showHomeView();
  }
});

/* СТАРТ */
// разбирает текущий URL и показывает нужный вид: страницу объявления
// (?listing=id), страницу ЖК (?complex=имя), поиск (?view=search&...) или главную
async function routeFromUrl() {
  const p = new URLSearchParams(location.search);
  const listingId = parseInt(p.get("listing"));
  const complexName = p.get("complex");
  if (listingId) {
    await loadAndOpenListing(listingId);
  } else if (complexName) {
    showComplexPage(complexName);
  } else if (p.get("view") === "search") {
    deserializeFilters(p);
    showSearchView(p.get("map") === "1");
  } else {
    showHomeView();
  }
}
async function start() {
  await refreshAuth();
  await routeFromUrl();
}
start();

window.addEventListener("popstate", routeFromUrl);
