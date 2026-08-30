import { state } from "./state.js";

/* ОКНО ПОДТВЕРЖДЕНИЯ (переиспользуется, напр. для удаления заметки) */
export function openConfirm(title, sub, onConfirm) {
  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmSub").textContent = sub;
  state.confirmCallback = onConfirm;
  document.getElementById("confirmOverlay").classList.add("open");
}
export function closeConfirm() {
  document.getElementById("confirmOverlay").classList.remove("open");
  state.confirmCallback = null;
}
export async function runConfirm() {
  const cb = state.confirmCallback;
  closeConfirm();
  if (cb) await cb();
}

document.getElementById("btnConfirmOk").addEventListener("click", runConfirm);
document.getElementById("btnConfirmCancel").addEventListener("click", closeConfirm);
document.getElementById("confirmOverlay").addEventListener("click", (e) => { if (e.target.id === "confirmOverlay") closeConfirm(); });
