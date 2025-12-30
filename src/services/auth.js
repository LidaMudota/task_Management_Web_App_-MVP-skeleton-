import { appState } from "../app";
import { User } from "../models/User";
import { getFromStorage } from "../utils";

export const authUser = function (login, password) {
  const user = new User(login, password);
  if (!user.hasAccess) return false;
  appState.currentUser = user;
  return true;
};

export const signOut = function () {
  appState.currentUser = null;
};

export const registerUser = function (login, password) {
  const normalizedLogin = (login || "").trim();
  const normalizedPassword = (password || "").trim();
  if (!normalizedLogin || !normalizedPassword) {
    return { ok: false, message: "Заполните логин и пароль." };
  }
  if (normalizedPassword.length < 6) {
    return {
      ok: false,
      message: "Пароль должен быть не короче 6 символов.",
    };
  }
  const existingUsers = getFromStorage("users");
  const isLoginBusy = existingUsers.some(
    (user) => user.login.toLowerCase() === normalizedLogin.toLowerCase()
  );
  if (isLoginBusy) {
    return { ok: false, message: "Такой логин уже используется." };
  }
  const newUser = new User(normalizedLogin, normalizedPassword);
  User.save(newUser);
  appState.currentUser = newUser;
  return { ok: true, user: newUser };
};
