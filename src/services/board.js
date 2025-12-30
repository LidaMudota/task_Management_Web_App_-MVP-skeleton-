import { appState } from "../app";
import { v4 as uuid } from "uuid";
import { Task } from "../models/Task";
import { signOut } from "./auth";
import { loadTasks, saveTasks, loadUsers, saveUsers, removeUserById } from "./storage";

const columnFlow = ["backlog", "ready", "in-progress", "finished"];

const columnTitles = {
  backlog: "Backlog",
  ready: "Ready",
  "in-progress": "In progress",
  finished: "Finished",
};

const columnOrder = ["backlog", "ready", "in-progress", "finished"];

const boardRootSelector = "#board";
const activeClass = "board__add--active";
const disabledClass = "board__add--disabled";

const userMenuSelector = "#user-menu";

const addTaskFormTemplate = () => {
  return `
    <div class="board__input-wrapper">
      <input class="board__input" type="text" placeholder="Enter task" aria-label="Task title" />
    </div>
  `;
};

const dropdownTemplate = (items) => {
  return `
    <ul class="board__dropdown">
      ${items
        .map(
          (item) =>
            `<li class="board__dropdown-item" data-id="${item.id}">${item.title}</li>`
        )
        .join("")}
    </ul>
  `;
};

const renderTaskItem = (task, isAdmin) => {
  const ownerLabel = isAdmin ? `<span class="board__task-owner">${task.owner}</span>` : "";
  const deleteBtn = isAdmin
    ? `<button class="board__task-delete" data-id="${task.id}">✕</button>`
    : "";
  return `<li class="board__task" data-id="${task.id}" data-owner="${task.owner}" data-status="${task.status}"><span class="board__task-title">${task.title}</span>${ownerLabel}${deleteBtn}</li>`;
};

const renderColumn = (status, tasks, isAdmin) => {
  const tasksHtml = tasks.map((task) => renderTaskItem(task, isAdmin)).join("");
  const isDisabled = status !== "backlog" && !canMoveFromPrev(status, tasks);
  const addBtnClasses = ["board__add", isDisabled ? disabledClass : activeClass].join(" ");
  const addLabel = status === "backlog" ? "+ Add card" : "+ Add card";
  return `
    <section class="board__column" data-status="${status}">
      <div class="board__column-header">
        <h2 class="board__column-title">${columnTitles[status]}</h2>
      </div>
      <ul class="board__tasks">${tasksHtml}</ul>
      <div class="board__controls">
        <button class="${addBtnClasses}" type="button">${addLabel}</button>
      </div>
    </section>
  `;
};

const renderBoardHtml = (tasks, isAdmin) => {
  return columnOrder
    .map((status) => {
      const columnTasks = tasks.filter((task) => task.status === status);
      return renderColumn(status, columnTasks, isAdmin);
    })
    .join("");
};

const renderUserList = (users) => {
  return `
    <div class="user-admin">
      <h3 class="user-admin__title">Пользователи</h3>
      <ul class="user-admin__list">
        ${users
          .map(
            (user) => `
              <li class="user-admin__item" data-id="${user.id}">
                <span class="user-admin__login">${user.login}</span>
                <span class="user-admin__role">${user.role}</span>
                <button class="user-admin__delete" data-id="${user.id}">Удалить</button>
              </li>
            `
          )
          .join("")}
      </ul>
      <div class="user-admin__add">
        <input class="user-admin__input" type="text" placeholder="Логин" aria-label="Новый логин" />
        <input class="user-admin__input" type="password" placeholder="Пароль" aria-label="Новый пароль" />
        <select class="user-admin__select" aria-label="Роль">
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        <button class="user-admin__submit" type="button">Добавить</button>
      </div>
    </div>
  `;
};

const getBoardRoot = () => document.querySelector(boardRootSelector);

const findColumn = (status) =>
  getBoardRoot().querySelector(`.board__column[data-status="${status}"]`);

const canMoveFromPrev = (status, allTasks) => {
  const idx = columnFlow.indexOf(status);
  if (idx <= 0) return true;
  const prevStatus = columnFlow[idx - 1];
  return allTasks.some((task) => task.status === prevStatus);
};

const getTasksForCurrentUser = () => {
  const allTasks = appState.tasks;
  if (appState.currentUser.role === "admin") return allTasks;
  return allTasks.filter((task) => task.owner === appState.currentUser.login);
};

const rerenderBoard = () => {
  const tasks = getTasksForCurrentUser();
  const boardRoot = getBoardRoot();
  boardRoot.innerHTML = renderBoardHtml(tasks, appState.currentUser.role === "admin");
  attachColumnHandlers();
  updateFooterCounts();
};

const addNewTaskToBacklog = (title) => {
  const newTask = new Task(title, "", "backlog", appState.currentUser.login);
  const nextTasks = [...appState.tasks, newTask];
  appState.tasks = nextTasks;
  rerenderBoard();
};

const moveTaskToNextColumn = (taskId, nextStatus) => {
  const updated = appState.tasks.map((task) => {
    if (task.id === taskId) {
      return { ...task, status: nextStatus };
    }
    return task;
  });
  appState.tasks = updated;
  rerenderBoard();
};

const deleteTask = (taskId) => {
  const remaining = appState.tasks.filter((task) => task.id !== taskId);
  appState.tasks = remaining;
  rerenderBoard();
};

