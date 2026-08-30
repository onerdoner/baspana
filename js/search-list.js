import { state } from "./state.js";
import { PAGE_SIZE } from "./config.js";
import { initDb } from "./db.js";
import { priceLabel, favBtnLabel, buildCardInfoLine, sellerBadgeHtml, escapeHtml, showBanner } from "./format.js";
import { toggleFavorite } from "./favorites.js";
import { openNoteModal, deleteNote, refreshCardNoteUI } from "./notes.js";
import { openConfirm } from "./confirm-dialog.js";
import { buildQuery, rowToItem, applySort } from "./listings-query.js";
import { openListingInNewTab } from "./listing-detail.js";
import { deleteListing, openFormCategory } from "./submit-form.js";
import { map, clusterLayer, renderMarkers } from "./map-instance.js";

/* СПИСОК */
export function renderList(items, total) {
  const grid = document.getElementById("listGrid");
  const cityName = document.getElementById("city").value;
  const dealLabel = state.activeDeal === "sale" ? "Продажа" : "Аренда";
  document.getElementById("listTitle").textContent = state.myMode ? "Мои объявления" : state.favMode ? "Избранное" : `${dealLabel} квартир в ${cityName}`;
  document.getElementById("listCount").textContent = (state.myMode || state.favMode) ? "" : "Найдено " + total.toLocaleString("ru-RU").replace(/,/g, " ") + " объявлений";
  if (!items.length) {
    grid.innerHTML = state.myMode
      ? `<div class="empty-mine">
           <div class="empty-mine-row">
             <div class="empty-mine-text">У вас пока нет объявлений на сайте</div>
             <button class="btn-add" id="emptyMineSubmit">Подать объявление</button>
           </div>
           <p class="empty-mine-hint">Это легко исправить, <a href="#" id="emptyMineLink">подав их</a>.</p>
         </div>`
      : state.favMode
        ? '<div class="empty">Вы пока не добавили ни одного объявления в избранное.</div>'
        : '<div class="empty">Ничего не найдено. Попробуйте изменить фильтры.</div>';
    if (state.myMode) {
      document.getElementById("emptyMineSubmit").addEventListener("click", openFormCategory);
      document.getElementById("emptyMineLink").addEventListener("click", (e) => { e.preventDefault(); openFormCategory(); });
    }
    return;
  }
  grid.innerHTML = items.map(item => {
    const mine = state.currentUser && item.userId === state.currentUser.id;
    const imgs = (item.images && item.images.length) ? item.images : (item.imageUrl ? [item.imageUrl] : []);
    const photo = imgs.length
      ? `<div class="photo" style="background-image:url('${imgs[0]}');background-size:cover;background-position:center">${imgs.length > 1 ? `<span class="photo-count">${imgs.length} фото</span>` : ""}</div>`
      : `<div class="photo" style="background:${item.color}"><span class="card-room-label">${item.rooms}-комн.</span></div>`;
    const infoLine = buildCardInfoLine(item);
    const seller = sellerBadgeHtml(item);
    const note = state.notesMap.get(item.id);
    return `
    <div class="card-block" data-id="${item.id}">
      <div class="card" data-id="${item.id}">
        ${photo}
        <div class="info">
          <div class="card-top">
            <div class="title">${item.rooms}-комн. квартира · ${item.area} м² · ${item.floor}/${item.floorsTotal} этаж</div>
            <div class="price">${priceLabel(item)}</div>
          </div>
          <div class="addr">${item.district} р-н, ул. ${item.street}</div>
          ${infoLine ? `<div class="card-info-line">${infoLine}</div>` : ""}
          ${seller}
          <div class="meta">
            <span>${item.city}</span>
            <span>${item.date}</span>
            <span>👁 ${item.views}</span>
            ${item.isNew ? "<span class='card-new'>новостройка</span>" : ""}
            ${mine ? `<span class="del" data-del="${item.id}">удалить</span>` : ""}
          </div>
          <div class="card-actions">
            <button class="fav-btn ${state.favoriteIds.has(item.id) ? "on" : ""}" data-fav="${item.id}">${favBtnLabel(state.favoriteIds.has(item.id))}</button>
            <button class="note-btn" data-note="${item.id}">✏ ${note ? "Редактировать заметку" : "Оставить заметку"}</button>
          </div>
        </div>
      </div>
      ${note ? `<div class="note-preview"><span>${escapeHtml(note)}</span><button class="note-preview-close" data-note-remove="${item.id}">✕</button></div>` : ""}
    </div>`;
  }).join("");
  // клик по карточке -> страница объявления
  grid.querySelectorAll(".card-block").forEach(el => {
    el.addEventListener("click", (e) => {
      if (e.target.dataset.del) return;
      if (e.target.closest(".note-preview")) return;
      const item = items.find(x => x.id === +el.dataset.id);
      if (item) openListingInNewTab(item.id);
    });
  });
  // клик по "удалить" (не открывая страницу)
  grid.querySelectorAll("[data-del]").forEach(el => {
    el.addEventListener("click", (e) => { e.stopPropagation(); deleteListing(+el.dataset.del); });
  });
  // клик по сердечку — добавить/убрать из избранного
  grid.querySelectorAll("[data-fav]").forEach(el => {
    el.addEventListener("click", async (e) => {
      e.stopPropagation();
      const favState = await toggleFavorite(+el.dataset.fav);
      if (favState === null) return;      // не вошёл
      if (state.favMode) return;             // список сам пересоберётся
      el.classList.toggle("on", favState);
      el.textContent = favBtnLabel(favState);
    });
  });
  // клик по "Оставить/Редактировать заметку"
  grid.querySelectorAll("[data-note]").forEach(el => {
    el.addEventListener("click", (e) => { e.stopPropagation(); openNoteModal(+el.dataset.note); });
  });
  // клик по крестику на превью заметки — быстрое удаление
  grid.querySelectorAll("[data-note-remove]").forEach(el => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = +el.dataset.noteRemove;
      openConfirm("Удалить заметку?", "Удалённую заметку не получится восстановить", async () => {
        if (await deleteNote(id)) refreshCardNoteUI(id);
      });
    });
  });
}

