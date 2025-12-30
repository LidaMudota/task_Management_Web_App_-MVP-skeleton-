import { getFromStorage, setInStorage, removeFromStorage } from "../utils";

const TASKS_KEY = "tasks";
const USERS_KEY = "users";

export const loadTasks = () => getFromStorage(TASKS_KEY);
export const saveTasks = (tasks) => setInStorage(TASKS_KEY, tasks);

export const removeTaskById = (id) => removeFromStorage(TASKS_KEY, id);

export const loadUsers = () => getFromStorage(USERS_KEY);
export const saveUsers = (users) => setInStorage(USERS_KEY, users);

export const removeUserById = (id) => removeFromStorage(USERS_KEY, id);
