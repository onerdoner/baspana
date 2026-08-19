/* =========================================================
   НАСТРОЙКА — впиши свои значения из Supabase
   ========================================================= */
const SUPABASE_URL = "https://fpatqbdoqwkpfjnruwcx.supabase.co";
const SUPABASE_KEY = "sb_publishable_VMaQNWRJwv1WIfAa_9TTAg_JZMcieyu";

const CITIES = {
  "Алматы": { center:[43.238,76.913], zoom:12, districts:{
    "Медеуский":[43.238,76.955], "Бостандыкский":[43.230,76.900],
    "Алмалинский":[43.255,76.920], "Ауэзовский":[43.220,76.850],
    "Наурызбайский":[43.200,76.820], "Алатауский":[43.300,76.900],
    "Жетысуский":[43.290,76.930], "Турксибский":[43.300,76.960],
  }},
  "Астана": { center:[51.169,71.449], zoom:12, districts:{
    "Алматинский":[51.130,71.430], "Есильский":[51.100,71.410],
    "Сарыаркинский":[51.190,71.420], "Байконурский":[51.200,71.470], "Нура":[51.100,71.550],
  }},
  "Шымкент": { center:[42.317,69.587], zoom:12, districts:{
    "Абайский":[42.340,69.600], "Аль-Фарабийский":[42.310,69.580],
    "Енбекшинский":[42.300,69.620], "Каратауский":[42.370,69.550], "Туран":[42.320,69.630],
  }},
};
const COLORS = ["#5b8def","#e07a5f","#81b29a","#f2cc8f","#9d84b7","#e29578","#83c5be"];

let db = null;
function initDb() {
  if (SUPABASE_URL.startsWith("PASTE_")) {
    showBanner("Не заполнены ключи Supabase. Впиши SUPABASE_URL и SUPABASE_KEY в блоке НАСТРОЙКА.");
    return false;
  }
  if (!db) db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return true;
}

/* АККАУНТЫ */
let currentUser = null;
async function refreshAuth() {
  if (!initDb()) return;
  const { data } = await db.auth.getUser();
  currentUser = data.user || null;
  renderAuthUI();
}
function renderAuthUI() {
  const box = document.getElementById("authBox");
  const myWrap = document.getElementById("myToggleWrap");
  if (currentUser) {
    box.innerHTML = `<span style="font-size:14px;color:#555">${currentUser.email}</span>
      <button class="btn-cancel" style="padding:9px 16px" id="btnLogout">Выйти</button>`;
    document.getElementById("btnLogout").addEventListener("click", logout);
    myWrap.style.display = "flex";
  } else {
    box.innerHTML = `<button class="btn-add" style="background:#0a6dd6" id="btnLogin">Войти</button>`;
    document.getElementById("btnLogin").addEventListener("click", () => openAuth());
    myWrap.style.display = "none";
    document.getElementById("onlyMine").checked = false;
  }
}
async function signIn() {
  if (!initDb()) return;
  const email = document.getElementById("a_email").value.trim();
  const pass = document.getElementById("a_pass").value;
  const msg = document.getElementById("authMsg");
  const { error } = await db.auth.signInWithPassword({ email, password: pass });
  if (error) { msg.className = "form-msg err"; msg.textContent = "Не удалось войти: " + error.message; return; }
  msg.className = "form-msg ok"; msg.textContent = "Вход выполнен.";
  await refreshAuth(); applyNow();
  setTimeout(closeAuth, 700);
}
async function signUp() {
  if (!initDb()) return;
  const email = document.getElementById("a_email").value.trim();
  const pass = document.getElementById("a_pass").value;
  const msg = document.getElementById("authMsg");
  if (pass.length < 6) { msg.className = "form-msg err"; msg.textContent = "Пароль минимум 6 символов."; return; }
  const { data, error } = await db.auth.signUp({ email, password: pass });
  if (error) { msg.className = "form-msg err"; msg.textContent = "Ошибка регистрации: " + error.message; return; }
  if (data.session) {
    msg.className = "form-msg ok"; msg.textContent = "Аккаунт создан, вы вошли.";
    await refreshAuth(); applyNow();
    setTimeout(closeAuth, 700);
  } else {
    msg.className = "form-msg ok";
    msg.textContent = "Аккаунт создан. Проверь почту и подтверди email, потом войди.";
  }
}
async function logout() {
  await db.auth.signOut();
  currentUser = null; renderAuthUI();
  applyNow();
}

