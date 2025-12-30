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

const updateProfile = (profile) => {
  const users = loadUsers();
  const current = appState.currentUser;
  const idx = users.findIndex((user) => user.id === current.id);
  if (idx === -1) {
    return { ok: false, message: "Пользователь не найден. Попробуйте войти заново." };
  }
  const nextProfile = {
    ...users[idx].profile,
    ...profile,
    displayName: profile.displayName || users[idx].profile?.displayName || users[idx].login,
  };
  users[idx] = { ...users[idx], profile: nextProfile };
  saveUsers(users);
  appState.currentUser = { ...current, profile: nextProfile };
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

const handleProfileSubmit = (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const displayName = formData.get("displayName")?.trim();
  const email = formData.get("email")?.trim();

  if (!displayName) {
    showMessage("Укажите отображаемое имя.", "error");
    return;
  }

  const updateResult = updateProfile({ displayName, email });
  if (!updateResult.ok) {
    showMessage(updateResult.message, "error");
    return;
  }

  showMessage("Профиль обновлён.", "success");
};

export const buildAccountPage = () => {
  const current = appState.currentUser;
  if (!current) return;

  const loginEl = document.querySelector("#account-login");
  const roleEl = document.querySelector("#account-role");
  const displayNameEl = document.querySelector("#account-display");
  const emailInput = document.querySelector("#account-email");
  const displayInput = document.querySelector("#account-display-input");
  if (loginEl) loginEl.textContent = current.login;
  if (roleEl) roleEl.textContent = current.role;
  if (displayNameEl) displayNameEl.textContent = current.profile?.displayName || current.login;
  if (displayInput) displayInput.value = current.profile?.displayName || current.login;
  if (emailInput) emailInput.value = current.profile?.email || "";

  const passwordForm = document.querySelector("#account-password-form");
  if (passwordForm) {
    passwordForm.addEventListener("submit", handlePasswordSubmit);
  }

  const profileForm = document.querySelector("#account-profile-form");
  if (profileForm) {
    profileForm.addEventListener("submit", handleProfileSubmit);
  }
};
