import { state } from "./state.js";
import { CITIES, COLORS } from "./config.js";
import { initDb } from "./db.js";
import { openAuth } from "./auth.js";
import { fillDistricts, fillComplexes, setDeal, navigateToSearch } from "./search-view.js";
import { applyNow } from "./search-list.js";

/* ОКНА */
// ШАГ 1: выбор категории (Продать / Сдать в аренду)
// прячет витрину/поиск/страницу объявления — но НЕ шапку сайта,
// она должна оставаться видна на всех шагах подачи объявления
function hideOtherSections() {
  document.querySelector(".filters").style.display = "none";
  document.getElementById("hotSection").style.display = "none";
  document.getElementById("searchContent").style.display = "none";
  document.getElementById("detail").classList.remove("open");
  document.getElementById("complexPage").classList.remove("open");
  // на форме подачи объявления мы не на Продаже/Аренде/Избранном — снимаем подсветку
  document.getElementById("navSale").classList.remove("active");
  document.getElementById("navRent").classList.remove("active");
  document.getElementById("navFav").classList.remove("active");
}

export function openFormCategory() {
  if (!state.currentUser) { openAuth("Сначала войди, чтобы подать объявление."); return; }
  state.currentView = "form";
  hideOtherSections();
  document.getElementById("formPage").classList.remove("open");
  document.getElementById("formCategory").classList.add("open");
  window.scrollTo(0, 0);
}
function closeFormCategory() {
  document.getElementById("formCategory").classList.remove("open");
}

// ШАГ 2: сама форма — открывается после выбора категории на шаге 1
export function chooseCategory(deal) {
  state.currentView = "form";
  hideOtherSections();
  closeFormCategory();
  document.getElementById("formMsg").textContent = "";
  resetFormFields();
  document.getElementById("f_deal").value = deal;
  document.getElementById("formBreadcrumb").textContent = deal === "rent" ? "Сдать в аренду > Квартиру" : "Продать > Квартиру";
  updateFormDeal();
  document.getElementById("formPage").classList.add("open");
  window.scrollTo(0, 0);
  initFormMap(document.getElementById("f_city").value);
}
function closeForm() {
  document.getElementById("formPage").classList.remove("open");
}

// ставит группе (choice-group/yn-link-group/tag-group/seller-type-cards)
// значение по умолчанию — и в скрытое поле, и подсвечивает нужную кнопку
function setGroupDefault(fieldId, val) {
  document.getElementById(fieldId).value = val;
  document.querySelectorAll(`[data-field="${fieldId}"] button`).forEach(b => b.classList.toggle("on", b.dataset.val === val));
}

// возвращает форму к пустому состоянию перед новым объявлением
function resetFormFields() {
  document.querySelectorAll("#formPage .choice-group button, #formPage .yn-link-group button, #formPage .seller-type-cards button")
    .forEach(b => b.classList.remove("on"));
  setGroupDefault("f_pledged", "false");
  setGroupDefault("f_exDormitory", "false");
  setGroupDefault("f_isNew", "false");
  setGroupDefault("f_kids", "false");
  setGroupDefault("f_pets", "false");
  setGroupDefault("f_balconyGlazed", "false");
  setGroupDefault("f_exchange", "false");
  setGroupDefault("f_sellerType", "owner");
  setGroupDefault("f_rentPeriod", "month");
  ["f_houseType", "f_condition", "f_phoneLine", "f_internet", "f_bathroom", "f_balcony", "f_doorType", "f_parking", "f_furnished", "f_floorType"]
    .forEach(id => document.getElementById(id).value = "");
  document.getElementById("f_houseTypeSelect").value = "";
  document.querySelectorAll('#formPage input[type=text], #formPage input[type=number]').forEach(i => i.value = "");
  document.querySelectorAll(".f_security, .f_feature").forEach(cb => cb.checked = false);
  document.getElementById("f_kitchenStudio").checked = false;
  document.getElementById("f_hideHouseNumber").checked = false;
  document.getElementById("f_agree").checked = true;
  document.getElementById("f_photoPreview").innerHTML = "";
  document.getElementById("f_photo").value = "";
  document.getElementById("f_descCount").textContent = "2000";
  document.getElementById("f_phonesList").innerHTML = '<div class="fp-phone-row"><input type="text" class="f_phone fp-input" placeholder="+7 777 123 45 67"></div>';
  watchPhoneInput(document.querySelector(".f_phone"));
  document.querySelectorAll("#formPage .fp-field.has-error").forEach(f => f.classList.remove("has-error"));
  showFormToast([]);
}

