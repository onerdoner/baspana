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

// Жилые комплексы по городам (для фильтра и формы)
const COMPLEXES = {
  "Алматы": [
    "7Su Nury","AFD Plaza","ALA Park","ALA Town","Almaly Park","Aura",
    "BI City","Botanika","Central Avenue","Comfort City","Dream City Family",
    "Esentai City","Green Park","Hayat Park","Highvill","Mega Tower",
    "Nova City","O'NER Towers","Sensata","Tumar","Verdi","Vista",
    "Аскарова","Бельведер","Керемет","Мерей","Ремизовка","Розмарин",
    "Сымбат","Тау Самал","Экватор",
  ],
  "Астана": ["Triumph Astana","Nurly Tau","Capital Hill","Highvill","Park View","Expo City","Riverside"],
  "Шымкент": ["Нурлы Жол","Арман","Достык Plaza","Алтын Орда"],
};

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
  await loadFavorites();
  await loadNotes();
}

/* ИЗБРАННОЕ */
let favoriteIds = new Set();   // id объявлений, которые лайкнул текущий пользователь
let favMode = false;           // включён ли режим "показывать только избранное"

async function loadFavorites() {
  favoriteIds = new Set();
  if (currentUser) {
    const { data, error } = await db.from("favorites").select("listing_id");
    if (!error && data) data.forEach(r => favoriteIds.add(r.listing_id));
  }
  updateFavCount();
}
function updateFavCount() {
  const el = document.getElementById("favCount");
  if (el) el.textContent = "(" + favoriteIds.size + ")";
}
// добавить/убрать лайк. Возвращает true/false (новое состояние) или null, если не вошёл.
async function toggleFavorite(id) {
  if (!currentUser) { openAuth("Войди, чтобы добавлять в избранное."); return null; }
  if (favoriteIds.has(id)) {
    const { error } = await db.from("favorites").delete().eq("listing_id", id);
    if (error) { alert("Ошибка: " + error.message); return null; }
    favoriteIds.delete(id);
    updateFavCount();
    if (favMode) update();       // в режиме избранного — пересобрать список
    return false;
  } else {
    const { error } = await db.from("favorites").insert({ listing_id: id });
    if (error) { alert("Ошибка: " + error.message); return null; }
    favoriteIds.add(id);
    updateFavCount();
    return true;
  }
}
/* ЗАМЕТКИ */
let notesMap = new Map();   // listing_id -> текст заметки (только у текущего пользователя)

async function loadNotes() {
  notesMap = new Map();
  if (currentUser) {
    const { data, error } = await db.from("notes").select("listing_id,text");
    if (!error && data) data.forEach(r => notesMap.set(r.listing_id, r.text));
  }
}

// сохранить/обновить заметку. Заодно добавляет объявление в избранное (как на krisha.kz).
async function saveNote(id, text) {
  if (!currentUser) { openAuth("Войди, чтобы оставить заметку."); return false; }
  const { error } = await db.from("notes").upsert(
    { listing_id: id, user_id: currentUser.id, text, updated_at: new Date().toISOString() },
    { onConflict: "listing_id,user_id" }
  );
  if (error) { alert("Ошибка: " + error.message); return false; }
  notesMap.set(id, text);
  if (!favoriteIds.has(id)) {
    const { error: favError } = await db.from("favorites").insert({ listing_id: id });
    if (!favError) { favoriteIds.add(id); updateFavCount(); }
  }
  return true;
}

async function deleteNote(id) {
  const { error } = await db.from("notes").delete().eq("listing_id", id);
  if (error) { alert("Ошибка: " + error.message); return false; }
  notesMap.delete(id);
  return true;
}

let noteEditId = null;
function openNoteModal(id) {
  if (!currentUser) { openAuth("Войди, чтобы оставить заметку."); return; }
  noteEditId = id;
  const existing = notesMap.get(id) || "";
  document.getElementById("noteTitle").textContent = existing ? "Редактировать заметку" : "Оставить заметку";
  const ta = document.getElementById("noteText");
  ta.value = existing;
  updateNoteCount();
  document.getElementById("btnNoteDelete").style.display = existing ? "" : "none";
  document.getElementById("noteOverlay").classList.add("open");
  ta.focus();
}
function closeNoteModal() {
  document.getElementById("noteOverlay").classList.remove("open");
  noteEditId = null;
}
function updateNoteCount() {
  const ta = document.getElementById("noteText");
  document.getElementById("noteCount").textContent = ta.value.length + "/299";
  document.getElementById("btnNoteSave").disabled = ta.value.trim().length === 0;
}
async function saveNoteFromModal() {
  const text = document.getElementById("noteText").value.trim();
  if (!text || noteEditId == null) return;
  const id = noteEditId;
  if (await saveNote(id, text)) { closeNoteModal(); refreshCardNoteUI(id); }
}
function deleteNoteFromModal() {
  if (noteEditId == null) return;
  const id = noteEditId;
  openConfirm("Удалить заметку?", "Удалённую заметку не получится восстановить", async () => {
    if (await deleteNote(id)) { closeNoteModal(); refreshCardNoteUI(id); }
  });
}

/* ОКНО ПОДТВЕРЖДЕНИЯ (переиспользуется, напр. для удаления заметки) */
let confirmCallback = null;
function openConfirm(title, sub, onConfirm) {
  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmSub").textContent = sub;
  confirmCallback = onConfirm;
  document.getElementById("confirmOverlay").classList.add("open");
}
function closeConfirm() {
  document.getElementById("confirmOverlay").classList.remove("open");
  confirmCallback = null;
}
async function runConfirm() {
  const cb = confirmCallback;
  closeConfirm();
  if (cb) await cb();
}

