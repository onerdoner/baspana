import { state } from "./state.js";
import { initDb } from "./db.js";
import { priceLabel, favBtnLabel, escapeHtml } from "./format.js";
import { toggleFavorite } from "./favorites.js";
import { openNoteModal } from "./notes.js";
import { rowToItem } from "./listings-query.js";
import { navigateToComplex } from "./complex-page.js";
import { showBanner } from "./format.js";

/* =========================================================
   СТРАНИЦА ОБЪЯВЛЕНИЯ
   Открывается при клике на карточку или точку на карте.
   ========================================================= */

// заголовок, кнопки и цена — своя функция, чтобы дёргать отдельно из refreshCardNoteUI не пришлось:
// кнопки достаточно перерисовать через data-note/data-fav (см. refreshCardNoteUI)
export function renderListingContent(item) {
  const dealLabel = item.dealType === "rent" ? "Аренда" : "Продажа";
  document.getElementById("detailBreadcrumbs").innerHTML = `
    <a href="${location.pathname}">baspana.kz</a>
    <span>/</span>
    <a href="${location.pathname}?view=search&deal=${item.dealType}">${dealLabel} квартир</a>`;

  const note = state.notesMap.get(item.id);
  const favOn = state.favoriteIds.has(item.id);
  document.getElementById("detailHead").innerHTML = `
    <div class="detail-title-row">
      <div class="detail-title">${item.rooms}-комнатная квартира · ${item.area} м², ${item.street}</div>
      <div class="detail-actions">
        <button class="note-btn" data-note="${item.id}">✏ ${note ? "Редактировать заметку" : "Оставить заметку"}</button>
        <button class="fav-btn ${favOn ? "on" : ""}" data-fav="${item.id}">${favBtnLabel(favOn)}</button>
      </div>
    </div>
    <hr class="detail-divider">
    <div class="detail-price-row">
      <div class="detail-price">${priceLabel(item)}</div>
      ${item.isNew ? '<span class="badge-new">Новостройка</span>' : ''}
    </div>`;
  document.querySelector("#detailHead [data-note]").addEventListener("click", () => openNoteModal(item.id));
  document.querySelector("#detailHead [data-fav]").addEventListener("click", async (e) => {
    const favState = await toggleFavorite(item.id);
    if (favState === null) return;
    e.currentTarget.classList.toggle("on", favState);
    e.currentTarget.textContent = favBtnLabel(favState);
  });

  document.getElementById("detailInfo").innerHTML = item.dealType === "rent" ? `
    <div class="attr"><span class="k">Город</span><span class="v">${item.city}, ${item.district} р-н</span></div>
    ${item.complex ? `<div class="attr"><span class="k">Жилой комплекс</span><span class="v"><a href="?complex=${encodeURIComponent(item.complex)}" class="complex-link" data-complex="${escapeHtml(item.complex)}">${escapeHtml(item.complex)}</a></span></div>` : ""}
    <div class="attr"><span class="k">Год постройки</span><span class="v">${item.yearBuilt || "—"}</span></div>
    <div class="attr"><span class="k">Этаж</span><span class="v">${item.floor} из ${item.floorsTotal}</span></div>
    <div class="attr"><span class="k">Площадь</span><span class="v">${item.area} м²</span></div>
    ${item.kitchenStudio != null ? `<div class="attr"><span class="k">Кухня студия</span><span class="v">${item.kitchenStudio ? "да" : "нет"}</span></div>` : ""}
    <div class="attr"><span class="k">Состояние</span><span class="v">${item.condition || "—"}</span></div>
    ${item.furnished != null ? `<div class="attr"><span class="k">Квартира мебелирована</span><span class="v">${item.furnished ? "да" : "нет"}</span></div>` : ""}
    ${item.security ? `<div class="attr"><span class="k">Безопасность</span><span class="v">${item.security}</span></div>` : ""}
    ${item.exDormitory != null ? `<div class="attr"><span class="k">Бывшее общежитие</span><span class="v">${item.exDormitory ? "да" : "нет"}</span></div>` : ""}
  ` : `
    <div class="attr"><span class="k">Город</span><span class="v">${item.city}, ${item.district} р-н</span></div>
    <div class="attr"><span class="k">Тип дома</span><span class="v">${item.houseType || "—"}</span></div>
    ${item.complex ? `<div class="attr"><span class="k">Жилой комплекс</span><span class="v"><a href="?complex=${encodeURIComponent(item.complex)}" class="complex-link" data-complex="${escapeHtml(item.complex)}">${escapeHtml(item.complex)}</a></span></div>` : ""}
    <div class="attr"><span class="k">Год постройки</span><span class="v">${item.yearBuilt || "—"}</span></div>
    <div class="attr"><span class="k">Этаж</span><span class="v">${item.floor} из ${item.floorsTotal}</span></div>
    <div class="attr"><span class="k">Площадь</span><span class="v">${item.area} м²</span></div>
    <div class="attr"><span class="k">Состояние</span><span class="v">${item.condition || "—"}</span></div>
    ${item.bathroom ? `<div class="attr"><span class="k">Санузел</span><span class="v">${item.bathroom}</span></div>` : ""}
    ${item.ceilingHeight ? `<div class="attr"><span class="k">Высота потолков</span><span class="v">${item.ceilingHeight} м</span></div>` : ""}
    ${item.doorType ? `<div class="attr"><span class="k">Дверь</span><span class="v">${item.doorType}</span></div>` : ""}
    ${item.parking ? `<div class="attr"><span class="k">Парковка</span><span class="v">${item.parking}</span></div>` : ""}
    ${item.balcony ? `<div class="attr"><span class="k">Балкон</span><span class="v">${item.balcony}</span></div>` : ""}`;

  const complexLink = document.querySelector("#detailInfo .complex-link");
  if (complexLink) complexLink.addEventListener("click", (e) => {
    e.preventDefault();
    navigateToComplex(complexLink.dataset.complex);
  });

  const photo = document.getElementById("detailPhoto");
  const thumbs = document.getElementById("detailThumbs");
  const imgs = (item.images && item.images.length) ? item.images : (item.imageUrl ? [item.imageUrl] : []);
  if (imgs.length) {
    let photoIdx = 0;
    const setPhoto = (i) => {
      photoIdx = (i + imgs.length) % imgs.length;
      photo.style.background = `#000 url('${imgs[photoIdx]}') center/cover no-repeat`;
      thumbs.querySelectorAll("img").forEach((x, j) => x.classList.toggle("active", j === photoIdx));
    };
    photo.style.background = `#000 url('${imgs[0]}') center/cover no-repeat`;
    photo.onclick = () => openLightbox(imgs, photoIdx);
    if (imgs.length > 1) {
      photo.innerHTML = `<button class="photo-arrow prev">❮</button><button class="photo-arrow next">❯</button>`;
      photo.querySelector(".prev").onclick = (e) => { e.stopPropagation(); setPhoto(photoIdx - 1); };
      photo.querySelector(".next").onclick = (e) => { e.stopPropagation(); setPhoto(photoIdx + 1); };
    } else {
      photo.innerHTML = "";
    }
    thumbs.innerHTML = imgs.map((u, i) => `<img src="${u}" data-i="${i}" class="${i === 0 ? "active" : ""}">`).join("");
    thumbs.querySelectorAll("img").forEach((im, i) => im.addEventListener("click", () => setPhoto(i)));
  } else {
    photo.style.background = item.color;
    photo.style.cursor = "default";
    photo.onclick = null;
    photo.textContent = item.hasPhoto ? item.rooms + "-комн. квартира" : "нет фото";
    thumbs.innerHTML = "";
  }

  document.getElementById("detailAuthor").innerHTML = `
    <div class="author-box">
      <div class="author-label">Автор объявления</div>
      <div class="author-name">Собственник</div>
      <div class="author-meta">${item.date} · 👁 ${item.views} просмотров</div>
      <button class="btn-show-phone" id="showPhone">Показать телефон</button>
    </div>`;

  document.getElementById("detailDesc").innerHTML =
    item.description ? `<h3>О квартире</h3><h3 style="font-size:15px;font-weight:600;margin:16px 0 8px;color:#555">Описание</h3><p>${item.description}</p>` : "";

  const sp = document.getElementById("showPhone");
  if (sp) sp.addEventListener("click", () => {
    sp.textContent = item.phone || "телефон не указан";
    sp.classList.add("revealed");
  });

  window.scrollTo(0, 0);

  // мини-карта объявления (создаём один раз, потом переиспользуем)
  setTimeout(() => {
    if (!state.detailMap) {
      state.detailMap = L.map("detailMap").setView([item.lat, item.lng], 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(state.detailMap);
    } else {
      state.detailMap.setView([item.lat, item.lng], 15);
    }
    if (state.detailMarker) state.detailMap.removeLayer(state.detailMarker);
    state.detailMarker = L.marker([item.lat, item.lng]).addTo(state.detailMap);
    state.detailMap.invalidateSize();
  }, 120);

  renderSimilar(item);
}

// показывает страницу объявления: прячет витрину/поиск/панель фильтров,
// показывает #detail (обычный раздел страницы, не оверлей)
export function showListingSection() {
  state.currentView = "listing";
  document.querySelector(".filters").style.display = "none";
  document.getElementById("hotSection").style.display = "none";
  document.getElementById("searchContent").style.display = "none";
  document.getElementById("detail").classList.add("open");
  document.getElementById("complexPage").classList.remove("open");
  // на странице отдельного объявления мы не на Продаже/Аренде/Избранном — снимаем подсветку
  document.getElementById("navSale").classList.remove("active");
  document.getElementById("navRent").classList.remove("active");
  document.getElementById("navFav").classList.remove("active");
}

// переход на другое объявление той же вкладкой (напр. клик по "похожему") —
// объект уже есть на руках, запрос к базе не нужен
export function navigateToListingItem(item) {
  history.pushState({ view: "listing", listing: item.id }, "", location.pathname + "?listing=" + item.id);
  showListingSection();
  renderListingContent(item);
}

// Загружает одно объявление из базы по ID и показывает его.
// Используется при первом открытии страницы и при Назад/Вперёд в браузере.
export async function loadAndOpenListing(id) {
  if (!initDb()) return;
  const { data, error } = await state.db.from("listings").select("*").eq("id", id).single();
  if (error || !data) { showBanner("Объявление не найдено."); return; }
  showListingSection();
  renderListingContent(rowToItem(data));
}

// открыть объявление в новой вкладке (клик по карточке в списке/на карте)
export function openListingInNewTab(id) {
  window.open(location.pathname + "?listing=" + id, "_blank");
}

/* ЛАЙТБОКС */
export function openLightbox(imgs, startIdx) {
  state.lbImgs = imgs; state.lbIdx = startIdx;
  document.getElementById("lbImg").src = state.lbImgs[state.lbIdx];
  const hasMult = state.lbImgs.length > 1;
  document.getElementById("lbPrev").style.display = hasMult ? "" : "none";
  document.getElementById("lbNext").style.display = hasMult ? "" : "none";
  document.getElementById("lightbox").classList.add("open");
}
export function lbGo(dir) {
  state.lbIdx = (state.lbIdx + dir + state.lbImgs.length) % state.lbImgs.length;
  document.getElementById("lbImg").src = state.lbImgs[state.lbIdx];
}
document.getElementById("lbClose").addEventListener("click", () => document.getElementById("lightbox").classList.remove("open"));
document.getElementById("lbPrev").addEventListener("click", () => lbGo(-1));
document.getElementById("lbNext").addEventListener("click", () => lbGo(1));
document.getElementById("lightbox").addEventListener("click", (e) => { if (e.target.id === "lightbox") document.getElementById("lightbox").classList.remove("open"); });
document.addEventListener("keydown", (e) => {
  if (!document.getElementById("lightbox").classList.contains("open")) return;
  if (e.key === "ArrowLeft")  lbGo(-1);
  if (e.key === "ArrowRight") lbGo(1);
  if (e.key === "Escape") document.getElementById("lightbox").classList.remove("open");
});

/* ПОХОЖИЕ ОБЪЯВЛЕНИЯ */
export async function renderSimilar(item) {
  const el = document.getElementById("detailSimilar");
  if (!el || !initDb()) return;
  el.innerHTML = "";
  const { data } = await state.db.from("listings").select("*")
    .eq("deal_type", item.dealType)
    .eq("district", item.district)
    .neq("id", item.id)
    .order("created_at", { ascending: false })
    .limit(6);
  if (!data || !data.length) return;
  const items = data.map(rowToItem);
  el.innerHTML = `<h3 class="similar-title">Похожие объявления</h3>
    <div class="similar-grid">${items.map(x => {
      const imgs = (x.images && x.images.length) ? x.images : (x.imageUrl ? [x.imageUrl] : []);
      const bg = imgs.length ? `url('${imgs[0]}')` : "none";
      return `<div class="similar-card" data-id="${x.id}">
        <div class="similar-photo" style="background-image:${bg};background-color:${x.color}"></div>
        <div class="similar-price">${priceLabel(x)}</div>
        <div class="similar-meta">${x.rooms}-комн. · ${x.area} м² · ${x.floor}/${x.floorsTotal} эт.</div>
        <div class="similar-addr">${x.district} р-н</div>
      </div>`;
    }).join("")}</div>`;
  el.querySelectorAll(".similar-card").forEach(card => {
    card.addEventListener("click", () => {
      const found = items.find(x => x.id === +card.dataset.id);
      if (found) navigateToListingItem(found);
    });
  });
}
