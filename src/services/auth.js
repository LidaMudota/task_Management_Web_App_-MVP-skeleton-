import { appState } from "../app";
import { createUser, findByCredentials } from "./userRegistry";

export const authUser = function (login, password) {
  const result = findByCredentials(login, password);
  if (result.ok) {
    appState.currentUser = result.user;
  }
  return result;
};

export const signOut = function () {
  appState.currentUser = null;
};

export const registerUser = function (login, password) {
  const result = createUser(login, password, "user", {
    displayName: (login || "").trim(),
  });
  if (result.ok) {
    appState.currentUser = result.user;
  }
  return result;
};