// точечно обновляет одну карточку в списке поиска после сохранения/удаления
// заметки — без полной перерисовки всего списка (та резко меняет высоту
// страницы на скелетонах и сбрасывает скролл наверх).
function refreshCardNoteUI(id) {
  const note = notesMap.get(id);

  // кнопки "заметка"/"избранное" — везде, где они есть для этого id
  // (карточка в списке И/ИЛИ шапка страницы объявления)
  document.querySelectorAll(`[data-note="${id}"]`).forEach(btn => {
    btn.textContent = "✏ " + (note ? "Редактировать заметку" : "Оставить заметку");
  });
  document.querySelectorAll(`[data-fav="${id}"]`).forEach(btn => {
    const on = favoriteIds.has(id);
    btn.classList.toggle("on", on);
    btn.textContent = favBtnLabel(on);
  });

  // превью заметки под карточкой — только в списке поиска
  const card = document.querySelector(`#listGrid .card[data-id="${id}"]`);
  if (!card) return;
  const block = card.closest(".card-block");
  let preview = block ? block.querySelector(".note-preview") : null;
  if (note) {
    if (!preview && block) {
      preview = document.createElement("div");
      preview.className = "note-preview";
      block.appendChild(preview);
    }
    if (preview) {
      preview.innerHTML = `<span>${escapeHtml(note)}</span><button class="note-preview-close" data-note-remove="${id}">✕</button>`;
      preview.querySelector("[data-note-remove]").addEventListener("click", (e) => {
        e.stopPropagation();
        openConfirm("Удалить заметку?", "Удалённую заметку не получится восстановить", async () => {
          if (await deleteNote(id)) refreshCardNoteUI(id);
        });
      });
    }
  } else if (preview) {
    preview.remove();
  }
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
  await refreshAuth(); if (currentView === "search") applyNow();
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
    await refreshAuth(); if (currentView === "search") applyNow();
    setTimeout(closeAuth, 700);
  } else {
    msg.className = "form-msg ok";
    msg.textContent = "Аккаунт создан. Проверь почту и подтверди email, потом войди.";
  }
}
async function logout() {
  await db.auth.signOut();
  currentUser = null; renderAuthUI();
  favMode = false;
  document.getElementById("navFav").classList.remove("active");
  await loadFavorites();
  await loadNotes();
  if (currentView === "search") applyNow();
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
    complex: row.complex, kitchenArea: row.kitchen_area, bathroom: row.bathroom,
    ceilingHeight: row.ceiling_height,
    doorType: row.door_type, parking: row.parking, balcony: row.balcony,
    kitchenStudio: row.kitchen_studio, security: row.security,
    sellerType: row.seller_type, pledged: row.pledged,
    exDormitory: row.ex_dormitory, exchange: row.exchange,
    date: "18 августа", views: Math.floor(Math.random() * 300),
  };
}

// строит запрос к базе из текущих фильтров.
// Каждый .eq/.gte/.lte — это условие, которое база применит сама.
function buildQuery(query) {
  // режим "Избранное" — показываем только лайкнутые объявления
  if (favMode) {
    const ids = [...favoriteIds];
    return query.in("id", ids.length ? ids : [-1]);   // -1 = ничего не найдётся
  }
  const f = getFilters();
  query = query.eq("deal_type", f.deal);
  if (f.city) query = query.eq("city", f.city);
  if (f.district) query = query.eq("district", f.district);
  if (f.complex) query = query.eq("complex", f.complex);
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
  if (f.floorsFrom) query = query.gte("floors_total", f.floorsFrom);
  if (f.floorsTo !== Infinity) query = query.lte("floors_total", f.floorsTo);
  if (f.kitchenFrom) query = query.gte("kitchen_area", f.kitchenFrom);
  if (f.kitchenTo !== Infinity) query = query.lte("kitchen_area", f.kitchenTo);
  if (f.yearFrom) query = query.gte("year_built", f.yearFrom);
  if (f.yearTo !== Infinity) query = query.lte("year_built", f.yearTo);
  if (f.houseType) query = query.eq("house_type", f.houseType);
  if (f.bathroom) query = query.eq("bathroom", f.bathroom);
  if (f.onlyPhoto) query = query.eq("has_photo", true);
  if (f.onlyNew) query = query.eq("is_new", true);
  if (f.onlyMine && currentUser) query = query.eq("user_id", currentUser.id);
  // seller_type: если выбрана только одна галочка — фильтруем; обе/ни одной — не фильтруем
  if (f.onlyOwner && !f.onlyAgency) query = query.eq("seller_type", "owner");
  if (f.onlyAgency && !f.onlyOwner) query = query.eq("seller_type", "agent");
  if (f.deal === "rent" && f.rentPeriod !== "any") query = query.eq("rent_period", f.rentPeriod);
  if (f.furnished === "yes") query = query.eq("furnished", true);
  if (f.furnished === "no") query = query.eq("furnished", false);
  if (f.pets) query = query.eq("pets_allowed", true);
  if (f.kids) query = query.eq("kids_allowed", true);
  if (f.noFirst) query = query.neq("floor", 1);
  if (f.noLast) query = query.eq("is_top_floor", false);
  if (f.pledged === "yes") query = query.eq("pledged", true);
  if (f.pledged === "no") query = query.eq("pledged", false);
  if (f.exDormitory === "yes") query = query.eq("ex_dormitory", true);
  if (f.exDormitory === "no") query = query.eq("ex_dormitory", false);
  if (f.exchange) query = query.eq("exchange", true);
  if (f.phoneFilter === "yes") query = query.not("phone", "is", null).neq("phone", "");
  if (f.phoneFilter === "no") query = query.or("phone.is.null,phone.eq.");
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
  const ceilingHeight = +document.getElementById("f_ceilingHeight").value || null;
  const floor = +document.getElementById("f_floor").value;
  const floorsTotal = +document.getElementById("f_floorsTotal").value;
  const price = +document.getElementById("f_price").value;
  const city = document.getElementById("f_city").value;
  const district = document.getElementById("f_district").value;
  const street = document.getElementById("f_street").value.trim();
  const complex = document.getElementById("f_complex").value || null;
  const houseType = document.getElementById("f_houseType").value;
  const yearBuilt = +document.getElementById("f_year").value || null;
  const condition = document.getElementById("f_condition").value;
  const doorType = document.getElementById("f_doorType").value;
  const parking = document.getElementById("f_parking").value;
  const balcony = document.getElementById("f_balcony").value;
  const phone = document.getElementById("f_phone").value.trim();
  const description = document.getElementById("f_desc").value.trim();
  const isNew = document.getElementById("f_isNew").value === "true";
  const rentPeriod = document.getElementById("f_rentPeriod").value;
  const furnished = document.getElementById("f_furnished").value === "yes";
  const kids = document.getElementById("f_kids").value === "true";
  const pets = document.getElementById("f_pets").value === "true";

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
    rooms, area, ceiling_height: ceilingHeight, floor, floors_total: floorsTotal, price,
    district, street, lat, lng, is_new: isNew, has_photo: images.length > 0, color,
    deal_type: dealType, house_type: houseType, year_built: yearBuilt,
    condition, door_type: doorType, parking, balcony, phone, description,
    rent_period: dealType === "rent" ? rentPeriod : "month",
    furnished, kids_allowed: kids, pets_allowed: pets,
    image_url: images[0] || null, images: images.length ? images : null, city, complex,
  });
  btn.disabled = false;
  if (error) { msg.className = "form-msg err"; msg.textContent = "Ошибка: " + error.message; return; }
  msg.className = "form-msg ok"; msg.textContent = "Готово! Объявление добавлено.";
  setDeal(dealType);
  setTimeout(() => { closeForm(); navigateToSearch(false); }, 900);
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

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* Строка общей информации карточки: В Залоге, ЖК/тип дома, год, состояние,
   санузел, телефон, остаток — описание. Максимум 150 символов. */