// обязательные поля страницы "Продать квартиру" — как у krisha.kz:
// подсвечиваем каждое пустое поле красным + текст ошибки под ним,
// и собираем список для тёмного попапа в углу
const REQUIRED_FIELDS = [
  { id: "f_rooms", label: "Количество комнат", check: () => +document.getElementById("f_rooms").value > 0, message: "Обязательное поле" },
  { id: "f_price", label: "Цена", check: () => +document.getElementById("f_price").value > 0, message: "Введите цену, например, 12 000 000 ₸" },
  { id: "f_year", label: "Год постройки (сдачи в эксплуатацию)", check: () => +document.getElementById("f_year").value > 0, message: "Обязательное поле" },
  { id: "f_area", label: "Общая площадь", check: () => +document.getElementById("f_area").value > 0, message: "Обязательное поле" },
  { id: "f_floor", label: "Этаж", check: () => +document.getElementById("f_floor").value > 0 && +document.getElementById("f_floorsTotal").value > 0, message: "Обязательное поле" },
  { id: "f_street", label: "Улица или микрорайон", check: () => document.getElementById("f_street").value.trim().length > 0, message: "Обязательное поле" },
  { id: "f_houseNumber", label: "№ дома", check: () => document.getElementById("f_houseNumber").value.trim().length > 0, message: "Обязательное поле" },
  { id: "fieldPhones", label: "Телефоны", check: () => Array.from(document.querySelectorAll(".f_phone")).some(i => i.value.trim()), message: "Укажите хотя бы один телефон" },
];
function fieldWrapper(id) {
  const el = document.getElementById(id);
  return el.classList.contains("fp-field") ? el : el.closest(".fp-field");
}
function setFieldError(id, message) {
  const field = fieldWrapper(id);
  let err = field.querySelector(".fp-error");
  if (message) {
    if (!err) { err = document.createElement("div"); err.className = "fp-error"; field.appendChild(err); }
    err.textContent = message;
    field.classList.add("has-error");
  } else {
    field.classList.remove("has-error");
  }
}
function validateRequiredFields() {
  const missing = [];
  REQUIRED_FIELDS.forEach(f => {
    const ok = f.check();
    setFieldError(f.id, ok ? "" : f.message);
    if (!ok) missing.push(f.label);
  });
  return missing;
}
function showFormToast(missing) {
  const toast = document.getElementById("formToast");
  clearTimeout(showFormToast._timer);
  if (!missing.length) { toast.style.display = "none"; return; }
  document.getElementById("formToastList").innerHTML = missing.map(m => `<li>${m}</li>`).join("");
  toast.style.display = "flex";
  showFormToast._timer = setTimeout(() => { toast.style.display = "none"; }, 6000);
}
// снимаем подсветку с поля, как только его исправили
// (для "Этаж" слушаем оба инпута — этаж и этажей в доме)
REQUIRED_FIELDS.forEach(f => {
  const el = document.getElementById(f.id);
  if (el.classList.contains("fp-field")) return;
  fieldWrapper(f.id).querySelectorAll("input").forEach(inp => {
    inp.addEventListener("input", () => { if (f.check()) setFieldError(f.id, ""); });
  });
});
function watchPhoneInput(inp) {
  inp.addEventListener("input", () => { if (REQUIRED_FIELDS.find(f => f.id === "fieldPhones").check()) setFieldError("fieldPhones", ""); });
}

function updateFormDeal() {
  const isRent = document.getElementById("f_deal").value === "rent";
  document.getElementById("priceHint").textContent = isRent ? "(за месяц/сутки/час)" : "";
  document.getElementById("f_rentOnly").style.display = isRent ? "flex" : "none";
  document.getElementById("f_rentChecks").style.display = isRent ? "block" : "none";
}

// Обработчики для тег-кнопок, переключателей, Да/Нет, характеристик-ссылок и карточек продавца
document.querySelectorAll(".tag-group, .toggle-group, .yn-group, .choice-group, .yn-link-group, .seller-type-cards").forEach(group => {
  const fieldId = group.dataset.field;
  group.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      group.querySelectorAll("button").forEach(b => b.classList.remove("on"));
      btn.classList.add("on");
      if (fieldId) document.getElementById(fieldId).value = btn.dataset.val;
    });
  });
});

// "Тип строения" — обычный select, синхронизируем со скрытым полем
document.getElementById("f_houseTypeSelect").addEventListener("change", (e) => {
  document.getElementById("f_houseType").value = e.target.value;
});

// Превью фото при выборе файлов (клик по зоне или перетаскивание)
function renderPhotoPreview(files) {
  const preview = document.getElementById("f_photoPreview");
  preview.innerHTML = "";
  Array.from(files).forEach(file => {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    preview.appendChild(img);
  });
}
document.getElementById("f_photo").addEventListener("change", () => {
  renderPhotoPreview(document.getElementById("f_photo").files);
});
const photoDropZone = document.querySelector(".photo-drop-zone");
photoDropZone.addEventListener("dragover", (e) => { e.preventDefault(); photoDropZone.classList.add("drag-over"); });
photoDropZone.addEventListener("dragleave", () => photoDropZone.classList.remove("drag-over"));
photoDropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  photoDropZone.classList.remove("drag-over");
  const input = document.getElementById("f_photo");
  input.files = e.dataTransfer.files;
  renderPhotoPreview(input.files);
});

