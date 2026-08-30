import { state } from "./state.js";
import { CITIES, COMPLEXES } from "./config.js";
import { showList, showMap, applyNow } from "./search-list.js";
import { serializeFilters, buildQuery } from "./listings-query.js";
import { initDb } from "./db.js";
import { loadHotOffers } from "./hot-offers.js";
import { map } from "./map-instance.js";
import { syncModeUI } from "./list-modes.js";

/* =========================================================
   ДВУХСТРАНИЧНАЯ НАВИГАЦИЯ
   ========================================================= */
export function showHomeView() {
  state.currentView = "home";
  // На случай перехода со страницы объявления/формы подачи — возвращаем панель фильтров, прячем их
  document.querySelector(".filters").style.display = "";
  document.getElementById("detail").classList.remove("open");
  document.getElementById("formCategory").classList.remove("open");
  document.getElementById("formPage").classList.remove("open");
  document.getElementById("complexPage").classList.remove("open");
  // Переключатель Купить/Арендовать — виден только на главной
  document.getElementById("deal").style.display = "";
  // Скрываем поисковые метки
  document.querySelectorAll(".fls-prefix,.fls-suffix,.fls-tg").forEach(el => el.style.display = "none");
  positionRentPeriod();
  // Восстанавливаем подпись цены
  document.getElementById("priceLabel").textContent = "Цена, ₸";
  // Показываем Найти / На карте
  document.getElementById("btnResults").style.display = "";
  document.getElementById("btnMapInline").style.display = "";
  // Убираем search-класс с первой строки
  document.getElementById("filterRow1").classList.remove("filter-row-search");
  // Возвращаем галочки обратно в тёмную зону как отдельную строку
  const darkZone = document.querySelector(".filter-dark-zone");
  const checks = document.getElementById("filterRowChecks");
  darkZone.appendChild(checks);
  checks.style.display = "";
  // Скрываем светлую зону
  document.getElementById("filterZoneLight").style.display = "none";
  // Сбрасываем «Ещё настройки»
  document.getElementById("filterMore").style.display = "none";
  document.getElementById("btnMoreSettings").textContent = "⊞ Ещё настройки ▾";
  // Показываем витрину
  document.getElementById("hotSection").style.display = "";
  document.getElementById("searchContent").style.display = "none";
  history.pushState({ view: "home" }, "", location.pathname);
  loadHotOffers();
}

export function showSearchView(mapMode) {
  state.currentView = "search";
  // На случай перехода со страницы объявления/формы подачи — возвращаем панель фильтров, прячем их
  document.querySelector(".filters").style.display = "";
  document.getElementById("detail").classList.remove("open");
  document.getElementById("formCategory").classList.remove("open");
  document.getElementById("formPage").classList.remove("open");
  document.getElementById("complexPage").classList.remove("open");
  // Скрываем переключатель Купить/Арендовать
  document.getElementById("deal").style.display = "none";
  // Показываем поисковые метки ("Квартиры" — только для Продажи, у Аренды на этом месте период)
  document.querySelectorAll(".fls-prefix,.fls-suffix,.fls-tg").forEach(el => el.style.display = "");
  document.querySelector(".fls-prefix").style.display = state.activeDeal === "rent" ? "none" : "";
  positionRentPeriod();
  // Меняем подпись цены
  document.getElementById("priceLabel").textContent = "Цена";
  // Скрываем Найти / На карте
  document.getElementById("btnResults").style.display = "none";
  document.getElementById("btnMapInline").style.display = "none";
  // Добавляем search-класс первой строке (разрешает перенос галочек)
  document.getElementById("filterRow1").classList.add("filter-row-search");
  // Встраиваем галочки в конец строки 1 через display:contents
  const row1 = document.getElementById("filterRow1");
  const checks = document.getElementById("filterRowChecks");
  row1.appendChild(checks);
  checks.style.display = "contents";
  // Показываем светлую зону
  document.getElementById("filterZoneLight").style.display = "";
  // Показываем результаты поиска
  document.getElementById("hotSection").style.display = "none";
  document.getElementById("searchContent").style.display = "flex";
  if (mapMode) showMap(); else showList();
  applyNow();
  updateCount();
}

export function navigateToSearch(mapMode) {
  const p = serializeFilters();
  if (mapMode) p.set("map", "1");
  history.pushState({ view: "search" }, "", "?" + p.toString());
  showSearchView(mapMode);
}