/* 1. ЧТЕНИЕ ИЗ БАЗЫ — теперь постранично и с фильтрами на стороне базы.
   Раньше грузили ВСЕ квартиры и фильтровали в браузере — на десятках тысяч
   это повесит вкладку. Теперь база сама фильтрует и отдаёт одну страницу. */

const PAGE_SIZE = 24;       // сколько объявлений на одной странице
let currentPage = 1;        // текущая страница
let totalCount = 0;         // сколько всего найдено (для пагинации)

// превращает строку из базы (snake_case) в удобный объект (camelCase)
function rowToItem(row) {
  return {
    id: row.id, rooms: row.rooms, area: row.area, floor: row.floor,
    floorsTotal: row.floors_total, price: row.price, district: row.district,
    street: row.street, lat: row.lat, lng: row.lng,
    isNew: row.is_new, hasPhoto: row.has_photo, color: row.color || "#5b8def",
    userId: row.user_id, dealType: row.deal_type || "sale",
    houseType: row.house_type, yearBuilt: row.year_built, condition: row.condition,
    phone: row.phone, description: row.description,
    rentPeriod: row.rent_period || "month", furnished: row.furnished,
    pets: row.pets_allowed, kids: row.kids_allowed,
    imageUrl: row.image_url, images: row.images || [], city: row.city || "Алматы",
    date: "18 августа", views: Math.floor(Math.random() * 300),
  };
}

// строит запрос к базе из текущих фильтров.
// Каждый .eq/.gte/.lte — это условие, которое база применит сама.
function buildQuery(query) {
  const f = getFilters();
  query = query.eq("deal_type", f.deal);
  if (f.city) query = query.eq("city", f.city);
  if (f.district) query = query.eq("district", f.district);
  if (f.rooms.length) {
    // 5+ означает "5 и больше". Собираем условие ИЛИ.
    const parts = f.rooms.map(r => r === 5 ? "rooms.gte.5" : `rooms.eq.${r}`);
    query = query.or(parts.join(","));
  }
  if (f.priceFrom) query = query.gte("price", f.priceFrom);
  if (f.priceTo !== Infinity) query = query.lte("price", f.priceTo);
  if (f.areaFrom) query = query.gte("area", f.areaFrom);
  if (f.areaTo !== Infinity) query = query.lte("area", f.areaTo);
  if (f.floorFrom) query = query.gte("floor", f.floorFrom);
  if (f.floorTo !== Infinity) query = query.lte("floor", f.floorTo);
  if (f.onlyPhoto) query = query.eq("has_photo", true);
  if (f.onlyNew) query = query.eq("is_new", true);
  if (f.onlyMine && currentUser) query = query.eq("user_id", currentUser.id);
  if (f.deal === "rent" && f.rentPeriod !== "any") query = query.eq("rent_period", f.rentPeriod);
  if (f.furnished === "yes") query = query.eq("furnished", true);
  if (f.furnished === "no") query = query.eq("furnished", false);
  if (f.pets) query = query.eq("pets_allowed", true);
  if (f.kids) query = query.eq("kids_allowed", true);
  if (f.noFirst) query = query.neq("floor", 1);
  if (f.noLast) query = query.eq("is_top_floor", false);
  if (f.text) {
    const t = f.text.replace(/[(),%]/g, " ").trim();  // убираем спецсимволы
    if (t) query = query.or(`description.ilike.%${t}%,street.ilike.%${t}%,district.ilike.%${t}%`);
  }
  return query;
}