// Счётчик оставшихся символов описания
document.getElementById("f_desc").addEventListener("input", (e) => {
  document.getElementById("f_descCount").textContent = 2000 - e.target.value.length;
});

// "+ Добавить ещё телефоны"
watchPhoneInput(document.querySelector(".f_phone"));
document.getElementById("btnAddPhone").addEventListener("click", (e) => {
  e.preventDefault();
  const row = document.createElement("div");
  row.className = "fp-phone-row";
  row.innerHTML = `<input type="text" class="f_phone fp-input" placeholder="+7 777 123 45 67"><button type="button" class="fp-phone-remove">✕</button>`;
  row.querySelector(".fp-phone-remove").addEventListener("click", () => row.remove());
  watchPhoneInput(row.querySelector(".f_phone"));
  document.getElementById("f_phonesList").appendChild(row);
});

// "Предварительный просмотр" — пока без логики
document.getElementById("btnPreview").addEventListener("click", (e) => { e.preventDefault(); });

// Карта выбора расположения — перетаскиваемая метка вместо случайных координат
function initFormMap(city) {
  const c = CITIES[city].center;
  if (!state.formMap) {
    state.formMap = L.map("f_map").setView(c, CITIES[city].zoom || 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(state.formMap);
    state.formMarker = L.marker(c, { draggable: true }).addTo(state.formMap);
    state.formMarker.on("dragend", () => {
      const pos = state.formMarker.getLatLng();
      document.getElementById("f_lat").value = pos.lat.toFixed(6);
      document.getElementById("f_lng").value = pos.lng.toFixed(6);
    });
  } else {
    state.formMap.setView(c, CITIES[city].zoom || 12);
    state.formMarker.setLatLng(c);
  }
  document.getElementById("f_lat").value = c[0].toFixed(6);
  document.getElementById("f_lng").value = c[1].toFixed(6);
  setTimeout(() => state.formMap.invalidateSize(), 100);
}

// селект города в форме
const cityForm = document.getElementById("f_city");
const districtForm = document.getElementById("f_district");
Object.keys(CITIES).forEach(c => { const o = document.createElement("option"); o.value = c; o.textContent = c; cityForm.appendChild(o); });
cityForm.value = "Алматы";
fillDistricts(districtForm, "Алматы", false);
cityForm.addEventListener("change", () => {
  fillDistricts(districtForm, cityForm.value, false);
  fillComplexes(cityForm.value);
  if (state.formMap) initFormMap(cityForm.value);
});

document.getElementById("btnOpenForm").addEventListener("click", () => openFormCategory());
document.getElementById("catSale").addEventListener("click", () => chooseCategory("sale"));
document.getElementById("catRent").addEventListener("click", () => chooseCategory("rent"));
document.getElementById("btnCancel").addEventListener("click", (e) => {
  e.preventDefault();
  closeForm();
  openFormCategory();
});
document.getElementById("btnSubmit").addEventListener("click", submitListing);

/* 2. ЗАПИСЬ */
export async function submitListing() {
  if (!initDb()) return;
  const msg = document.getElementById("formMsg");
  const btn = document.getElementById("btnSubmit");

  const dealType = document.getElementById("f_deal").value;
  const rooms = +document.getElementById("f_rooms").value;
  const price = +document.getElementById("f_price").value;
  const pledged = document.getElementById("f_pledged").value === "true";
  const houseType = document.getElementById("f_houseType").value || null;
  const yearBuilt = +document.getElementById("f_year").value || null;
  const floor = +document.getElementById("f_floor").value || null;
  const floorsTotal = +document.getElementById("f_floorsTotal").value || null;
  const area = +document.getElementById("f_area").value;
  const kitchenArea = +document.getElementById("f_kitchenArea").value || null;
  const exDormitory = document.getElementById("f_exDormitory").value === "true";
  const isNew = document.getElementById("f_isNew").value === "true";

  const city = document.getElementById("f_city").value;
  const district = document.getElementById("f_district").value;
  const complex = document.getElementById("f_complex").value || null;
  const street = document.getElementById("f_street").value.trim();
  const houseNumber = document.getElementById("f_houseNumber").value.trim();
  const crossStreet = document.getElementById("f_crossStreet").value.trim() || null;
  const hideHouseNumber = document.getElementById("f_hideHouseNumber").checked;
  const lat = +document.getElementById("f_lat").value;
  const lng = +document.getElementById("f_lng").value;

  const condition = document.getElementById("f_condition").value || null;
  const phoneLine = document.getElementById("f_phoneLine").value || null;
  const internet = document.getElementById("f_internet").value || null;
  const bathroom = document.getElementById("f_bathroom").value || null;
  const balcony = document.getElementById("f_balcony").value || null;
  const balconyGlazed = document.getElementById("f_balconyGlazed").value === "true";
  const doorType = document.getElementById("f_doorType").value || null;
  const parking = document.getElementById("f_parking").value || null;
  const furnished = document.getElementById("f_furnished").value === "yes";
  const floorType = document.getElementById("f_floorType").value || null;
  const ceilingHeight = +document.getElementById("f_ceilingHeight").value || null;

  const security = Array.from(document.querySelectorAll(".f_security:checked")).map(cb => cb.value).join(", ") || null;
  const features = Array.from(document.querySelectorAll(".f_feature:checked")).map(cb => cb.value).join(", ") || null;
  const kitchenStudio = document.getElementById("f_kitchenStudio").checked;

  const description = document.getElementById("f_desc").value.trim();

  const sellerType = document.getElementById("f_sellerType").value;
  const contactName = document.getElementById("f_contactName").value.trim() || (state.currentUser.email || "").split("@")[0];
  const exchange = document.getElementById("f_exchange").value === "true";
  const phones = Array.from(document.querySelectorAll(".f_phone")).map(i => i.value.trim()).filter(Boolean);
  const agree = document.getElementById("f_agree").checked;

  const rentPeriod = document.getElementById("f_rentPeriod").value;
  const kids = document.getElementById("f_kids").value === "true";
  const pets = document.getElementById("f_pets").value === "true";

  const missing = validateRequiredFields();
  if (missing.length) {
    showFormToast(missing);
    document.querySelector("#formPage .fp-field.has-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  showFormToast([]);
  if (!agree) {
    msg.className = "form-msg err"; msg.textContent = "Нужно согласиться с правилами размещения объявлений."; return;
  }

  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  // "Скрыть номер дома" — не добавляем его в отображаемый адрес
  const streetDisplay = hideHouseNumber ? street : `${street} ${houseNumber}`;

  btn.disabled = true; msg.className = "form-msg"; msg.textContent = "Сохраняю…";

  // Загрузка фото в Storage (можно несколько файлов)
  let images = [];
  const fileInput = document.getElementById("f_photo");
  if (fileInput.files.length) {
    msg.textContent = "Загружаю фото…";
    for (let i = 0; i < fileInput.files.length; i++) {
      const file = fileInput.files[i];
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${state.currentUser.id}/${Date.now()}_${i}.${ext}`;   // уникальное имя
      const up = await state.db.storage.from("listing-photos").upload(path, file);
      if (up.error) {
        btn.disabled = false;
        msg.className = "form-msg err";
        msg.textContent = "Не удалось загрузить фото: " + up.error.message;
        return;
      }
      images.push(state.db.storage.from("listing-photos").getPublicUrl(path).data.publicUrl);
    }
  }

  const { error } = await state.db.from("listings").insert({
    rooms, area, kitchen_area: kitchenArea, ceiling_height: ceilingHeight,
    floor, floors_total: floorsTotal, price, pledged,
    district, street: streetDisplay, house_number: houseNumber, cross_street: crossStreet,
    hide_house_number: hideHouseNumber, lat, lng,
    is_new: isNew, has_photo: images.length > 0, color,
    deal_type: dealType, house_type: houseType, year_built: yearBuilt, ex_dormitory: exDormitory,
    condition, phone_line: phoneLine, internet, bathroom, balcony, balcony_glazed: balconyGlazed,
    door_type: doorType, parking, furnished, floor_type: floorType,
    security, features, kitchen_studio: kitchenStudio,
    description, rent_period: dealType === "rent" ? rentPeriod : "month",
    kids_allowed: kids, pets_allowed: pets, exchange,
    seller_type: sellerType, contact_name: contactName,
    phone: phones[0], phones,
    image_url: images[0] || null, images: images.length ? images : null, city, complex,
  });
  btn.disabled = false;
  if (error) { msg.className = "form-msg err"; msg.textContent = "Ошибка: " + error.message; return; }
  msg.className = "form-msg ok"; msg.textContent = "Готово! Объявление добавлено.";
  setDeal(dealType);
  setTimeout(() => { closeForm(); navigateToSearch(false); }, 900);
}

/* 3. УДАЛЕНИЕ */
export async function deleteListing(id) {
  if (!confirm("Удалить это объявление?")) return;
  const { error } = await state.db.from("listings").delete().eq("id", id);
  if (error) { alert("Не удалось удалить: " + error.message); return; }
  applyNow();
}