/* ВИД */
export function showList() {
  document.body.classList.add("list-only");
  document.getElementById("viewList").classList.add("on");
  document.getElementById("viewMap").classList.remove("on");
}
export function showMap() {
  document.body.classList.remove("list-only");
  document.getElementById("viewMap").classList.add("on");
  document.getElementById("viewList").classList.remove("on");
  setTimeout(() => map.invalidateSize(), 100);
}

/* ОБНОВЛЕНИЕ — просим у базы одну страницу и рисуем её */
export async function update() {
  if (!initDb()) return;
  const from = (state.currentPage - 1) * PAGE_SIZE;   // первая строка страницы
  const to = from + PAGE_SIZE - 1;              // последняя строка страницы

  // Показываем скелетон пока ждём ответа от базы
  document.getElementById("listCount").textContent = "Загружаю…";
  document.getElementById("listGrid").innerHTML = Array(6).fill(`
    <div class="card skeleton">
      <div class="skeleton-photo"></div>
      <div class="skeleton-info">
        <div class="skeleton-line w70"></div>
        <div class="skeleton-line w50"></div>
        <div class="skeleton-line w40"></div>
      </div>
    </div>`).join("");

  let items, count;
  if (state.favMode) {
    // в избранном сортируем не по базе, а по порядку добавления в избранное
    // (последний добавленный — первый), поэтому забираем все и режем страницу сами
    const { data, error } = await buildQuery(state.db.from("listings").select("*"));
    if (error) { showBanner("Ошибка запроса: " + error.message); return; }
    const all = (data || []).map(rowToItem)
      .sort((a, b) => state.favoriteOrder.indexOf(a.id) - state.favoriteOrder.indexOf(b.id));
    count = all.length;
    items = all.slice(from, to + 1);
  } else {
    // select с count:"exact" — база вернёт и данные, и общее число найденных
    let query = buildQuery(state.db.from("listings").select("*", { count: "exact" }));
    query = applySort(query).range(from, to);
    const { data, error, count: c } = await query;
    if (error) { showBanner("Ошибка запроса: " + error.message); return; }
    count = c || 0;
    items = (data || []).map(rowToItem);
  }

  state.totalCount = count;
  renderList(items, state.totalCount);
  renderMarkers(items);          // на карте — только текущая страница
  renderPager(state.totalCount);
  const applyBtn = document.getElementById("btnApply");
  if (applyBtn) applyBtn.textContent =
    "Показать результаты (" + state.totalCount.toLocaleString("ru-RU").replace(/,/g, " ") + ")";
}

/* ПАГИНАЦИЯ — кнопки Назад / Вперёд */
export function renderPager(total) {
  const el = document.getElementById("pager");
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total <= PAGE_SIZE) { el.innerHTML = ""; return; }
  el.innerHTML = `
    <button id="prevPage" ${state.currentPage <= 1 ? "disabled" : ""}>← Назад</button>
    <span>Страница ${state.currentPage} из ${pages}</span>
    <button id="nextPage" ${state.currentPage >= pages ? "disabled" : ""}>Вперёд →</button>`;
  const prev = document.getElementById("prevPage");
  const next = document.getElementById("nextPage");
  if (prev) prev.addEventListener("click", () => { if (state.currentPage > 1) { state.currentPage--; update(); document.querySelector(".list").scrollTop = 0; } });
  if (next) next.addEventListener("click", () => { if (state.currentPage < pages) { state.currentPage++; update(); document.querySelector(".list").scrollTop = 0; } });
}

/* при смене любого фильтра — сбрасываем на 1-ю страницу.
   Для полей ввода делаем небольшую задержку (debounce),
   чтобы не дёргать базу на каждую букву. */
let updateTimer = null;
export function scheduleUpdate() {
  state.currentPage = 1;
  clearTimeout(updateTimer);
  updateTimer = setTimeout(update, 350);
}
export function applyNow() { state.currentPage = 1; update(); }