function buildCardInfoLine(item) {
  const attrs = [];
  attrs.push(item.complex ? `жилой комплекс ${item.complex}` : (item.houseType ? `${item.houseType} дом` : null));
  if (item.yearBuilt) attrs.push(`${item.yearBuilt} г.п.`);
  if (item.condition) attrs.push(`состояние: ${item.condition}`);
  if (item.bathroom) attrs.push(`санузел: ${item.bathroom}`);
  attrs.push(`телефон: ${item.phone ? "есть" : "нет"}`);
  const attrsPlain = attrs.filter(Boolean).join(", ");

  const pledgedPrefix = item.pledged ? "В Залоге, " : "";
  const budget = Math.max(0, 150 - pledgedPrefix.length);

  let rest = attrsPlain;
  if (item.description) rest += ", " + item.description;
  if (rest.length > budget) rest = rest.slice(0, Math.max(0, budget - 1)).trim() + "…";

  const pledgedHtml = item.pledged ? `<span class="card-pledged">В Залоге</span>, ` : "";
  return pledgedHtml + escapeHtml(rest);
}

function favBtnLabel(on) { return on ? "♥ В Избранном" : "♥ В Избранное"; }

function sellerBadgeHtml(item) {
  if (item.sellerType === "owner") return `<span class="seller-badge owner">Хозяин недвижимости</span>`;
  if (item.sellerType === "agent") return `<span class="seller-badge agent">Крыша Агент</span>`;
  return "";
}

