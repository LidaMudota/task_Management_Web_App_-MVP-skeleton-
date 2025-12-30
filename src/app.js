import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/style.css";
import taskFieldTemplate from "./templates/taskField.html";
import noAccessTemplate from "./templates/noAccess.html";
import { User } from "./models/User";
import { State } from "./state";
import { authUser } from "./services/auth";
import { buildBoard, buildHeaderControls } from "./services/board";
import { generateTestUser } from "./utils";

export const appState = new State();

const loginForm = document.querySelector("#app-login-form");
const contentRoot = document.querySelector("#content");

const renderNoAccess = () => {
  contentRoot.innerHTML = noAccessTemplate;
  alert("доступ запрещен");
};

const renderBoard = () => {
  contentRoot.innerHTML = taskFieldTemplate;
  buildHeaderControls();
  buildBoard();
};

const handleAuthResult = (isAllowed) => {
  if (isAllowed) {
    renderBoard();
  } else {
    renderNoAccess();
  }
};

generateTestUser(User);

loginForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const formData = new FormData(loginForm);
  const login = formData.get("login");
  const password = formData.get("password");

  const canLogin = authUser(login, password);
  handleAuthResult(canLogin);
});

const savedUser = appState.currentUser;
if (savedUser) {
  handleAuthResult(true);
}
