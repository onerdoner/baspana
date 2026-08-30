import { state } from "./state.js";
import { escapeHtml } from "./format.js";

// показывает страницу ЖК (пока пустую — своих данных о комплексах ещё нет)
export function showComplexPage(name) {
  state.currentView = "complex";
  document.querySelector(".filters").style.display = "none";
  document.getElementById("hotSection").style.display = "none";
  document.getElementById("searchContent").style.display = "none";
  document.getElementById("detail").classList.remove("open");
  document.getElementById("navSale").classList.remove("active");
  document.getElementById("navRent").classList.remove("active");
  document.getElementById("navFav").classList.remove("active");
  document.getElementById("complexTitle").textContent = "ЖК " + name;
  document.getElementById("complexBreadcrumbs").innerHTML = `
    <a href="${location.pathname}">baspana.kz</a>
    <span>/</span>
    <span>ЖК ${escapeHtml(name)}</span>`;
  document.getElementById("complexPage").classList.add("open");
  window.scrollTo(0, 0);
}
// переход на страницу ЖК той же вкладкой (клик по "Жилой комплекс" в объявлении)
export function navigateToComplex(name) {
  history.pushState({ view: "complex", complex: name }, "", location.pathname + "?complex=" + encodeURIComponent(name));
  showComplexPage(name);
}