/* ПЕРЕКЛЮЧЕНИЕ ТИПА СДЕЛКИ */
// переставляет общие поля (ЖК, площадь, этаж, чекбоксы этажа, поиск по тексту)
// между сеткой Продажи и сеткой Аренды — сами элементы не пересоздаются,
// просто переезжают в нужный контейнер (как и filterRowChecks выше).
export function layoutFiltersForDeal(d) {
  const rowComplex = document.getElementById("rowComplex");
  const rowArea = document.getElementById("rowArea");
  const rowKitchen = document.getElementById("rowKitchen");
  const rowFloor = document.getElementById("rowFloor");
  const rowNoFirst = document.getElementById("rowNoFirst");
  const rowNoLast = document.getElementById("rowNoLast");
  const rowTextSearch = document.getElementById("rowTextSearch");
  if (d === "rent") {
    document.getElementById("rentCol1").append(rowComplex, rowArea);
    document.getElementById("rentCol2").append(rowFloor, rowNoFirst, rowNoLast);
    document.getElementById("rentTextWrap").append(rowTextSearch);
  } else {
    document.getElementById("saleCol1").append(rowComplex);
    document.getElementById("saleCol3").insertBefore(rowArea, rowKitchen);
    document.getElementById("saleCol2").append(rowFloor, rowNoLast, rowNoFirst);
    document.getElementById("filterMore").append(rowTextSearch);
  }
}

// переставляет период аренды в начало строки на странице поиска (как на krisha.kz);
// на главной остаётся на обычном месте — перед ценой
export function positionRentPeriod() {
  const rentOnly = document.getElementById("rentOnly");
  const row1 = document.getElementById("filterRow1");
  const priceLabelEl = document.getElementById("priceLabel");
  if (state.currentView === "search" && state.activeDeal === "rent") {
    row1.insertBefore(rentOnly, row1.firstChild);
  } else {
    row1.insertBefore(rentOnly, priceLabelEl);
  }
}

// всё, что зависит только от типа сделки (не от текущего вида страницы)
export function applyDealVisibility(d) {
  document.getElementById("rentOnly").style.display = d === "rent" ? "inline-flex" : "none";
  document.querySelectorAll(".sale-only").forEach(el => el.style.display = d === "rent" ? "none" : "");
  document.getElementById("filterExtended").style.display = d === "rent" ? "none" : "";
  document.getElementById("filterExtendedRent").style.display = d === "rent" ? "" : "none";
  document.getElementById("rentTextWrap").style.display = d === "rent" ? "" : "none";
  document.getElementById("btnMoreSettings").style.display = d === "rent" ? "none" : "";
  document.getElementById("filterMore").style.display = "none";
  document.getElementById("btnMoreSettings").textContent = "⊞ Ещё настройки ▾";
  layoutFiltersForDeal(d);
}

export function setDeal(d) {
  state.activeDeal = d;
  state.favMode = false;
  state.myMode = false;
  document.getElementById("navFav").classList.remove("active");
  syncModeUI();
  document.querySelectorAll("#deal button").forEach(b => b.classList.toggle("on", b.dataset.d === d));
  document.getElementById("navSale").classList.toggle("active", d === "sale");
  document.getElementById("navRent").classList.toggle("active", d === "rent");
  applyDealVisibility(d);
  if (state.currentView === "search") {
    document.querySelector(".fls-prefix").style.display = d === "rent" ? "none" : "";
  }
  positionRentPeriod();
  document.getElementById("priceFrom").value = "";
  document.getElementById("priceTo").value = "";
  updateCount();
}

/* ДИНАМИЧЕСКИЙ СЧЁТЧИК КНОПКИ "Показать результаты" */
let _countTimer = null;
export async function updateCount() {
  if (state.currentView !== "search" || !initDb()) return;
  const { count } = await buildQuery(
    state.db.from("listings").select("*", { count: "exact", head: true })
  );
  const btn = document.getElementById("btnApply");
  btn.textContent = count !== null
    ? `Показать результаты (${count.toLocaleString("ru-RU")})`
    : "Показать результаты";
}
export function scheduleCount() {
  clearTimeout(_countTimer);
  _countTimer = setTimeout(updateCount, 250);
}

// заполняет выпадающий список районов для выбранного города
export function fillDistricts(selectEl, city, withAll) {
  selectEl.innerHTML = withAll ? '<option value="">Все районы</option>' : "";
  Object.keys(CITIES[city].districts).forEach(d => {
    const o = document.createElement("option"); o.value = d; o.textContent = d;
    selectEl.appendChild(o);
  });
}

