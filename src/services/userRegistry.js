import { User } from "../models/User";
import { getFromStorage, setInStorage } from "../utils";

const USERS_KEY = "users";

const toResult = (ok, payload = {}) => ({ ok, ...payload });

const normalizeProfile = (login, profile = {}) => ({
  displayName: profile.displayName || login,
  email: profile.email || "",
  ...profile,
});

const normalizeUser = (raw) => {
  if (!raw) return null;
  const login = (raw.login || "").trim();
  const profile = normalizeProfile(login, raw.profile);
  return {
    id: raw.id,
    login,
    password: raw.password || "",
    role: raw.role || "user",
    profile,
  };
};

const readUsers = () => {
  const stored = getFromStorage(USERS_KEY, []);
  return stored
    .map((user) => normalizeUser(user))
    .filter((user) => user && user.login);
};

const writeUsers = (users) => setInStorage(USERS_KEY, users);

export const listUsers = () => readUsers();

export const findByCredentials = (login, password) => {
  const normalizedLogin = (login || "").trim();
  const normalizedPassword = (password || "").trim();
  if (!normalizedLogin || !normalizedPassword) {
    return toResult(false, { message: "Заполните логин и пароль." });
  }
  const users = readUsers();
  const found = users.find(
    (user) =>
      user.login.toLowerCase() === normalizedLogin.toLowerCase() &&
      user.password === normalizedPassword
  );
  if (!found) return toResult(false, { message: "Неверный логин или пароль." });
  return toResult(true, { user: found });
};

export const createUser = (login, password, role = "user", profile = {}) => {
  const normalizedLogin = (login || "").trim();
  const normalizedPassword = (password || "").trim();
  if (!normalizedLogin || !normalizedPassword) {
    return toResult(false, { message: "Заполните логин и пароль." });
  }
  if (normalizedPassword.length < 6) {
    return toResult(false, { message: "Пароль должен быть не короче 6 символов." });
  }
  const users = readUsers();
  const isLoginBusy = users.some(
    (user) => user.login.toLowerCase() === normalizedLogin.toLowerCase()
  );
  if (isLoginBusy) {
    return toResult(false, { message: "Такой логин уже используется." });
  }
  const freshUser = new User(normalizedLogin, normalizedPassword, role, profile);
  const nextList = [...users, normalizeUser(freshUser)];
  writeUsers(nextList);
  return toResult(true, { user: normalizeUser(freshUser), users: nextList });
};

export const updateUserProfile = (id, profile) => {
  const users = readUsers();
  const idx = users.findIndex((user) => user.id === id);
  if (idx === -1) {
    return toResult(false, { message: "Пользователь не найден." });
  }
  const current = users[idx];
  const nextProfile = normalizeProfile(current.login, {
    ...current.profile,
    ...profile,
    displayName: profile?.displayName || current.profile.displayName,
  });
  const nextUser = { ...current, profile: nextProfile };
  const nextList = [...users];
  nextList[idx] = nextUser;
  writeUsers(nextList);
  return toResult(true, { user: nextUser, users: nextList });
};

export const updateUserPassword = (id, password) => {
  const normalizedPassword = (password || "").trim();
  if (!normalizedPassword) {
    return toResult(false, { message: "Укажите новый пароль." });
  }
  if (normalizedPassword.length < 6) {
    return toResult(false, { message: "Новый пароль должен быть не короче 6 символов." });
  }
  const users = readUsers();
  const idx = users.findIndex((user) => user.id === id);
  if (idx === -1) {
    return toResult(false, { message: "Пользователь не найден." });
  }
  const updatedUser = { ...users[idx], password: normalizedPassword };
  const nextList = [...users];
  nextList[idx] = updatedUser;
  writeUsers(nextList);
  return toResult(true, { user: updatedUser, users: nextList });
};

export const removeUser = (id) => {
  const users = readUsers();
  const nextList = users.filter((user) => user.id !== id);
  if (nextList.length === users.length) {
    return toResult(false, { message: "Пользователь не найден." });
  }
  writeUsers(nextList);
  return toResult(true, { users: nextList });
};
