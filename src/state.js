import { getFromStorage, resetStorageKey, setInStorage } from "./utils";

export class State {
  constructor() {
    this._currentUser = null;
    this._tasks = getFromStorage("tasks", []);
  }

  set currentUser(user) {
    this._currentUser = user;
    if (user) {
      setInStorage("currentUser", user);
    } else {
      resetStorageKey("currentUser");
    }
  }

  get currentUser() {
    if (this._currentUser) return this._currentUser;
    const savedUser = getFromStorage("currentUser");
    return savedUser && Object.keys(savedUser).length ? savedUser : null;
  }

  set tasks(list) {
    this._tasks = list;
    setInStorage("tasks", list);
  }

  get tasks() {
    return this._tasks;
  }
}
