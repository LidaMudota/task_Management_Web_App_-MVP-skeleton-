import { BaseModel } from "./BaseModel";
import { getFromStorage, addToStorage } from "../utils";

export class User extends BaseModel {
  constructor(login, password, role = "user") {
    super();
    this.login = login;
    this.password = password;
    this.role = role;
    this.storageKey = "users";
  }

  get hasAccess() {
    const users = getFromStorage(this.storageKey);
    if (!users.length) return false;
    const existing = users.find(
      (user) => user.login === this.login && user.password === this.password
    );
    if (!existing) return false;
    this.role = existing.role;
    this.id = existing.id;
    return true;
  }

  static save(user) {
    try {
      addToStorage(user, user.storageKey);
      return true;
    } catch (e) {
      throw new Error(e);
    }
  }
}
