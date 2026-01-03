import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/style.css";
import taskFieldTemplate from "./templates/taskField.html";
import noAccessTemplate from "./templates/noAccess.html";
import myAccountTemplate from "./templates/myAccount.html";
import { User } from "./models/User";
import { State } from "./state";
import { authUser, registerUser, signOut } from "./services/auth";
import { buildBoard, buildHeaderControls } from "./services/board";
import { buildAccountPage } from "./services/account";
import { initNavigation } from "./services/navigation";
import { generateTestUser } from "./utils";

export const appState = new State();

const loginForm = document.querySelector("#app-login-form");
const signupForm = document.querySelector("#app-signup-form");
const contentRoot = document.querySelector("#content");
const authNote = document.querySelector("#auth-note");
const modeButtons = document.querySelectorAll("[data-auth-mode]");

const renderNoAccess = () => {
  contentRoot.innerHTML = noAccessTemplate;
};

const attachNavigation = () =>
  initNavigation({
    onShowTasks: renderBoard,
    onShowAccount: renderAccount,
    onLogout: handleLogout,
  });

const renderBoard = () => {
  if (!appState.currentUser) {
    renderNoAccess();
    return;
  }
  contentRoot.innerHTML = taskFieldTemplate;
  const pageMain = document.querySelector(".page__main");
  const adminPanel = document.querySelector("#admin-panel");
  if (appState.currentUser.role !== "admin") {
    adminPanel?.remove();
    pageMain?.classList.add("page__main--narrow");
  } else {
    pageMain?.classList.remove("page__main--narrow");
  }
  buildHeaderControls();
  buildBoard();
  attachNavigation();
};

const renderAccount = () => {
  if (!appState.currentUser) {
    renderNoAccess();
    return;
  }
  contentRoot.innerHTML = myAccountTemplate;
  buildHeaderControls();
  buildAccountPage();
  attachNavigation();
};

const setAuthNote = (text, tone = "info") => {
  if (!authNote) return;
  authNote.textContent = text;
  authNote.dataset.tone = tone;
};

const resetToLogin = () => {
  switchAuthMode("login");
  setAuthNote("Пожалуйста, авторизуйтесь.", "info");
  contentRoot.textContent = "Пожалуйста, авторизуйтесь.";
};

const handleLogout = () => {
  if (!appState.currentUser) return;
  signOut();
  resetToLogin();
};

const handleAuthResult = (result) => {
  if (result?.ok) {
    renderBoard();
  } else {
    renderNoAccess();
  }
};

const switchAuthMode = (mode) => {
  const isLogin = mode === "login";
  loginForm.classList.toggle("hidden", !isLogin);
  signupForm.classList.toggle("hidden", isLogin);
  modeButtons.forEach((btn) =>
    btn.classList.toggle(
      "auth-switch__btn--active",
      btn.dataset.authMode === mode
    )
  );
  const noteText = isLogin
    ? "Пожалуйста, авторизуйтесь."
    : "Создайте новый аккаунт, чтобы перейти к задачам.";
  setAuthNote(noteText, "info");
};

generateTestUser(
  (preset) => new User(preset.login, preset.password, preset.role, preset.profile)
);

loginForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const formData = new FormData(loginForm);
  const login = formData.get("login");
  const password = formData.get("password");

  const loginResult = authUser(login, password);
  if (!loginResult.ok) {
    setAuthNote(loginResult.message || "Неверный логин или пароль. Попробуйте снова.", "error");
  } else {
    setAuthNote("С возвращением!", "success");
  }
  handleAuthResult(loginResult);
});

signupForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const formData = new FormData(signupForm);
  const login = formData.get("login");
  const password = formData.get("password");
  const passwordConfirm = formData.get("passwordConfirm");

  if (password !== passwordConfirm) {
    setAuthNote("Пароли не совпадают, попробуйте снова.", "error");
    return;
  }

  const result = registerUser(login, password);
  if (!result.ok) {
    setAuthNote(result.message, "error");
    return;
  }

  setAuthNote("Аккаунт создан! Добро пожаловать.", "success");
  handleAuthResult(result);
});

modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => switchAuthMode(btn.dataset.authMode));
});

switchAuthMode("login");

const savedUser = appState.currentUser;
if (savedUser) {
  appState.currentUser = savedUser;
  handleAuthResult({ ok: true });
}
