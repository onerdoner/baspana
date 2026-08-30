import { state } from "./state.js";
import { openAuth } from "./auth.js";
import { update } from "./search-list.js";

/* ИЗБРАННОЕ */
export async function loadFavorites() {
  state.favoriteIds = new Set();
  state.favoriteOrder = [];
  if (state.currentUser) {
    const { data, error } = await state.db.from("favorites").select("listing_id").order("created_at", { ascending: false });
    if (!error && data) data.forEach(r => { state.favoriteIds.add(r.listing_id); state.favoriteOrder.push(r.listing_id); });
  }
  updateFavCount();
}
export function updateFavCount() {
  const el = document.getElementById("favCount");
  if (el) el.textContent = "(" + state.favoriteIds.size + ")";
}
// добавить/убрать лайк. Возвращает true/false (новое состояние) или null, если не вошёл.
export async function toggleFavorite(id) {
  if (!state.currentUser) { openAuth("Войди, чтобы добавлять в избранное."); return null; }
  if (state.favoriteIds.has(id)) {
    const { error } = await state.db.from("favorites").delete().eq("listing_id", id);
    if (error) { alert("Ошибка: " + error.message); return null; }
    state.favoriteIds.delete(id);
    state.favoriteOrder = state.favoriteOrder.filter(x => x !== id);
    updateFavCount();
    if (state.favMode) update();       // в режиме избранного — пересобрать список
    return false;
  } else {
    const { error } = await state.db.from("favorites").insert({ listing_id: id });
    if (error) { alert("Ошибка: " + error.message); return null; }
    state.favoriteIds.add(id);
    state.favoriteOrder.unshift(id);
    updateFavCount();
    return true;
  }
}
// очистить всё избранное разом (кнопка "Очистить избранное")
export async function clearFavorites() {
  if (!state.currentUser || !state.favoriteIds.size) return;
  if (!confirm("Очистить всё избранное?")) return;
  const { error } = await state.db.from("favorites").delete().eq("user_id", state.currentUser.id);
  if (error) { alert("Ошибка: " + error.message); return; }
  state.favoriteIds = new Set();
  state.favoriteOrder = [];
  updateFavCount();
  if (state.favMode) update();
}
