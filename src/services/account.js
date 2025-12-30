import { appState } from "../app";
import { loadUsers, saveUsers } from "./storage";

const getMessageEl = () => document.querySelector("#account-message");

const showMessage = (text, tone = "info") => {
  const messageEl = getMessageEl();
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.dataset.tone = tone;
};

const updateUserPassword = (newPassword) => {
  const users = loadUsers();
  const current = appState.currentUser;
  const idx = users.findIndex((user) => user.id === current.id);
  if (idx === -1) {
    return { ok: false, message: "Пользователь не найден. Попробуйте войти заново." };
  }
  users[idx] = { ...users[idx], password: newPassword };
  saveUsers(users);
  appState.currentUser = { ...current, password: newPassword };
  return { ok: true };
};

const handlePasswordSubmit = (event) => {
  event.preventDefault();
  const current = appState.currentUser;
  if (!current) return;
  const formData = new FormData(event.target);
  const currentPassword = formData.get("currentPassword")?.trim();
  const newPassword = formData.get("newPassword")?.trim();
  const repeatPassword = formData.get("repeatPassword")?.trim();

  if (!currentPassword || !newPassword || !repeatPassword) {
    showMessage("Заполните все поля.", "error");
    return;
  }

  const users = loadUsers();
  const storedUser = users.find((user) => user.id === current.id);
  if (!storedUser || storedUser.password !== currentPassword) {
    showMessage("Текущий пароль указан неверно.", "error");
    return;
  }

  if (newPassword.length < 6) {
    showMessage("Новый пароль должен быть не короче 6 символов.", "error");
    return;
  }

  if (newPassword !== repeatPassword) {
    showMessage("Пароли не совпадают. Попробуйте снова.", "error");
    return;
  }

  const updateResult = updateUserPassword(newPassword);
  if (!updateResult.ok) {
    showMessage(updateResult.message, "error");
    return;
  }

  event.target.reset();
  showMessage("Пароль обновлён.", "success");
};

export const buildAccountPage = () => {
  const current = appState.currentUser;
  if (!current) return;

  const loginEl = document.querySelector("#account-login");
  const roleEl = document.querySelector("#account-role");
  if (loginEl) loginEl.textContent = current.login;
  if (roleEl) roleEl.textContent = current.role;

  const passwordForm = document.querySelector("#account-password-form");
  if (passwordForm) {
    passwordForm.addEventListener("submit", handlePasswordSubmit);
  }
};
