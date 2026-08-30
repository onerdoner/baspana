import { state } from "./state.js";
import { fillDistricts, fillComplexes, applyDealVisibility } from "./search-view.js";

/* 1. ЧТЕНИЕ ИЗ БАЗЫ — постранично и с фильтрами на стороне базы.
   Раньше грузили ВСЕ квартиры и фильтровали в браузере — на десятках тысяч
   это повесит вкладку. Теперь база сама фильтрует и отдаёт одну страницу. */

// превращает строку из базы (snake_case) в удобный объект (camelCase)
export function rowToItem(row) {
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
    houseNumber: row.house_number, crossStreet: row.cross_street, hideHouseNumber: row.hide_house_number,
    phoneLine: row.phone_line, internet: row.internet, balconyGlazed: row.balcony_glazed,
    floorType: row.floor_type, features: row.features, contactName: row.contact_name,
    phones: row.phones || [],
    sellerType: row.seller_type, pledged: row.pledged,
    exDormitory: row.ex_dormitory, exchange: row.exchange,
    date: "18 августа", views: Math.floor(Math.random() * 300),
  };
}

export function getFilters() {
  return {
    deal: state.activeDeal, rooms: state.activeRooms,
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

// строит запрос к базе из текущих фильтров.
// Каждый .eq/.gte/.lte — это условие, которое база применит сама.
export function buildQuery(query) {
  // режим "Избранное" — показываем только лайкнутые объявления
  if (state.favMode) {
    const ids = [...state.favoriteIds];
    return query.in("id", ids.length ? ids : [-1]);   // -1 = ничего не найдётся
  }
  // режим "Мои объявления" (Кабинет) — все объявления текущего пользователя,
  // независимо от типа сделки и остальных фильтров
  if (state.myMode) {
    return state.currentUser ? query.eq("user_id", state.currentUser.id) : query.eq("id", -1);
  }
  const f = getFilters();
  query = query.eq("deal_type", f.deal);
  if (f.city) query = query.eq("city", f.city);
  if (f.district) query = query.eq("district", f.district);
  // "Любой ЖК" — только квартиры, у которых вообще указан жилой комплекс.
  // Пустой вариант (по умолчанию) — без ограничения: и с ЖК, и без (монолитный/кирпичный и т.д.)
  if (f.complex === "any") query = query.not("complex", "is", null);
  else if (f.complex) query = query.eq("complex", f.complex);
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
  if (f.onlyMine && state.currentUser) query = query.eq("user_id", state.currentUser.id);
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

export function applySort(query) {
  if (state.sortBy === "cheap") return query.order("price", { ascending: true });
  if (state.sortBy === "exp")   return query.order("price", { ascending: false });
  return query.order("created_at", { ascending: false });
}

export function serializeFilters() {
  const p = new URLSearchParams();
  p.set("view", "search");
  p.set("deal", state.activeDeal);
  const city = document.getElementById("city").value;
  if (city) p.set("city", city);
  const district = document.getElementById("district").value;
  if (district) p.set("district", district);
  if (state.activeRooms.length) p.set("rooms", state.activeRooms.join(","));
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

export function deserializeFilters(p) {
  const deal = p.get("deal") || "sale";
  state.activeDeal = deal;
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

  state.activeRooms = (p.get("rooms") || "").split(",").filter(Boolean).map(Number);
  document.querySelectorAll("#rooms button").forEach(b => {
    b.classList.toggle("on", state.activeRooms.includes(+b.dataset.r));
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
  document.getElementById("rentPeriod").value = p.get("rp") || "month";
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
