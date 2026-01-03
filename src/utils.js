import {
  appendToVault,
  clearVaultKey,
  mergeVaultItems,
  readFromVault,
  removeFromVault,
  stashInVault,
} from "./services/storageVault";

export const getFromStorage = function (key, fallback = []) {
  return readFromVault(key, fallback) ?? fallback;
};

export const setInStorage = function (key, data) {
  return stashInVault(key, data);
};

export const addToStorage = function (obj, key) {
  return appendToVault(key, obj);
};

export const updateInStorage = function (key, items, idKey = "id") {
  return mergeVaultItems(key, items, idKey);
};

export const removeFromStorage = function (key, idValue, idKey = "id") {
  return removeFromVault(key, idValue, idKey);
};

export const resetStorageKey = function (key) {
  return clearVaultKey(key);
};

export const generateTestUser = function (userFactory) {
  if (typeof userFactory !== "function") return;
  const existingUsers = getFromStorage("users", []);
  const defaults = [
    {
      login: "admin",
      password: "admin123",
      role: "admin",
      profile: { displayName: "Администратор" },
    },
    {
      login: "test",
      password: "qwerty123",
      role: "user",
      profile: { displayName: "Тестовый пользователь" },
    },
  ];

  const normalizedDefaults = defaults
    .filter(
      (preset) =>
        !existingUsers.some(
          (user) => user.login.toLowerCase() === preset.login.toLowerCase()
        )
    )
    .map((preset) => userFactory(preset));

  if (normalizedDefaults.length) {
    setInStorage("users", existingUsers.concat(normalizedDefaults));
  }
};
