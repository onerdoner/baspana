/* Форматирование и мелкие текстовые хелперы — переиспользуются
   карточками, страницей объявления, витриной и т.д. */

export function showBanner(m) {
  const b = document.getElementById("banner");
  b.textContent = m; b.style.display = "block";
  document.getElementById("listCount").textContent = "";
}

export function formatPrice(n) { return n.toLocaleString("ru-RU").replace(/,/g, " ") + " ₸"; }

export function rentSuffix(item) {
  if (item.dealType !== "rent") return "";
  return item.rentPeriod === "day" ? " /сутки" : item.rentPeriod === "hour" ? " /час" : " /мес";
}

export function priceLabel(item) { return formatPrice(item.price) + rentSuffix(item); }

export function shortPrice(item) {
  const n = item.price;
  let s = n >= 1000000 ? (n / 1000000).toFixed(n % 1000000 ? 1 : 0) + " млн" : Math.round(n / 1000) + " тыс";
  const suf = item.dealType !== "rent" ? "" : item.rentPeriod === "day" ? "/сут" : item.rentPeriod === "hour" ? "/час" : "/мес";
  return s + suf;
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* Строка общей информации карточки: В Залоге, ЖК/тип дома, год, состояние,
   санузел, телефон, остаток — описание. Максимум 150 символов. */
export function buildCardInfoLine(item) {
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

export function favBtnLabel(on) { return on ? "♥ В Избранном" : "♥ В Избранное"; }

export function sellerBadgeHtml(item) {
  if (item.sellerType === "owner") return `<span class="seller-badge owner">Хозяин недвижимости</span>`;
  if (item.sellerType === "agent") return `<span class="seller-badge agent">Крыша Агент</span>`;
  return "";
}