// заполняет список ЖК для выбранного города (и в фильтре, и в форме подачи)
const complexFilter = document.getElementById("complex");
const complexForm = document.getElementById("f_complex");
export function fillComplexes(city) {
  complexFilter.innerHTML = '<option value=""></option><option value="any">Любой ЖК</option>';
  complexForm.innerHTML = '<option value="">— не указан —</option>';
  (COMPLEXES[city] || []).forEach(name => {
    const o1 = document.createElement("option"); o1.value = name; o1.textContent = name; complexFilter.appendChild(o1);
    const o2 = document.createElement("option"); o2.value = name; o2.textContent = name; complexForm.appendChild(o2);
  });
}

// селект города в фильтрах
export const cityNames = Object.keys(CITIES);
export const citySel = document.getElementById("city");
export const districtSel = document.getElementById("district");
cityNames.forEach(c => { const o = document.createElement("option"); o.value = c; o.textContent = c; citySel.appendChild(o); });
citySel.value = "Алматы";
fillDistricts(districtSel, "Алматы", true);
fillComplexes("Алматы");
citySel.addEventListener("change", () => {
  fillDistricts(districtSel, citySel.value, true);
  fillComplexes(citySel.value);
  const c = CITIES[citySel.value];
  map.setView(c.center, c.zoom);
});

/* КНОПКИ И ПОЛЯ */
document.querySelectorAll("#deal button").forEach(btn => btn.addEventListener("click", () => setDeal(btn.dataset.d)));
document.getElementById("navSale").addEventListener("click", () => { setDeal("sale"); showHomeView(); });
document.getElementById("navRent").addEventListener("click", () => { setDeal("rent"); showHomeView(); });

document.querySelectorAll("#sortBar button").forEach(btn => {
  btn.addEventListener("click", () => {
    state.sortBy = btn.dataset.sort;
    document.querySelectorAll("#sortBar button").forEach(b => b.classList.toggle("on", b === btn));
    applyNow();
  });
});

document.querySelectorAll("#rooms button").forEach(btn => {
  btn.addEventListener("click", () => {
    const r = +btn.dataset.r;
    btn.classList.toggle("on");
    if (state.activeRooms.includes(r)) state.activeRooms = state.activeRooms.filter(x => x !== r);
    else state.activeRooms.push(r);
    if (state.currentView === "search") updateCount();
  });
});

// Счётчик: изменение фильтров → обновить число в кнопке
const _filtersEl = document.querySelector(".filters");
_filtersEl.addEventListener("change", () => { if (state.currentView === "search") updateCount(); });
_filtersEl.addEventListener("input", e => {
  if (state.currentView === "search" && e.target.tagName === "INPUT") scheduleCount();
});

document.getElementById("btnResults").addEventListener("click", () => navigateToSearch(false));
document.getElementById("btnApply").addEventListener("click", applyNow);
document.getElementById("btnMoreSettings").addEventListener("click", () => {
  const more = document.getElementById("filterMore");
  const btn = document.getElementById("btnMoreSettings");
  const visible = more.style.display !== "none";
  more.style.display = visible ? "none" : "";
  btn.textContent = visible ? "⊞ Ещё настройки ▾" : "⊟ Скрыть настройки ▲";
});
document.getElementById("viewList").addEventListener("click", showList);
document.getElementById("viewMap").addEventListener("click", showMap);
document.getElementById("btnClear").addEventListener("click", () => {
  state.activeRooms = [];
  document.querySelectorAll("#rooms button").forEach(b => b.classList.remove("on"));
  ["district","priceFrom","priceTo","areaFrom","areaTo","floorFrom","floorTo",
   "floorsFrom","floorsTo","kitchenFrom","kitchenTo","yearFrom","yearTo"].forEach(id => document.getElementById(id).value = "");
  ["houseType","bathroom","complex"].forEach(id => document.getElementById(id).value = "");
  ["onlyPhoto","onlyNew","onlyOwner","onlyAgency","onlyMine","fPets","fKids","noFirst","noLast","exchange"].forEach(id => document.getElementById(id).checked = false);
  document.getElementById("rentPeriod").value = "month";
  document.getElementById("furnished").value = "any";
  document.getElementById("pledged").value = "";
  document.getElementById("exDormitory").value = "";
  document.getElementById("textSearch").value = "";
  document.getElementById("phoneFilter").value = "";
  applyNow();
  updateCount();
});
document.getElementById("btnMapInline").addEventListener("click", () => navigateToSearch(true));