const editTask = (taskId) => {
  const target = appState.tasks.find((task) => task.id === taskId);
  if (!target) return;
  const canEdit =
    appState.currentUser.role === "admin" || target.owner === appState.currentUser.login;
  if (!canEdit) return;
  const nextTitle = prompt("Изменить название задачи", target.title);
  if (nextTitle === null) return;
  const trimmed = nextTitle.trim();
  if (!trimmed) return;
  const updated = appState.tasks.map((task) =>
    task.id === taskId ? { ...task, title: trimmed } : task
  );
  appState.tasks = updated;
  rerenderBoard();
};

const handleBacklogAdd = (column) => {
  const controls = column.querySelector(".board__controls");
  const addBtn = controls.querySelector(".board__add");
  addBtn.textContent = "Submit";
  controls.insertAdjacentHTML("afterbegin", addTaskFormTemplate());
  const input = controls.querySelector(".board__input");
  input.focus();
  const submitTask = () => {
    const value = input.value.trim();
    if (value) {
      addNewTaskToBacklog(value);
    } else {
      addBtn.textContent = "+ Add card";
      input.remove();
    }
    input.removeEventListener("blur", submitTask);
  };
  addBtn.addEventListener("click", submitTask, { once: true });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitTask();
    }
  });
  input.addEventListener("blur", submitTask);
};

const getPrevTasks = (status) => {
  const idx = columnFlow.indexOf(status);
  if (idx <= 0) return [];
  const prevStatus = columnFlow[idx - 1];
  const allTasks = getTasksForCurrentUser();
  return allTasks.filter((task) => task.status === prevStatus);
};

const handleMoveFromDropdown = (column, status) => {
  const prevTasks = getPrevTasks(status);
  const controls = column.querySelector(".board__controls");
  controls.insertAdjacentHTML("afterbegin", dropdownTemplate(prevTasks));
  const dropdown = controls.querySelector(".board__dropdown");
  dropdown.addEventListener("click", (e) => {
    const item = e.target.closest(".board__dropdown-item");
    if (!item) return;
    moveTaskToNextColumn(item.dataset.id, status);
  });
};

const handleColumnAdd = (status, column) => {
  if (status === "backlog") {
    handleBacklogAdd(column);
    return;
  }
  const hasPrev = canMoveFromPrev(status, getTasksForCurrentUser());
  if (!hasPrev) return;
  handleMoveFromDropdown(column, status);
};

const attachColumnHandlers = () => {
  const boardRoot = getBoardRoot();
  boardRoot.querySelectorAll(".board__column").forEach((column) => {
    const status = column.getAttribute("data-status");
    const addBtn = column.querySelector(".board__add");
    addBtn.addEventListener("click", () => handleColumnAdd(status, column));
    column.addEventListener("click", (e) => {
      if (e.target.classList.contains("board__task-delete")) {
        deleteTask(e.target.dataset.id);
        return;
      }
      if (e.target.classList.contains("board__task-title")) {
        editTask(e.target.closest(".board__task").dataset.id);
      }
    });
  });
};

const updateFooterCounts = () => {
  const allTasks = appState.tasks;
  const activeCount = allTasks.filter((task) => task.status === "backlog").length;
  const finishedCount = allTasks.filter((task) => task.status === "finished").length;
  const footer = document.querySelector("#footer");
  if (!footer) return;
  footer.querySelector("#active-count").textContent = activeCount;
  footer.querySelector("#finished-count").textContent = finishedCount;
};

const attachUserMenu = () => {
  const menuToggle = document.querySelector("#user-menu-toggle");
  const menuList = document.querySelector(userMenuSelector);
  if (!menuToggle || !menuList) return;
  menuToggle.addEventListener("click", () => {
    menuList.classList.toggle("user-menu__list--open");
    menuToggle.classList.toggle("user-menu__toggle--open");
  });
};

const attachHeaderActions = () => {
  const signOutBtn = document.querySelector("#sign-out-btn");
  if (signOutBtn) {
    signOutBtn.addEventListener("click", () => {
      signOut();
      window.location.reload();
    });
  }
};

const renderAdminPanel = () => {
  if (appState.currentUser.role !== "admin") return;
  const adminRoot = document.querySelector("#admin-panel");
  if (!adminRoot) return;
  const users = loadUsers();
  adminRoot.innerHTML = renderUserList(users);
  const addBtn = adminRoot.querySelector(".user-admin__submit");
  const loginInput = adminRoot.querySelectorAll(".user-admin__input")[0];
  const passInput = adminRoot.querySelectorAll(".user-admin__input")[1];
  const roleSelect = adminRoot.querySelector(".user-admin__select");
  addBtn.addEventListener("click", () => {
    const login = loginInput.value.trim();
    const password = passInput.value.trim();
    const role = roleSelect.value;
    if (!login || !password) return;
    const usersList = loadUsers();
    usersList.push({ id: uuid(), login, password, role });
    saveUsers(usersList);
    renderAdminPanel();
  });
  adminRoot.querySelectorAll(".user-admin__delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeUserById(btn.dataset.id);
      renderAdminPanel();
    });
  });
};

export const buildHeaderControls = () => {
  const headerHello = document.querySelector("#header-hello");
  const signOutBtn = document.querySelector("#sign-out-btn");
  const menuLogin = document.querySelector("#user-menu-login");
  if (headerHello) headerHello.textContent = `Здравствуйте, ${appState.currentUser.login}`;
  if (signOutBtn) signOutBtn.classList.remove("hidden");
  if (menuLogin) menuLogin.textContent = appState.currentUser.login;
  attachUserMenu();
  attachHeaderActions();
};

export const buildBoard = () => {
  const tasks = getTasksForCurrentUser();
  const boardRoot = getBoardRoot();
  boardRoot.innerHTML = renderBoardHtml(tasks, appState.currentUser.role === "admin");
  attachColumnHandlers();
  renderAdminPanel();
  updateFooterCounts();
};
