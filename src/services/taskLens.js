import { listUsers } from "./userRegistry";

const normalizeDate = (value) => {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

export const defaultLens = () => ({
  status: "all",
  owner: "all",
  sort: "recent",
  query: "",
});

export const ensureTaskShape = (tasks = []) =>
  tasks.map((task) => ({
    ...task,
    createdAt: normalizeDate(task.createdAt),
    updatedAt: normalizeDate(task.updatedAt || task.createdAt),
  }));

const bySort = {
  recent: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  title: (a, b) => a.title.localeCompare(b.title, "ru"),
  owner: (a, b) => String(a.owner || "").localeCompare(String(b.owner || ""), "ru"),
};

export const applyLens = (tasks, lens) => {
  const currentLens = lens || defaultLens();
  let result = [...tasks];

  if (currentLens.status !== "all") {
    result = result.filter((task) => task.status === currentLens.status);
  }

  if (currentLens.owner !== "all") {
    result = result.filter((task) => task.owner === currentLens.owner);
  }

  if (currentLens.query) {
    const needle = currentLens.query.toLowerCase();
    result = result.filter(
      (task) =>
        task.title.toLowerCase().includes(needle) ||
        (task.description || "").toLowerCase().includes(needle)
    );
  }

  const sorter = bySort[currentLens.sort] || bySort.recent;
  return result.sort(sorter);
};

export const buildOwnerOptions = (currentUser) => {
  const users = listUsers();
  const options = users.map((user) => ({
    value: user.login,
    label: user.profile?.displayName || user.login,
  }));
  if (!options.some((item) => item.value === currentUser.login)) {
    options.push({
      value: currentUser.login,
      label: currentUser.profile?.displayName || currentUser.login,
    });
  }
  return options;
};