/* ФИЛЬТРАЦИЯ */
let activeRooms = [];
let activeDeal = "sale";
let currentView = "home"; // "home" | "search"
function getFilters() {
  return {
    deal: activeDeal, rooms: activeRooms,
    city: document.getElementById("city").value,
    district: document.getElementById("district").value,
    complex: document.getElementById("complex").value,
    priceFrom: +document.getElementById("priceFrom").value || 0,
    priceTo: +document.getElementById("priceTo").value || Infinity,
    areaFrom: +document.getElementById("areaFrom").value || 0,
    areaTo: +document.getElementById("areaTo").value || Infinity,
    floorFrom: +document.getElementById("floorFrom").value || 0,
    floorTo: +document.getElementById("floorTo").value || Infinity,
    floorsFrom: +document.getElementById("floorsFrom").value || 0,
    floorsTo: +document.getElementById("floorsTo").value || Infinity,
    kitchenFrom: +document.getElementById("kitchenFrom").value || 0,
    kitchenTo: +document.getElementById("kitchenTo").value || Infinity,
    yearFrom: +document.getElementById("yearFrom").value || 0,
    yearTo: +document.getElementById("yearTo").value || Infinity,
    houseType: document.getElementById("houseType").value,
    bathroom: document.getElementById("bathroom").value,
    onlyPhoto: document.getElementById("onlyPhoto").checked,
    onlyNew: document.getElementById("onlyNew").checked,
    onlyOwner: document.getElementById("onlyOwner").checked,
    onlyAgency: document.getElementById("onlyAgency").checked,
    onlyMine: document.getElementById("onlyMine").checked,
    rentPeriod: document.getElementById("rentPeriod").value,
    furnished: document.getElementById("furnished").value,
    pets: document.getElementById("fPets").checked,
    kids: document.getElementById("fKids").checked,
    noFirst: document.getElementById("noFirst").checked,
    noLast: document.getElementById("noLast").checked,
    pledged: document.getElementById("pledged").value,
    exDormitory: document.getElementById("exDormitory").value,
    exchange: document.getElementById("exchange").checked,
    phoneFilter: document.getElementById("phoneFilter").value,
    text: document.getElementById("textSearch").value.trim().toLowerCase(),
  };
}
/* СПИСОК */
function renderList(items, total) {
  const grid = document.getElementById("listGrid");
  const cityName = document.getElementById("city").value;
  const dealLabel = activeDeal === "sale" ? "Продажа" : "Аренда";
  document.getElementById("listTitle").textContent = `${dealLabel} квартир в ${cityName}`;
  document.getElementById("listCount").textContent = "Найдено " + total.toLocaleString("ru-RU").replace(/,/g, " ") + " объявлений";
  if (!items.length) {
    grid.innerHTML = '<div class="empty">Ничего не найдено. Попробуйте изменить фильтры.</div>';
    return;
  }
  grid.innerHTML = items.map(item => {
    const mine = currentUser && item.userId === currentUser.id;
    const imgs = (item.images && item.images.length) ? item.images : (item.imageUrl ? [item.imageUrl] : []);
    const photo = imgs.length
      ? `<div class="photo" style="background-image:url('${imgs[0]}');background-size:cover;background-position:center">${imgs.length > 1 ? `<span class="photo-count">${imgs.length} фото</span>` : ""}</div>`
      : `<div class="photo" style="background:${item.color}"><span class="card-room-label">${item.rooms}-комн.</span></div>`;
    const infoLine = buildCardInfoLine(item);
    const seller = sellerBadgeHtml(item);
    const note = notesMap.get(item.id);
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
            <button class="fav-btn ${favoriteIds.has(item.id) ? "on" : ""}" data-fav="${item.id}">${favBtnLabel(favoriteIds.has(item.id))}</button>
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
      const state = await toggleFavorite(+el.dataset.fav);
      if (state === null) return;      // не вошёл
      if (favMode) return;             // список сам пересоберётся
      el.classList.toggle("on", state);
      el.textContent = favBtnLabel(state);
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
    marker.on("click", () => openListingInNewTab(item.id));
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
let sortBy = "new";   // new | cheap | exp
function applySort(query) {
  if (sortBy === "cheap") return query.order("price", { ascending: true });
  if (sortBy === "exp")   return query.order("price", { ascending: false });
  return query.order("created_at", { ascending: false });
}
async function update() {
  if (!initDb()) return;
  const from = (currentPage - 1) * PAGE_SIZE;   // первая строка страницы
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

  // select с count:"exact" — база вернёт и данные, и общее число найденных
  let query = buildQuery(db.from("listings").select("*", { count: "exact" }));
  query = applySort(query).range(from, to);

  const { data, error, count } = await query;
  if (error) { showBanner("Ошибка запроса: " + error.message); return; }

  totalCount = count || 0;
  const items = (data || []).map(rowToItem);
  renderList(items, totalCount);
  renderMarkers(items);          // на карте — только текущая страница
  renderPager(totalCount);
  const applyBtn = document.getElementById("btnApply");
  if (applyBtn) applyBtn.textContent =
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
   ДВУХСТРАНИЧНАЯ НАВИГАЦИЯ
   ========================================================= */
function showHomeView() {
  currentView = "home";
  // На случай перехода со страницы объявления — возвращаем панель фильтров и прячем объявление
  document.querySelector(".filters").style.display = "";
  document.getElementById("detail").classList.remove("open");
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

function showSearchView(mapMode) {
  currentView = "search";
  // На случай перехода со страницы объявления — возвращаем панель фильтров и прячем объявление
  document.querySelector(".filters").style.display = "";
  document.getElementById("detail").classList.remove("open");
  // Скрываем переключатель Купить/Арендовать
  document.getElementById("deal").style.display = "none";
  // Показываем поисковые метки ("Квартиры" — только для Продажи, у Аренды на этом месте период)
  document.querySelectorAll(".fls-prefix,.fls-suffix,.fls-tg").forEach(el => el.style.display = "");
  document.querySelector(".fls-prefix").style.display = activeDeal === "rent" ? "none" : "";
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

function navigateToSearch(mapMode) {
  const p = serializeFilters();
  if (mapMode) p.set("map", "1");
  history.pushState({ view: "search" }, "", "?" + p.toString());
  showSearchView(mapMode);
}

function serializeFilters() {
  const p = new URLSearchParams();
  p.set("view", "search");
  p.set("deal", activeDeal);
  const city = document.getElementById("city").value;
  if (city) p.set("city", city);
  const district = document.getElementById("district").value;
  if (district) p.set("district", district);
  if (activeRooms.length) p.set("rooms", activeRooms.join(","));
  const pf = document.getElementById("priceFrom").value;
  const pt = document.getElementById("priceTo").value;
  if (pf) p.set("pf", pf);
  if (pt) p.set("pt", pt);
  const af = document.getElementById("areaFrom").value;
  const at = document.getElementById("areaTo").value;
  if (af) p.set("af", af);
  if (at) p.set("at", at);
  const ff = document.getElementById("floorFrom").value;
  const ft = document.getElementById("floorTo").value;
  if (ff) p.set("ff", ff);
  if (ft) p.set("ft", ft);
  const complex = document.getElementById("complex").value;
  if (complex) p.set("complex", complex);
  const ht = document.getElementById("houseType").value;
  if (ht) p.set("ht", ht);
  const bath = document.getElementById("bathroom").value;
  if (bath) p.set("bath", bath);
  const yf = document.getElementById("yearFrom").value;
  const yt = document.getElementById("yearTo").value;
  if (yf) p.set("yf", yf);
  if (yt) p.set("yt", yt);
  const flsf = document.getElementById("floorsFrom").value;
  const flst = document.getElementById("floorsTo").value;
  if (flsf) p.set("flsf", flsf);
  if (flst) p.set("flst", flst);
  const kf = document.getElementById("kitchenFrom").value;
  const kt = document.getElementById("kitchenTo").value;
  if (kf) p.set("kf", kf);
  if (kt) p.set("kt", kt);
  if (document.getElementById("onlyPhoto").checked) p.set("photo", "1");
  if (document.getElementById("onlyNew").checked) p.set("new", "1");
  if (document.getElementById("onlyOwner").checked) p.set("owner", "1");
  if (document.getElementById("onlyAgency").checked) p.set("agency", "1");
  const rp = document.getElementById("rentPeriod").value;
  if (rp && rp !== "any") p.set("rp", rp);
  const furn = document.getElementById("furnished").value;
  if (furn && furn !== "any") p.set("furn", furn);
  if (document.getElementById("fKids").checked) p.set("kids", "1");
  if (document.getElementById("fPets").checked) p.set("pets", "1");
  if (document.getElementById("noFirst").checked) p.set("nof", "1");
  if (document.getElementById("noLast").checked) p.set("nol", "1");
  const pledged = document.getElementById("pledged").value;
  if (pledged) p.set("pledged", pledged);
  const exDorm = document.getElementById("exDormitory").value;
  if (exDorm) p.set("exdorm", exDorm);
  if (document.getElementById("exchange").checked) p.set("exchange", "1");
  const phoneF = document.getElementById("phoneFilter").value;
  if (phoneF) p.set("phonef", phoneF);
  const txt = document.getElementById("textSearch").value.trim();
  if (txt) p.set("q", txt);
  return p;
}

function deserializeFilters(p) {
  const deal = p.get("deal") || "sale";
  activeDeal = deal;
  document.querySelectorAll("#deal button").forEach(b => b.classList.toggle("on", b.dataset.d === deal));
  document.getElementById("navSale").classList.toggle("active", deal === "sale");
  document.getElementById("navRent").classList.toggle("active", deal === "rent");
  applyDealVisibility(deal);

  const city = p.get("city") || "Алматы";
  document.getElementById("city").value = city;
  fillDistricts(document.getElementById("district"), city, true);
  fillComplexes(city);
  const district = p.get("district") || "";
  document.getElementById("district").value = district;
  const label = district ? `${city}, ${district} ▾` : `${city} ▾`;
  document.getElementById("cityBtn").textContent = label;

  activeRooms = (p.get("rooms") || "").split(",").filter(Boolean).map(Number);
  document.querySelectorAll("#rooms button").forEach(b => {
    b.classList.toggle("on", activeRooms.includes(+b.dataset.r));
  });

  document.getElementById("priceFrom").value = p.get("pf") || "";
  document.getElementById("priceTo").value = p.get("pt") || "";
  document.getElementById("areaFrom").value = p.get("af") || "";
  document.getElementById("areaTo").value = p.get("at") || "";
  document.getElementById("floorFrom").value = p.get("ff") || "";
  document.getElementById("floorTo").value = p.get("ft") || "";
  document.getElementById("floorsFrom").value = p.get("flsf") || "";
  document.getElementById("floorsTo").value = p.get("flst") || "";
  document.getElementById("kitchenFrom").value = p.get("kf") || "";
  document.getElementById("kitchenTo").value = p.get("kt") || "";
  document.getElementById("yearFrom").value = p.get("yf") || "";
  document.getElementById("yearTo").value = p.get("yt") || "";
  document.getElementById("houseType").value = p.get("ht") || "";
  document.getElementById("bathroom").value = p.get("bath") || "";
  document.getElementById("complex").value = p.get("complex") || "";
  document.getElementById("onlyPhoto").checked = p.get("photo") === "1";
  document.getElementById("onlyNew").checked = p.get("new") === "1";
  document.getElementById("onlyOwner").checked = p.get("owner") === "1";
  document.getElementById("onlyAgency").checked = p.get("agency") === "1";
  document.getElementById("rentPeriod").value = p.get("rp") || "any";
  document.getElementById("furnished").value = p.get("furn") || "any";
  document.getElementById("fKids").checked = p.get("kids") === "1";
  document.getElementById("fPets").checked = p.get("pets") === "1";
  document.getElementById("noFirst").checked = p.get("nof") === "1";
  document.getElementById("noLast").checked = p.get("nol") === "1";
  document.getElementById("pledged").value = p.get("pledged") || "";
  document.getElementById("exDormitory").value = p.get("exdorm") || "";
  document.getElementById("exchange").checked = p.get("exchange") === "1";
  document.getElementById("phoneFilter").value = p.get("phonef") || "";
  document.getElementById("textSearch").value = p.get("q") || "";
}

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
    <span class="fav ${favoriteIds.has(item.id) ? "on" : ""}" data-fav="${item.id}">♥</span>
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
      const state = await toggleFavorite(+el.dataset.fav);
      if (state !== null) el.classList.toggle("on", state);
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

async function loadHotOffers() {
  if (!initDb()) return;
  const gridSale = document.getElementById("hotGridSale");
  const gridRent = document.getElementById("hotGridRent");
  gridSale.innerHTML = skeletonCards;

  const [resSale, resRent] = await Promise.all([
    db.from("listings").select("*").eq("deal_type", "sale").order("created_at", { ascending: false }).limit(6),
    db.from("listings").select("*").eq("deal_type", "rent").order("created_at", { ascending: false }).limit(6),
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

/* =========================================================
   СТРАНИЦА ОБЪЯВЛЕНИЯ
   Открывается при клике на карточку или точку на карте.
   ========================================================= */
let detailMap = null, detailMarker = null;

// заголовок, кнопки и цена — своя функция, чтобы дёргать отдельно из refreshCardNoteUI не пришлось:
// кнопки достаточно перерисовать через data-note/data-fav (см. refreshCardNoteUI)
function renderListingContent(item) {
  const dealLabel = item.dealType === "rent" ? "Аренда" : "Продажа";
  document.getElementById("detailBreadcrumbs").innerHTML = `
    <a href="${location.pathname}">baspana.kz</a>
    <span>/</span>
    <a href="${location.pathname}?view=search&deal=${item.dealType}">${dealLabel} квартир</a>`;

  const note = notesMap.get(item.id);
  const favOn = favoriteIds.has(item.id);
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
    const state = await toggleFavorite(item.id);
    if (state === null) return;
    e.currentTarget.classList.toggle("on", state);
    e.currentTarget.textContent = favBtnLabel(state);
  });

  document.getElementById("detailInfo").innerHTML = item.dealType === "rent" ? `
    <div class="attr"><span class="k">Город</span><span class="v">${item.city}, ${item.district} р-н</span></div>
    ${item.complex ? `<div class="attr"><span class="k">Жилой комплекс</span><span class="v">${item.complex}</span></div>` : ""}
    <div class="attr"><span class="k">Год постройки</span><span class="v">${item.yearBuilt || "—"}</span></div>
    <div class="attr"><span class="k">Этаж</span><span class="v">${item.floor} из ${item.floorsTotal}</span></div>
    <div class="attr"><span class="k">Площадь</span><span class="v">${item.area} м²</span></div>
    ${item.kitchenStudio != null ? `<div class="attr"><span class="k">Кухня студия</span><span class="v">${item.kitchenStudio ? "да" : "нет"}</span></div>` : ""}
    <div class="attr"><span class="k">Состояние</span><span class="v">${item.condition || "—"}</span></div>
    ${item.furnished != null ? `<div class="attr"><span class="k">Квартира меблирована</span><span class="v">${item.furnished ? "да" : "нет"}</span></div>` : ""}
    ${item.security ? `<div class="attr"><span class="k">Безопасность</span><span class="v">${item.security}</span></div>` : ""}
    ${item.exDormitory != null ? `<div class="attr"><span class="k">Бывшее общежитие</span><span class="v">${item.exDormitory ? "да" : "нет"}</span></div>` : ""}
  ` : `
    <div class="attr"><span class="k">Город</span><span class="v">${item.city}, ${item.district} р-н</span></div>
    <div class="attr"><span class="k">Тип дома</span><span class="v">${item.houseType || "—"}</span></div>
    ${item.complex ? `<div class="attr"><span class="k">Жилой комплекс</span><span class="v">${item.complex}</span></div>` : ""}
    <div class="attr"><span class="k">Год постройки</span><span class="v">${item.yearBuilt || "—"}</span></div>
    <div class="attr"><span class="k">Этаж</span><span class="v">${item.floor} из ${item.floorsTotal}</span></div>
    <div class="attr"><span class="k">Площадь</span><span class="v">${item.area} м²</span></div>
    <div class="attr"><span class="k">Состояние</span><span class="v">${item.condition || "—"}</span></div>
    ${item.bathroom ? `<div class="attr"><span class="k">Санузел</span><span class="v">${item.bathroom}</span></div>` : ""}
    ${item.ceilingHeight ? `<div class="attr"><span class="k">Высота потолков</span><span class="v">${item.ceilingHeight} м</span></div>` : ""}
    ${item.doorType ? `<div class="attr"><span class="k">Дверь</span><span class="v">${item.doorType}</span></div>` : ""}
    ${item.parking ? `<div class="attr"><span class="k">Парковка</span><span class="v">${item.parking}</span></div>` : ""}
    ${item.balcony ? `<div class="attr"><span class="k">Балкон</span><span class="v">${item.balcony}</span></div>` : ""}`;

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

  renderSimilar(item);
}

// показывает страницу объявления: прячет витрину/поиск/панель фильтров,
// показывает #detail (обычный раздел страницы, не оверлей)
function showListingSection() {
  currentView = "listing";
  document.querySelector(".filters").style.display = "none";
  document.getElementById("hotSection").style.display = "none";
  document.getElementById("searchContent").style.display = "none";
  document.getElementById("detail").classList.add("open");
}

// переход на другое объявление той же вкладкой (напр. клик по "похожему") —
// объект уже есть на руках, запрос к базе не нужен
function navigateToListingItem(item) {
  history.pushState({ view: "listing", listing: item.id }, "", location.pathname + "?listing=" + item.id);
  showListingSection();
  renderListingContent(item);
}

// Загружает одно объявление из базы по ID и показывает его.
// Используется при первом открытии страницы и при Назад/Вперёд в браузере.
async function loadAndOpenListing(id) {
  if (!initDb()) return;
  const { data, error } = await db.from("listings").select("*").eq("id", id).single();
  if (error || !data) { showBanner("Объявление не найдено."); return; }
  showListingSection();
  renderListingContent(rowToItem(data));
}

// открыть объявление в новой вкладке (клик по карточке в списке/на карте)
function openListingInNewTab(id) {
  window.open(location.pathname + "?listing=" + id, "_blank");
}

/* ЛАЙТБОКС */
let lbImgs = [], lbIdx = 0;
function openLightbox(imgs, startIdx) {
  lbImgs = imgs; lbIdx = startIdx;
  document.getElementById("lbImg").src = lbImgs[lbIdx];
  const hasMult = lbImgs.length > 1;
  document.getElementById("lbPrev").style.display = hasMult ? "" : "none";
  document.getElementById("lbNext").style.display = hasMult ? "" : "none";
  document.getElementById("lightbox").classList.add("open");
}
function lbGo(dir) {
  lbIdx = (lbIdx + dir + lbImgs.length) % lbImgs.length;
  document.getElementById("lbImg").src = lbImgs[lbIdx];
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
async function renderSimilar(item) {
  const el = document.getElementById("detailSimilar");
  if (!el || !initDb()) return;
  el.innerHTML = "";
  const { data } = await db.from("listings").select("*")
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

/* ПЕРЕКЛЮЧЕНИЕ ТИПА СДЕЛКИ */
// переставляет общие поля (ЖК, площадь, этаж, чекбоксы этажа, поиск по тексту)
// между сеткой Продажи и сеткой Аренды — сами элементы не пересоздаются,
// просто переезжают в нужный контейнер (как и filterRowChecks выше).
function layoutFiltersForDeal(d) {
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
function positionRentPeriod() {
  const rentOnly = document.getElementById("rentOnly");
  const row1 = document.getElementById("filterRow1");
  const priceLabel = document.getElementById("priceLabel");
  if (currentView === "search" && activeDeal === "rent") {
    row1.insertBefore(rentOnly, row1.firstChild);
  } else {
    row1.insertBefore(rentOnly, priceLabel);
  }
}

// всё, что зависит только от типа сделки (не от текущего вида страницы)
function applyDealVisibility(d) {
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

function setDeal(d) {
  activeDeal = d;
  favMode = false;
  document.getElementById("navFav").classList.remove("active");
  document.querySelectorAll("#deal button").forEach(b => b.classList.toggle("on", b.dataset.d === d));
  document.getElementById("navSale").classList.toggle("active", d === "sale");
  document.getElementById("navRent").classList.toggle("active", d === "rent");
  applyDealVisibility(d);
  if (currentView === "search") {
    document.querySelector(".fls-prefix").style.display = d === "rent" ? "none" : "";
  }
  positionRentPeriod();
  document.getElementById("priceFrom").value = "";
  document.getElementById("priceTo").value = "";
  updateCount();
}

/* ДИНАМИЧЕСКИЙ СЧЁТЧИК КНОПКИ "Показать результаты" */
let _countTimer = null;
async function updateCount() {
  if (currentView !== "search" || !initDb()) return;
  const { count } = await buildQuery(
    db.from("listings").select("*", { count: "exact", head: true })
  );
  const btn = document.getElementById("btnApply");
  btn.textContent = count !== null
    ? `Показать результаты (${count.toLocaleString("ru-RU")})`
    : "Показать результаты";
}
function scheduleCount() {
  clearTimeout(_countTimer);
  _countTimer = setTimeout(updateCount, 250);
}

/* ОКНА */
function openForm() {
  if (!currentUser) { openAuth("Сначала войди, чтобы подать объявление."); return; }
  document.getElementById("formMsg").textContent = "";
  // Синхронизируем тип сделки с текущим активным
  const dealHidden = document.getElementById("f_deal");
  dealHidden.value = activeDeal;
  document.querySelectorAll(".toggle-group[data-field='f_deal'] .toggle-btn").forEach(b => {
    b.classList.toggle("on", b.dataset.val === activeDeal);
  });
  updateFormDeal();
  document.getElementById("formPage").classList.add("open");
  window.scrollTo(0, 0);
}
function closeForm() {
  document.getElementById("formPage").classList.remove("open");
}
function openAuth(hint) {
  document.getElementById("authMsg").textContent = "";
  document.getElementById("authSub").textContent = hint || "Войди или создай аккаунт, чтобы подавать объявления.";
  document.getElementById("authOverlay").classList.add("open");
}
function closeAuth() { document.getElementById("authOverlay").classList.remove("open"); }
function updateFormDeal() {
  const isRent = document.getElementById("f_deal").value === "rent";
  document.getElementById("priceHint").textContent = isRent ? "(за месяц/сутки/час)" : "";
  document.getElementById("f_rentOnly").style.display = isRent ? "flex" : "none";
  document.getElementById("f_rentChecks").style.display = isRent ? "block" : "none";
}

// Обработчики для тег-кнопок, переключателей и Да/Нет
document.querySelectorAll(".tag-group, .toggle-group, .yn-group").forEach(group => {
  const fieldId = group.dataset.field;
  group.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      group.querySelectorAll("button").forEach(b => b.classList.remove("on"));
      btn.classList.add("on");
      if (fieldId) document.getElementById(fieldId).value = btn.dataset.val;
      if (fieldId === "f_deal") updateFormDeal();
    });
  });
});

// Превью фото при выборе файлов
document.getElementById("f_photo").addEventListener("change", () => {
  const preview = document.getElementById("f_photoPreview");
  preview.innerHTML = "";
  Array.from(document.getElementById("f_photo").files).forEach(file => {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    preview.appendChild(img);
  });
});

/* КНОПКИ И ПОЛЯ */
document.querySelectorAll("#deal button").forEach(btn => btn.addEventListener("click", () => setDeal(btn.dataset.d)));
document.getElementById("navSale").addEventListener("click", () => { setDeal("sale"); showHomeView(); });
document.getElementById("navRent").addEventListener("click", () => { setDeal("rent"); showHomeView(); });
document.getElementById("navFav").addEventListener("click", () => {
  if (!currentUser) { openAuth("Войди, чтобы смотреть избранное."); return; }
  favMode = !favMode;
  document.getElementById("navFav").classList.toggle("active", favMode);
  document.getElementById("navSale").classList.toggle("active", !favMode && activeDeal === "sale");
  document.getElementById("navRent").classList.toggle("active", !favMode && activeDeal === "rent");
  if (currentView === "search") { showList(); applyNow(); }
  else navigateToSearch(false);
});
document.getElementById("logo").addEventListener("click", () => {
  if (currentView === "listing") {
    location.href = location.pathname;
  } else if (currentView === "search") {
    showHomeView();
  }
});

document.querySelectorAll("#sortBar button").forEach(btn => {
  btn.addEventListener("click", () => {
    sortBy = btn.dataset.sort;
    document.querySelectorAll("#sortBar button").forEach(b => b.classList.toggle("on", b === btn));
    applyNow();
  });
});

document.querySelectorAll("#rooms button").forEach(btn => {
  btn.addEventListener("click", () => {
    const r = +btn.dataset.r;
    btn.classList.toggle("on");
    if (activeRooms.includes(r)) activeRooms = activeRooms.filter(x => x !== r);
    else activeRooms.push(r);
    if (currentView === "search") updateCount();
  });
});

// Счётчик: изменение фильтров → обновить число в кнопке
const _filtersEl = document.querySelector(".filters");
_filtersEl.addEventListener("change", () => { if (currentView === "search") updateCount(); });
_filtersEl.addEventListener("input", e => {
  if (currentView === "search" && e.target.tagName === "INPUT") scheduleCount();
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

// заполняет список ЖК для выбранного города
const complexFilter = document.getElementById("complex");
const complexForm = document.getElementById("f_complex");
function fillComplexes(city) {
  complexFilter.innerHTML = '<option value="">Любой ЖК</option>';
  complexForm.innerHTML = '<option value="">— не указан —</option>';
  (COMPLEXES[city] || []).forEach(name => {
    const o1 = document.createElement("option"); o1.value = name; o1.textContent = name; complexFilter.appendChild(o1);
    const o2 = document.createElement("option"); o2.value = name; o2.textContent = name; complexForm.appendChild(o2);
  });
}

// селект города в фильтрах
const citySel = document.getElementById("city");
const districtSel = document.getElementById("district");
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

// селект города в форме
const cityForm = document.getElementById("f_city");
const districtForm = document.getElementById("f_district");
cityNames.forEach(c => { const o = document.createElement("option"); o.value = c; o.textContent = c; cityForm.appendChild(o); });
cityForm.value = "Алматы";
fillDistricts(districtForm, "Алматы", false);
cityForm.addEventListener("change", () => {
  fillDistricts(districtForm, cityForm.value, false);
  fillComplexes(cityForm.value);
});

document.getElementById("btnResults").addEventListener("click", () => navigateToSearch(false));
document.getElementById("btnApply").addEventListener("click", () => { currentPage = 1; update(); });
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
  activeRooms = [];
  document.querySelectorAll("#rooms button").forEach(b => b.classList.remove("on"));
  ["district","priceFrom","priceTo","areaFrom","areaTo","floorFrom","floorTo",
   "floorsFrom","floorsTo","kitchenFrom","kitchenTo","yearFrom","yearTo"].forEach(id => document.getElementById(id).value = "");
  ["houseType","bathroom","complex"].forEach(id => document.getElementById(id).value = "");
  ["onlyPhoto","onlyNew","onlyOwner","onlyAgency","onlyMine","fPets","fKids","noFirst","noLast","exchange"].forEach(id => document.getElementById(id).checked = false);
  document.getElementById("rentPeriod").value = "any";
  document.getElementById("furnished").value = "any";
  document.getElementById("pledged").value = "";
  document.getElementById("exDormitory").value = "";
  document.getElementById("textSearch").value = "";
  document.getElementById("phoneFilter").value = "";
  applyNow();
  updateCount();
});

document.getElementById("btnOpenForm").addEventListener("click", () => openForm());
document.getElementById("btnCancel").addEventListener("click", closeForm);
document.getElementById("btnSubmit").addEventListener("click", submitListing);
document.getElementById("btnSignIn").addEventListener("click", signIn);
document.getElementById("btnSignUp").addEventListener("click", signUp);
document.getElementById("authClose").addEventListener("click", closeAuth);
document.getElementById("authOverlay").addEventListener("click", (e) => { if (e.target.id === "authOverlay") closeAuth(); });

/* МОДАЛЬНОЕ ОКНО ЗАМЕТКИ */
document.getElementById("noteText").addEventListener("input", updateNoteCount);
document.getElementById("btnNoteSave").addEventListener("click", saveNoteFromModal);
document.getElementById("btnNoteDelete").addEventListener("click", deleteNoteFromModal);
document.getElementById("noteClose").addEventListener("click", closeNoteModal);
document.getElementById("noteOverlay").addEventListener("click", (e) => { if (e.target.id === "noteOverlay") closeNoteModal(); });

/* МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ */
document.getElementById("btnConfirmOk").addEventListener("click", runConfirm);
document.getElementById("btnConfirmCancel").addEventListener("click", closeConfirm);
document.getElementById("confirmOverlay").addEventListener("click", (e) => { if (e.target.id === "confirmOverlay") closeConfirm(); });

/* МОДАЛЬНОЕ ОКНО ВЫБОРА ГОРОДА */
let modalCity = "Алматы";
let modalDistrict = "";

function renderCityModal() {
  const cityList = document.getElementById("cityModalList");
  const distList = document.getElementById("districtModalList");

  cityList.innerHTML = Object.keys(CITIES).map(c =>
    `<li class="city-option${c === modalCity ? " active" : ""}" data-city="${c}">${c}</li>`
  ).join("");

  cityList.querySelectorAll(".city-option").forEach(el => {
    el.addEventListener("click", () => {
      modalCity = el.dataset.city;
      modalDistrict = "";
      renderCityModal();
    });
  });

  const districts = Object.keys(CITIES[modalCity].districts);
  distList.innerHTML =
    `<li class="dist-option${modalDistrict === "" ? " active" : ""}" data-dist="">Все районы</li>` +
    districts.map(d =>
      `<li class="dist-option${d === modalDistrict ? " active" : ""}" data-dist="${d}">${d}</li>`
    ).join("");

  distList.querySelectorAll(".dist-option").forEach(el => {
    el.addEventListener("click", () => {
      modalDistrict = el.dataset.dist;
      distList.querySelectorAll(".dist-option").forEach(x => x.classList.remove("active"));
      el.classList.add("active");
    });
  });
}

function openCityModal() {
  modalCity = citySel.value || "Алматы";
  modalDistrict = districtSel.value || "";
  renderCityModal();
  document.getElementById("cityModal").classList.add("open");
}

function closeCityModal() {
  document.getElementById("cityModal").classList.remove("open");
}

document.getElementById("cityBtn").addEventListener("click", openCityModal);
document.getElementById("cityModalClose").addEventListener("click", closeCityModal);
document.getElementById("cityModal").addEventListener("click", e => {
  if (e.target.id === "cityModal") closeCityModal();
});

document.getElementById("cityModalSelect").addEventListener("click", () => {
  citySel.value = modalCity;
  fillDistricts(districtSel, modalCity, true);
  districtSel.value = modalDistrict;
  fillComplexes(modalCity);
  const c = CITIES[modalCity];
  map.setView(c.center, c.zoom);
  const label = modalDistrict ? `${modalCity}, ${modalDistrict} ▾` : `${modalCity} ▾`;
  document.getElementById("cityBtn").textContent = label;
  closeCityModal();
  updateCount();
});

document.getElementById("btnMapInline").addEventListener("click", () => navigateToSearch(true));

/* СТАРТ */
// разбирает текущий URL и показывает нужный вид: страницу объявления
// (?listing=id), поиск (?view=search&...) или главную
async function routeFromUrl() {
  const p = new URLSearchParams(location.search);
  const listingId = parseInt(p.get("listing"));
  if (listingId) {
    await loadAndOpenListing(listingId);
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
