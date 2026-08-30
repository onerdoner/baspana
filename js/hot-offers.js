import { state } from "./state.js";
import { initDb } from "./db.js";
import { formatPrice, priceLabel } from "./format.js";
import { toggleFavorite } from "./favorites.js";
import { rowToItem } from "./listings-query.js";
import { openListingInNewTab } from "./listing-detail.js";

function hotCardHtml(item, dealLabel) {
  const imgs = (item.images && item.images.length) ? item.images : (item.imageUrl ? [item.imageUrl] : []);
  const photoCount = imgs.length > 1 ? `<span class="photo-count">${imgs.length} фото</span>` : "";
  const cityBadge = `<span class="hot-city">${item.city}</span>`;
  const photo = imgs.length
    ? `<div class="photo" style="background-image:url('${imgs[0]}');background-size:cover;background-position:center">${cityBadge}${photoCount}</div>`
    : `<div class="photo" style="background:${item.color}">${cityBadge}<span class="card-room-label">${item.rooms}-комн.</span></div>`;
  const tooltip = `${dealLabel} квартир в ${item.city}: ${item.rooms}-комн. - ${item.area} м² - ${item.floor}/${item.floorsTotal} эт., ${item.district} р-н, ул. ${item.street} за ${formatPrice(item.price)}`;
  return `
  <div class="card" data-id="${item.id}" title="${tooltip}">
    <span class="fav ${state.favoriteIds.has(item.id) ? "on" : ""}" data-fav="${item.id}">♥</span>
    ${photo}
    <div class="info">
      <div class="price">${priceLabel(item)}</div>
      <div class="title">${item.rooms}-комн. · ${item.area} м² · ${item.floor}/${item.floorsTotal} эт.</div>
      <div class="addr">${item.district} р-н, ул. ${item.street}</div>
      <div class="meta"><span>${item.date}</span>${item.isNew ? "<span class='card-new'>новостройка</span>" : ""}</div>
    </div>
  </div>`;
}

function bindHotGrid(gridEl, items) {
  gridEl.querySelectorAll(".card").forEach(el => {
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-fav]")) return;
      const item = items.find(x => x.id === +el.dataset.id);
      if (item) openListingInNewTab(item.id);
    });
  });
  gridEl.querySelectorAll("[data-fav]").forEach(el => {
    el.addEventListener("click", async (e) => {
      e.stopPropagation();
      const on = await toggleFavorite(+el.dataset.fav);
      if (on !== null) el.classList.toggle("on", on);
    });
  });
}

const skeletonCards = Array(6).fill(`
  <div class="card skeleton">
    <div class="skeleton-photo" style="width:100%;height:170px;border-radius:12px 12px 0 0"></div>
    <div class="skeleton-info" style="padding:10px 12px">
      <div class="skeleton-line w70"></div>
      <div class="skeleton-line w50"></div>
      <div class="skeleton-line w40"></div>
    </div>
  </div>`).join("");

export async function loadHotOffers() {
  if (!initDb()) return;
  const gridSale = document.getElementById("hotGridSale");
  const gridRent = document.getElementById("hotGridRent");
  gridSale.innerHTML = skeletonCards;

  const [resSale, resRent] = await Promise.all([
    state.db.from("listings").select("*").eq("deal_type", "sale").order("created_at", { ascending: false }).limit(6),
    state.db.from("listings").select("*").eq("deal_type", "rent").order("created_at", { ascending: false }).limit(6),
  ]);

  const saleItems = (resSale.data || []).map(rowToItem);
  const rentItems = (resRent.data || []).map(rowToItem);

  gridSale.innerHTML = saleItems.length
    ? saleItems.map(item => hotCardHtml(item, "Продажа")).join("")
    : '<div class="empty">Нет объявлений</div>';
  gridRent.innerHTML = rentItems.length
    ? rentItems.map(item => hotCardHtml(item, "Аренда")).join("")
    : '<div class="empty">Нет объявлений</div>';

  bindHotGrid(gridSale, saleItems);
  bindHotGrid(gridRent, rentItems);
}
