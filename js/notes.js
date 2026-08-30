import { state } from "./state.js";
import { openAuth } from "./auth.js";
import { openConfirm } from "./confirm-dialog.js";
import { escapeHtml, favBtnLabel } from "./format.js";
import { updateFavCount } from "./favorites.js";

/* ЗАМЕТКИ */
export async function loadNotes() {
  state.notesMap = new Map();
  if (state.currentUser) {
    const { data, error } = await state.db.from("notes").select("listing_id,text");
    if (!error && data) data.forEach(r => state.notesMap.set(r.listing_id, r.text));
  }
}

// сохранить/обновить заметку. Заодно добавляет объявление в избранное (как на krisha.kz).
export async function saveNote(id, text) {
  if (!state.currentUser) { openAuth("Войди, чтобы оставить заметку."); return false; }
  const { error } = await state.db.from("notes").upsert(
    { listing_id: id, user_id: state.currentUser.id, text, updated_at: new Date().toISOString() },
    { onConflict: "listing_id,user_id" }
  );
  if (error) { alert("Ошибка: " + error.message); return false; }
  state.notesMap.set(id, text);
  if (!state.favoriteIds.has(id)) {
    const { error: favError } = await state.db.from("favorites").insert({ listing_id: id });
    if (!favError) { state.favoriteIds.add(id); state.favoriteOrder.unshift(id); updateFavCount(); }
  }
  return true;
}

export async function deleteNote(id) {
  const { error } = await state.db.from("notes").delete().eq("listing_id", id);
  if (error) { alert("Ошибка: " + error.message); return false; }
  state.notesMap.delete(id);
  return true;
}

export function openNoteModal(id) {
  if (!state.currentUser) { openAuth("Войди, чтобы оставить заметку."); return; }
  state.noteEditId = id;
  const existing = state.notesMap.get(id) || "";
  document.getElementById("noteTitle").textContent = existing ? "Редактировать заметку" : "Оставить заметку";
  const ta = document.getElementById("noteText");
  ta.value = existing;
  updateNoteCount();
  document.getElementById("btnNoteDelete").style.display = existing ? "" : "none";
  document.getElementById("noteOverlay").classList.add("open");
  ta.focus();
}
export function closeNoteModal() {
  document.getElementById("noteOverlay").classList.remove("open");
  state.noteEditId = null;
}
export function updateNoteCount() {
  const ta = document.getElementById("noteText");
  document.getElementById("noteCount").textContent = ta.value.length + "/299";
  document.getElementById("btnNoteSave").disabled = ta.value.trim().length === 0;
}
export async function saveNoteFromModal() {
  const text = document.getElementById("noteText").value.trim();
  if (!text || state.noteEditId == null) return;
  const id = state.noteEditId;
  if (await saveNote(id, text)) { closeNoteModal(); refreshCardNoteUI(id); }
}
export function deleteNoteFromModal() {
  if (state.noteEditId == null) return;
  const id = state.noteEditId;
  openConfirm("Удалить заметку?", "Удалённую заметку не получится восстановить", async () => {
    if (await deleteNote(id)) { closeNoteModal(); refreshCardNoteUI(id); }
  });
}

// точечно обновляет одну карточку в списке поиска после сохранения/удаления
// заметки — без полной перерисовки всего списка (та резко меняет высоту
// страницы на скелетонах и сбрасывает скролл наверх).
export function refreshCardNoteUI(id) {
  const note = state.notesMap.get(id);

  // кнопки "заметка"/"избранное" — везде, где они есть для этого id
  // (карточка в списке И/ИЛИ шапка страницы объявления)
  document.querySelectorAll(`[data-note="${id}"]`).forEach(btn => {
    btn.textContent = "✏ " + (note ? "Редактировать заметку" : "Оставить заметку");
  });
  document.querySelectorAll(`[data-fav="${id}"]`).forEach(btn => {
    const on = state.favoriteIds.has(id);
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

/* МОДАЛЬНОЕ ОКНО ЗАМЕТКИ */
document.getElementById("noteText").addEventListener("input", updateNoteCount);
document.getElementById("btnNoteSave").addEventListener("click", saveNoteFromModal);
document.getElementById("btnNoteDelete").addEventListener("click", deleteNoteFromModal);
document.getElementById("noteClose").addEventListener("click", closeNoteModal);
document.getElementById("noteOverlay").addEventListener("click", (e) => { if (e.target.id === "noteOverlay") closeNoteModal(); });
