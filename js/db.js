import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";
import { state } from "./state.js";
import { showBanner } from "./format.js";

export function initDb() {
  if (SUPABASE_URL.startsWith("PASTE_")) {
    showBanner("Не заполнены ключи Supabase. Впиши SUPABASE_URL и SUPABASE_KEY в блоке НАСТРОЙКА.");
    return false;
  }
  if (!state.db) state.db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return true;
}
