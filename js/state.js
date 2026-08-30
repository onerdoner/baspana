/* Общее изменяемое состояние приложения.
   Это ОДИН объект — любой модуль импортирует { state } и читает/меняет
   его поля напрямую (state.favMode = true). Так не нужно городить
   отдельные getter/setter для каждой переменной. */
export const state = {
  db: null,
  currentUser: null,

  // избранное
  favoriteIds: new Set(),   // id объявлений, которые лайкнул текущий пользователь
  favoriteOrder: [],        // те же id, в порядке добавления — сначала последний добавленный
  favMode: false,            // включён ли режим "показывать только избранное"
  myMode: false,             // включён ли режим "Мои объявления" (Кабинет)

  // заметки
  notesMap: new Map(),      // listing_id -> текст заметки (только у текущего пользователя)
  noteEditId: null,

  // окно подтверждения (переиспользуется, напр. для удаления заметки)
  confirmCallback: null,

  // фильтрация / вид страницы
  activeRooms: [],
  activeDeal: "sale",
  currentView: "home",      // "home" | "search" | "listing" | "complex" | "form"
  currentPage: 1,
  totalCount: 0,
  sortBy: "new",             // new | cheap | exp

  // мини-карта объявления
  detailMap: null,
  detailMarker: null,

  // карта выбора расположения в форме подачи
  formMap: null,
  formMarker: null,

  // лайтбокс фото
  lbImgs: [],
  lbIdx: 0,

  // модальное окно выбора города
  modalCity: "Алматы",
  modalDistrict: "",
};
