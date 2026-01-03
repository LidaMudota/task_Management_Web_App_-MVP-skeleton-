export const getFromStorage = function (key, fallback = []) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
};

export const setInStorage = function (key, data) {
  localStorage.setItem(key, JSON.stringify(data));
};

export const addToStorage = function (obj, key) {
  const storageData = getFromStorage(key);
  storageData.push(obj);
  setInStorage(key, storageData);
};

export const updateInStorage = function (key, items, idKey = "id") {
  const current = getFromStorage(key);
  const merged = current.map((stored) => {
    const incoming = items.find((item) => item[idKey] === stored[idKey]);
    return incoming ? incoming : stored;
  });
  const newcomers = items.filter(
    (item) => !merged.some((stored) => stored[idKey] === item[idKey])
  );
  setInStorage(key, merged.concat(newcomers));
};

export const removeFromStorage = function (key, idValue, idKey = "id") {
  const filtered = getFromStorage(key).filter(
    (item) => item[idKey] !== idValue
  );
  setInStorage(key, filtered);
  return filtered;
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
