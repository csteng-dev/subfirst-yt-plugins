// YT Subscription Guard - Custom Dialog Modal Module

const dialogModal = document.getElementById("custom-dialog-modal");
const dialogTitle = document.getElementById("dialog-title");
const dialogMessage = document.getElementById("dialog-message");
const dialogCancelBtn = document.getElementById("dialog-cancel-btn");
const dialogConfirmBtn = document.getElementById("dialog-confirm-btn");
const dialogCloseBtn = document.getElementById("dialog-close-btn");

let dialogConfirmCallback = null;

/**
 * 顯示自訂高級提示框 (Custom Alert Dialog)
 * @param {string} message - 提示內容
 * @param {string} title - 提示框標題
 */
export function showCustomAlert(message, title = "系統提示") {
  if (!dialogModal) return;
  dialogTitle.innerHTML = `<svg class="icon" viewBox="0 0 24 24" style="color: var(--primary);"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> ${title}`;
  dialogMessage.textContent = message;
  dialogCancelBtn.style.display = "none"; // 提示框不需要取消按鈕
  dialogConfirmBtn.textContent = "確定";
  
  dialogConfirmCallback = null;
  dialogModal.classList.add("show");
}

/**
 * 顯示自訂高級確認框 (Custom Confirm Dialog)
 * @param {string} message - 確認內容
 * @param {function} callback - 使用者點擊「確認」後的非同步執行回呼
 * @param {string} title - 確認框標題
 */
export function showCustomConfirm(message, callback, title = "確認執行") {
  if (!dialogModal) return;
  dialogTitle.innerHTML = `<svg class="icon" viewBox="0 0 24 24" style="color: #eab308; fill: #eab308; stroke: #eab308;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> ${title}`;
  dialogMessage.textContent = message;
  dialogCancelBtn.style.display = "inline-block"; // 確認框需要取消按鈕
  dialogConfirmBtn.textContent = "確認";
  
  dialogConfirmCallback = callback;
  dialogModal.classList.add("show");
}

/**
 * 關閉對話框
 */
export function closeDialog() {
  if (dialogModal) {
    dialogModal.classList.remove("show");
  }
}

// 註冊關閉與確認事件監聽
if (dialogConfirmBtn) {
  dialogConfirmBtn.addEventListener("click", () => {
    closeDialog();
    if (dialogConfirmCallback) {
      dialogConfirmCallback();
    }
  });
}

if (dialogCancelBtn) {
  dialogCancelBtn.addEventListener("click", closeDialog);
}

if (dialogCloseBtn) {
  dialogCloseBtn.addEventListener("click", closeDialog);
}
