const defaultAdapter = {
  read(key, fallback = null) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn(`[storageVault] Failed to parse key "${key}":`, error);
      return fallback;
    }
  },
  write(key, payload) {
    localStorage.setItem(key, JSON.stringify(payload));
    return payload;
  },
  drop(key) {
    localStorage.removeItem(key);
  },
};

let activeAdapter = defaultAdapter;

export const useStorageAdapter = (adapter) => {
  if (!adapter || typeof adapter.read !== "function" || typeof adapter.write !== "function") return;
  activeAdapter = { ...defaultAdapter, ...adapter };
};

export const readFromVault = (key, fallback = null) => activeAdapter.read(key, fallback);

export const stashInVault = (key, payload) => activeAdapter.write(key, payload);

export const appendToVault = (key, payload, fallback = []) => {
  const current = readFromVault(key, fallback) || fallback;
  const next = [...current, payload];
  return stashInVault(key, next);
};

export const mergeVaultItems = (key, incoming, idKey = "id", fallback = []) => {
  const current = readFromVault(key, fallback) || fallback;
  const merged = current.map((stored) => {
    const replacement = incoming.find((item) => item?.[idKey] === stored?.[idKey]);
    return replacement ?? stored;
  });
  const newcomers = incoming.filter(
    (item) => !merged.some((stored) => stored?.[idKey] === item?.[idKey])
  );
  return stashInVault(key, merged.concat(newcomers));
};

export const removeFromVault = (key, idValue, idKey = "id", fallback = []) => {
  const current = readFromVault(key, fallback) || fallback;
  const filtered = current.filter((item) => item?.[idKey] !== idValue);
  return stashInVault(key, filtered);
};

export const clearVaultKey = (key) => activeAdapter.drop(key);