/* 2. ЗАПИСЬ (добавили новые поля) */
async function submitListing() {
  if (!initDb()) return;
  const msg = document.getElementById("formMsg");
  const btn = document.getElementById("btnSubmit");
  const dealType = document.getElementById("f_deal").value;
  const rooms = +document.getElementById("f_rooms").value;
  const area = +document.getElementById("f_area").value;
  const floor = +document.getElementById("f_floor").value;
  const floorsTotal = +document.getElementById("f_floorsTotal").value;
  const price = +document.getElementById("f_price").value;
  const city = document.getElementById("f_city").value;
  const district = document.getElementById("f_district").value;
  const street = document.getElementById("f_street").value.trim();
  const houseType = document.getElementById("f_houseType").value;
  const yearBuilt = +document.getElementById("f_year").value || null;
  const condition = document.getElementById("f_condition").value;
  const phone = document.getElementById("f_phone").value.trim();
  const description = document.getElementById("f_desc").value.trim();
  const isNew = document.getElementById("f_isNew").checked;
  const rentPeriod = document.getElementById("f_rentPeriod").value;
  const furnished = document.getElementById("f_furnished").checked;
  const kids = document.getElementById("f_kids").checked;
  const pets = document.getElementById("f_pets").checked;

  if (!area || !floor || !floorsTotal || !price || !street) {
    msg.className = "form-msg err"; msg.textContent = "Заполни площадь, этажи, цену и улицу."; return;
  }
  const base = CITIES[city].districts[district];
  const lat = +(base[0] + (Math.random() - 0.5) * 0.03).toFixed(6);
  const lng = +(base[1] + (Math.random() - 0.5) * 0.04).toFixed(6);
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];

  btn.disabled = true; msg.className = "form-msg"; msg.textContent = "Сохраняю…";

  // Загрузка фото в Storage (можно несколько файлов)
  let images = [];
  const fileInput = document.getElementById("f_photo");
  if (fileInput.files.length) {
    msg.textContent = "Загружаю фото…";
    for (let i = 0; i < fileInput.files.length; i++) {
      const file = fileInput.files[i];
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${currentUser.id}/${Date.now()}_${i}.${ext}`;   // уникальное имя
      const up = await db.storage.from("listing-photos").upload(path, file);
      if (up.error) {
        btn.disabled = false;
        msg.className = "form-msg err";
        msg.textContent = "Не удалось загрузить фото: " + up.error.message;
        return;
      }
      images.push(db.storage.from("listing-photos").getPublicUrl(path).data.publicUrl);
    }
  }

  const { error } = await db.from("listings").insert({
    rooms, area, floor, floors_total: floorsTotal, price,
    district, street, lat, lng, is_new: isNew, has_photo: images.length > 0, color,
    deal_type: dealType, house_type: houseType, year_built: yearBuilt,
    condition, phone, description,
    rent_period: dealType === "rent" ? rentPeriod : "month",
    furnished, kids_allowed: kids, pets_allowed: pets,
    image_url: images[0] || null, images: images.length ? images : null, city,
  });
  btn.disabled = false;
  if (error) { msg.className = "form-msg err"; msg.textContent = "Ошибка: " + error.message; return; }
  msg.className = "form-msg ok"; msg.textContent = "Готово! Объявление добавлено.";
  showList();
  setDeal(dealType);   // setDeal сам сбросит на 1-ю страницу и обновит список
  setTimeout(closeForm, 900);
}

/* 3. УДАЛЕНИЕ */
async function deleteListing(id) {
  if (!confirm("Удалить это объявление?")) return;
  const { error } = await db.from("listings").delete().eq("id", id);
  if (error) { alert("Не удалось удалить: " + error.message); return; }
  applyNow();
}

function showBanner(m) {
  const b = document.getElementById("banner");
  b.textContent = m; b.style.display = "block";
  document.getElementById("listCount").textContent = "";
}

/* ФОРМАТ ЦЕНЫ */
function formatPrice(n) { return n.toLocaleString("ru-RU").replace(/,/g, " ") + " ₸"; }
function rentSuffix(item) {
  if (item.dealType !== "rent") return "";
  return item.rentPeriod === "day" ? " /сутки" : item.rentPeriod === "hour" ? " /час" : " /мес";
}
function priceLabel(item) { return formatPrice(item.price) + rentSuffix(item); }
function shortPrice(item) {
  const n = item.price;
  let s = n >= 1000000 ? (n / 1000000).toFixed(n % 1000000 ? 1 : 0) + " млн" : Math.round(n / 1000) + " тыс";
  const suf = item.dealType !== "rent" ? "" : item.rentPeriod === "day" ? "/сут" : item.rentPeriod === "hour" ? "/час" : "/мес";
  return s + suf;
}

/* ФИЛЬТРАЦИЯ */
let activeRooms = [];
let activeDeal = "sale";
function getFilters() {
  return {
    deal: activeDeal, rooms: activeRooms,
    city: document.getElementById("city").value,
    district: document.getElementById("district").value,
    priceFrom: +document.getElementById("priceFrom").value || 0,
    priceTo: +document.getElementById("priceTo").value || Infinity,
    areaFrom: +document.getElementById("areaFrom").value || 0,
    areaTo: +document.getElementById("areaTo").value || Infinity,
    floorFrom: +document.getElementById("floorFrom").value || 0,
    floorTo: +document.getElementById("floorTo").value || Infinity,
    onlyPhoto: document.getElementById("onlyPhoto").checked,
    onlyNew: document.getElementById("onlyNew").checked,
    onlyMine: document.getElementById("onlyMine").checked,
    rentPeriod: document.getElementById("rentPeriod").value,
    furnished: document.getElementById("furnished").value,
    pets: document.getElementById("fPets").checked,
    kids: document.getElementById("fKids").checked,
    noFirst: document.getElementById("noFirst").checked,
    noLast: document.getElementById("noLast").checked,
    text: document.getElementById("textSearch").value.trim().toLowerCase(),
  };
}
/* СПИСОК */
function renderList(items, total) {
  const grid = document.getElementById("listGrid");
  document.getElementById("listCount").textContent = "Найдено объявлений: " + total.toLocaleString("ru-RU").replace(/,/g, " ");
  if (!items.length) {
    grid.innerHTML = '<div class="empty">Ничего не найдено. Попробуйте изменить фильтры.</div>';
    return;
  }
  grid.innerHTML = items.map(item => {
    const mine = currentUser && item.userId === currentUser.id;
    const imgs = (item.images && item.images.length) ? item.images : (item.imageUrl ? [item.imageUrl] : []);
    const photo = imgs.length
      ? `<div class="photo" style="background-image:url('${imgs[0]}');background-size:cover;background-position:center">${imgs.length > 1 ? `<span class="photo-count">${imgs.length} фото</span>` : ""}</div>`
      : `<div class="photo" style="background:${item.color}">${item.hasPhoto ? item.rooms + "-комн." : "нет фото"}</div>`;
    return `
    <div class="card" data-id="${item.id}">
      ${photo}
      <div class="info">
        <div class="price">${priceLabel(item)}</div>
        <div class="title">${item.rooms}-комн. квартира · ${item.area} м² · ${item.floor}/${item.floorsTotal} этаж</div>
        <div class="addr">${item.district} р-н, ул. ${item.street}</div>
        <div class="meta">
          <span>${item.date}</span><span>👁 ${item.views}</span>
          ${item.isNew ? "<span style='color:#2a9d3a'>новостройка</span>" : ""}
          ${mine ? `<span class="del" data-del="${item.id}">удалить</span>` : ""}
        </div>
      </div>
    </div>`;
  }).join("");
  // клик по карточке -> страница объявления
  grid.querySelectorAll(".card").forEach(el => {
    el.addEventListener("click", (e) => {
      if (e.target.dataset.del) return;
      const item = items.find(x => x.id === +el.dataset.id);
      if (item) openDetail(item);
    });
  });
  // клик по "удалить" (не открывая страницу)
  grid.querySelectorAll("[data-del]").forEach(el => {
    el.addEventListener("click", (e) => { e.stopPropagation(); deleteListing(+el.dataset.del); });
  });
}

/* КАРТА (главная, со списком) */
const map = L.map("map").setView([43.238, 76.913], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(map);
const clusterLayer = L.markerClusterGroup();
map.addLayer(clusterLayer);
function renderMarkers(items) {
  clusterLayer.clearLayers();
  items.forEach(item => {
    const icon = L.divIcon({ className: "", html: `<div class="price-pin">${shortPrice(item)}</div>`, iconSize: null });
    const marker = L.marker([item.lat, item.lng], { icon });
    const firstImg = (item.images && item.images.length) ? item.images[0] : item.imageUrl;
    const popupImg = firstImg ? `<img src="${firstImg}" style="width:100%;height:90px;object-fit:cover;border-radius:6px;margin-bottom:6px">` : "";
    marker.bindPopup(`${popupImg}<b>${priceLabel(item)}</b><br>${item.rooms}-комн. · ${item.area} м² · ${item.floor}/${item.floorsTotal} эт.<br>${item.district} р-н, ул. ${item.street}`);
    marker.on("click", () => openDetail(item));
    clusterLayer.addLayer(marker);
  });
}

/* ВИД */
function showList() {
  document.body.classList.add("list-only");
  document.getElementById("viewList").classList.add("on");
  document.getElementById("viewMap").classList.remove("on");
}
function showMap() {
  document.body.classList.remove("list-only");
  document.getElementById("viewMap").classList.add("on");
  document.getElementById("viewList").classList.remove("on");
  setTimeout(() => map.invalidateSize(), 100);
}

/* ОБНОВЛЕНИЕ — просим у базы одну страницу и рисуем её */
async function update() {
  if (!initDb()) return;
  const from = (currentPage - 1) * PAGE_SIZE;   // первая строка страницы
  const to = from + PAGE_SIZE - 1;              // последняя строка страницы

  // select с count:"exact" — база вернёт и данные, и общее число найденных
  let query = buildQuery(db.from("listings").select("*", { count: "exact" }));
  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) { showBanner("Ошибка запроса: " + error.message); return; }

  totalCount = count || 0;
  const items = (data || []).map(rowToItem);
  renderList(items, totalCount);
  renderMarkers(items);          // на карте — только текущая страница
  renderPager(totalCount);
  document.getElementById("btnResults").textContent =
    "Показать результаты (" + totalCount.toLocaleString("ru-RU").replace(/,/g, " ") + ")";
}

/* ПАГИНАЦИЯ — кнопки Назад / Вперёд */
function renderPager(total) {
  const el = document.getElementById("pager");
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total <= PAGE_SIZE) { el.innerHTML = ""; return; }
  el.innerHTML = `
    <button id="prevPage" ${currentPage <= 1 ? "disabled" : ""}>← Назад</button>
    <span>Страница ${currentPage} из ${pages}</span>
    <button id="nextPage" ${currentPage >= pages ? "disabled" : ""}>Вперёд →</button>`;
  const prev = document.getElementById("prevPage");
  const next = document.getElementById("nextPage");
  if (prev) prev.addEventListener("click", () => { if (currentPage > 1) { currentPage--; update(); document.querySelector(".list").scrollTop = 0; } });
  if (next) next.addEventListener("click", () => { if (currentPage < pages) { currentPage++; update(); document.querySelector(".list").scrollTop = 0; } });
}

/* при смене любого фильтра — сбрасываем на 1-ю страницу.
   Для полей ввода делаем небольшую задержку (debounce),
   чтобы не дёргать базу на каждую букву. */
let updateTimer = null;
function scheduleUpdate() {
  currentPage = 1;
  clearTimeout(updateTimer);
  updateTimer = setTimeout(update, 350);
}
function applyNow() { currentPage = 1; update(); }

/* =========================================================
   СТРАНИЦА ОБЪЯВЛЕНИЯ
   Открывается при клике на карточку или точку на карте.
   ========================================================= */
let detailMap = null, detailMarker = null;
function openDetail(item) {
  const mine = currentUser && item.userId === currentUser.id;
  const perM2 = Math.round(item.price / item.area).toLocaleString("ru-RU").replace(/,/g, " ");

  document.getElementById("detailHead").innerHTML =
    `<div class="detail-title">${item.rooms}-комн. квартира · ${item.area} м² · ${item.floor}/${item.floorsTotal} этаж</div>
     <div class="detail-price">${priceLabel(item)}</div>`;

  document.getElementById("detailInfo").innerHTML = `
    <div class="attr"><span class="k">Город</span><span class="v">${item.city}, ${item.district} р-н</span></div>
    <div class="attr"><span class="k">Улица</span><span class="v">${item.street}</span></div>
    <div class="attr"><span class="k">Тип дома</span><span class="v">${item.houseType || "—"}</span></div>
    <div class="attr"><span class="k">Год постройки</span><span class="v">${item.yearBuilt || "—"}</span></div>
    <div class="attr"><span class="k">Этаж</span><span class="v">${item.floor} из ${item.floorsTotal}</span></div>
    <div class="attr"><span class="k">Площадь</span><span class="v">${item.area} м²</span></div>
    <div class="attr"><span class="k">Состояние</span><span class="v">${item.condition || "—"}</span></div>
    <div class="attr"><span class="k">Цена за м²</span><span class="v">${perM2} ₸</span></div>
    <div class="attr"><span class="k">Меблирована</span><span class="v">${item.furnished ? "да" : "нет"}</span></div>
    ${item.dealType === "rent" ? `
      <div class="attr"><span class="k">Можно с детьми</span><span class="v">${item.kids ? "да" : "нет"}</span></div>
      <div class="attr"><span class="k">Можно с животными</span><span class="v">${item.pets ? "да" : "нет"}</span></div>` : ""}
    ${item.isNew ? '<div class="attr"><span class="k">Новостройка</span><span class="v">да</span></div>' : ""}`;

  const photo = document.getElementById("detailPhoto");
  const thumbs = document.getElementById("detailThumbs");
  const imgs = (item.images && item.images.length) ? item.images : (item.imageUrl ? [item.imageUrl] : []);
  if (imgs.length) {
    photo.style.background = `#000 url('${imgs[0]}') center/cover no-repeat`;
    photo.textContent = "";
    // превью под большим фото; клик меняет главное фото
    thumbs.innerHTML = imgs.map((u, i) => `<img src="${u}" data-i="${i}" class="${i === 0 ? "active" : ""}">`).join("");
    thumbs.querySelectorAll("img").forEach(im => {
      im.addEventListener("click", () => {
        photo.style.background = `#000 url('${im.src}') center/cover no-repeat`;
        thumbs.querySelectorAll("img").forEach(x => x.classList.remove("active"));
        im.classList.add("active");
      });
    });
  } else {
    photo.style.background = item.color;
    photo.textContent = item.hasPhoto ? item.rooms + "-комн. квартира" : "нет фото";
    thumbs.innerHTML = "";
  }

  const name = mine ? currentUser.email : "Собственник";
  document.getElementById("detailAuthor").innerHTML = `
    <div class="author-box">
      <div style="color:#888;font-size:13px">Автор объявления</div>
      <div class="name">${name}</div>
      <div class="role">${item.date} · 👁 ${item.views} просмотров</div>
      <div class="phone-row"><span id="phoneVal">+7 •••&nbsp;•••</span> <a id="showPhone">Показать телефон</a></div>
    </div>`;

  document.getElementById("detailDesc").innerHTML =
    item.description ? `<h3>Описание</h3><p>${item.description}</p>` : "";

  const sp = document.getElementById("showPhone");
  if (sp) sp.addEventListener("click", () => {
    document.getElementById("phoneVal").textContent = item.phone || "телефон не указан";
    sp.style.display = "none";
  });

  document.getElementById("detail").classList.add("open");
  window.scrollTo(0, 0);

  // мини-карта объявления (создаём один раз, потом переиспользуем)
  setTimeout(() => {
    if (!detailMap) {
      detailMap = L.map("detailMap").setView([item.lat, item.lng], 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(detailMap);
    } else {
      detailMap.setView([item.lat, item.lng], 15);
    }
    if (detailMarker) detailMap.removeLayer(detailMarker);
    detailMarker = L.marker([item.lat, item.lng]).addTo(detailMap);
    detailMap.invalidateSize();
  }, 120);
}
function closeDetail() { document.getElementById("detail").classList.remove("open"); }

/* ПЕРЕКЛЮЧЕНИЕ ТИПА СДЕЛКИ */
function setDeal(d) {
  activeDeal = d;
  document.querySelectorAll("#deal button").forEach(b => b.classList.toggle("on", b.dataset.d === d));
  document.getElementById("navSale").classList.toggle("active", d === "sale");
  document.getElementById("navRent").classList.toggle("active", d === "rent");
  // блок аренды (период + дети/животные) показываем только для аренды
  document.getElementById("rentOnly").style.display = d === "rent" ? "inline-flex" : "none";
  document.getElementById("priceFrom").value = "";
  document.getElementById("priceTo").value = "";
  applyNow();
}

/* ОКНА */
function openForm() {
  if (!currentUser) { openAuth("Сначала войди, чтобы подать объявление."); return; }
  document.getElementById("formMsg").textContent = "";
  document.getElementById("f_deal").value = activeDeal;
  updateFormDeal();
  document.getElementById("overlay").classList.add("open");
}
function closeForm() { document.getElementById("overlay").classList.remove("open"); }
function openAuth(hint) {
  document.getElementById("authMsg").textContent = "";
  document.getElementById("authSub").textContent = hint || "Войди или создай аккаунт, чтобы подавать объявления.";
  document.getElementById("authOverlay").classList.add("open");
}
function closeAuth() { document.getElementById("authOverlay").classList.remove("open"); }
function updateFormDeal() {
  const isRent = document.getElementById("f_deal").value === "rent";
  document.getElementById("priceHint").textContent = isRent ? "(за месяц/сутки/час)" : "";
  document.getElementById("f_rentOnly").style.display = isRent ? "block" : "none";
  document.getElementById("f_rentChecks").style.display = isRent ? "flex" : "none";
}

/* КНОПКИ И ПОЛЯ */
document.querySelectorAll("#deal button").forEach(btn => btn.addEventListener("click", () => setDeal(btn.dataset.d)));
document.getElementById("navSale").addEventListener("click", () => setDeal("sale"));
document.getElementById("navRent").addEventListener("click", () => setDeal("rent"));
document.getElementById("f_deal").addEventListener("change", updateFormDeal);
document.getElementById("logo").addEventListener("click", closeDetail);
document.getElementById("detailBack").addEventListener("click", closeDetail);

document.querySelectorAll("#rooms button").forEach(btn => {
  btn.addEventListener("click", () => {
    const r = +btn.dataset.r;
    btn.classList.toggle("on");
    if (activeRooms.includes(r)) activeRooms = activeRooms.filter(x => x !== r);
    else activeRooms.push(r);
    applyNow();
  });
});

const cityNames = Object.keys(CITIES);

// заполняет выпадающий список районов для выбранного города
function fillDistricts(selectEl, city, withAll) {
  selectEl.innerHTML = withAll ? '<option value="">Все районы</option>' : "";
  Object.keys(CITIES[city].districts).forEach(d => {
    const o = document.createElement("option"); o.value = d; o.textContent = d;
    selectEl.appendChild(o);
  });
}

// селект города в фильтрах
const citySel = document.getElementById("city");
const districtSel = document.getElementById("district");
cityNames.forEach(c => { const o = document.createElement("option"); o.value = c; o.textContent = c; citySel.appendChild(o); });
citySel.value = "Алматы";
fillDistricts(districtSel, "Алматы", true);
citySel.addEventListener("change", () => {
  fillDistricts(districtSel, citySel.value, true);
  const c = CITIES[citySel.value];
  map.setView(c.center, c.zoom);         // карта переезжает в выбранный город
  applyNow();
});

// селект города в форме
const cityForm = document.getElementById("f_city");
const districtForm = document.getElementById("f_district");
cityNames.forEach(c => { const o = document.createElement("option"); o.value = c; o.textContent = c; cityForm.appendChild(o); });
cityForm.value = "Алматы";
fillDistricts(districtForm, "Алматы", false);
cityForm.addEventListener("change", () => fillDistricts(districtForm, cityForm.value, false));

["district","priceFrom","priceTo","areaFrom","areaTo","floorFrom","floorTo","onlyPhoto","onlyNew","onlyMine",
 "rentPeriod","furnished","fPets","fKids","noFirst","noLast","textSearch"]
  .forEach(id => document.getElementById(id).addEventListener("input", scheduleUpdate));

document.getElementById("btnResults").addEventListener("click", () => { showList(); applyNow(); });
document.getElementById("viewList").addEventListener("click", showList);
document.getElementById("viewMap").addEventListener("click", showMap);
document.getElementById("btnClear").addEventListener("click", () => {
  activeRooms = [];
  document.querySelectorAll("#rooms button").forEach(b => b.classList.remove("on"));
  ["district","priceFrom","priceTo","areaFrom","areaTo","floorFrom","floorTo"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("onlyPhoto").checked = false;
  document.getElementById("onlyNew").checked = false;
  document.getElementById("onlyMine").checked = false;
  document.getElementById("rentPeriod").value = "any";
  document.getElementById("furnished").value = "any";
  ["fPets","fKids","noFirst","noLast"].forEach(id => document.getElementById(id).checked = false);
  document.getElementById("textSearch").value = "";
  applyNow();
});

document.getElementById("btnOpenForm").addEventListener("click", () => openForm());
document.getElementById("btnCancel").addEventListener("click", closeForm);
document.getElementById("btnSubmit").addEventListener("click", submitListing);
document.getElementById("overlay").addEventListener("click", (e) => { if (e.target.id === "overlay") closeForm(); });
document.getElementById("btnSignIn").addEventListener("click", signIn);
document.getElementById("btnSignUp").addEventListener("click", signUp);
document.getElementById("authClose").addEventListener("click", closeAuth);
document.getElementById("authOverlay").addEventListener("click", (e) => { if (e.target.id === "authOverlay") closeAuth(); });

/* СТАРТ */
async function start() {
  await refreshAuth();
  applyNow();
}
start();
