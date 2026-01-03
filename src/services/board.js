import { appState } from "../app";
import { v4 as uuid } from "uuid";
import { loadUsers, saveUsers, removeUserById } from "./storage";
import { renderBoardHtml } from "./taskList";
import { buildOwnerOptions, applyLens, defaultLens } from "./taskLens";
import { createTask, hydrateTasks, moveTask, removeTask, retitleTask } from "./taskEditor";
import { columnFlow } from "./taskScheme";

const boardRootSelector = "#board";
const activeClass = "board__add--active";
const disabledClass = "board__add--disabled";
const draggingClass = "board__task--dragging";
const dropTargetClass = "board__column--drop-target";
const filtersSelectors = {
  query: "#task-search",
  status: "#task-status-filter",
  owner: "#task-owner-filter",
  sort: "#task-sort",
};
const isAdmin = () => appState.currentUser?.role === "admin";

let lens = defaultLens();
let filtersBound = false;

const addTaskFormTemplate = () => `
  <div class="board__input-wrapper">
    <input class="board__input" type="text" placeholder="Enter task" aria-label="Task title" />
  </div>
`;

const dropdownTemplate = (items) => `
  <ul class="board__dropdown">
    ${items
      .map(
        (item) =>
          `<li class="board__dropdown-item" data-id="${item.id}">${item.title}</li>`
      )
      .join("")}
  </ul>
`;

const renderUserList = (users) => `
  <div class="user-admin">
    <h3 class="user-admin__title">Пользователи</h3>
    <ul class="user-admin__list">
      ${users
        .map(
          (user) => `
            <li class="user-admin__item" data-id="${user.id}">
              <div class="user-admin__identity">
                <span class="user-admin__login">${user.login}</span>
                <span class="user-admin__name">${user.profile?.displayName || user.login}</span>
              </div>
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

const getBoardRoot = () => document.querySelector(boardRootSelector);

const canModifyTask = (task) =>
  !!task && (appState.currentUser.role === "admin" || task.owner === appState.currentUser.login);

const canDeleteTask = (task) => canModifyTask(task);

const canMoveFromPrev = (status, allTasks) => {
  const idx = columnFlow.indexOf(status);
  if (idx <= 0) return true;
  const prevStatus = columnFlow[idx - 1];
  return allTasks.some((task) => task.status === prevStatus);
};

const getTasksForCurrentUser = () => {
  const allTasks = appState.tasks || [];
  if (appState.currentUser.role === "admin") return allTasks;
  return allTasks.filter((task) => task.owner === appState.currentUser.login);
};

const updateFooterCounts = () => {
  const allTasks = appState.tasks || [];
  const activeCount = allTasks.filter((task) => task.status === "backlog").length;
  const finishedCount = allTasks.filter((task) => task.status === "finished").length;
  const footer = document.querySelector("#footer");
  if (!footer) return;
  footer.querySelector("#active-count").textContent = activeCount;
  footer.querySelector("#finished-count").textContent = finishedCount;
};

const attachDragAndDrop = () => {
  const boardRoot = getBoardRoot();
  if (!boardRoot) return;

  let draggedTaskId = null;

  const clearDropTargets = () => {
    boardRoot
      .querySelectorAll(`.${dropTargetClass}`)
      .forEach((column) => column.classList.remove(dropTargetClass));
  };

  boardRoot.querySelectorAll(".board__task").forEach((taskEl) => {
    const taskId = taskEl.dataset.id;
    const taskData = appState.tasks.find((task) => task.id === taskId);
    const isAllowed = canModifyTask(taskData);
    taskEl.setAttribute("draggable", isAllowed);
    if (!isAllowed) return;

    taskEl.addEventListener("dragstart", (event) => {
      draggedTaskId = taskId;
      taskEl.classList.add(draggingClass);
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", taskId);
      }
    });

    taskEl.addEventListener("dragend", () => {
      draggedTaskId = null;
      taskEl.classList.remove(draggingClass);
      clearDropTargets();
    });
  });

  boardRoot.querySelectorAll(".board__column").forEach((columnEl) => {
    const columnStatus = columnEl.dataset.status;

    columnEl.addEventListener("dragover", (event) => {
      if (!draggedTaskId) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      columnEl.classList.add(dropTargetClass);
    });

    columnEl.addEventListener("dragleave", () => {
      columnEl.classList.remove(dropTargetClass);
    });

    columnEl.addEventListener("drop", (event) => {
      event.preventDefault();
      columnEl.classList.remove(dropTargetClass);
      if (!draggedTaskId) return;
      const taskData = appState.tasks.find((task) => task.id === draggedTaskId);
      if (!canModifyTask(taskData)) return;
      const nextStatus = columnStatus;
      if (taskData.status === nextStatus) return;
      moveTask(draggedTaskId, nextStatus);
      rerenderBoard();
    });
  });
};

const buildDropdown = (column, status) => {
  const prevTasks = getPrevTasks(status);
  const controls = column.querySelector(".board__controls");
  controls.insertAdjacentHTML("afterbegin", dropdownTemplate(prevTasks));
  const dropdown = controls.querySelector(".board__dropdown");
  dropdown.addEventListener("click", (e) => {
    const item = e.target.closest(".board__dropdown-item");
    if (!item) return;
    moveTask(item.dataset.id, status);
    rerenderBoard();
  });
};

const addTaskForm = (column) => {
  const controls = column.querySelector(".board__controls");
  const addBtn = controls.querySelector(".board__add");
  addBtn.textContent = "Submit";
  controls.insertAdjacentHTML("afterbegin", addTaskFormTemplate());
  const input = controls.querySelector(".board__input");
  input.focus();
  const submitTask = () => {
    const value = input.value.trim();
    if (value) {
      createTask(value, appState.currentUser.login);
      rerenderBoard();
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
    if (event.key === "Escape") {
      input.value = "";
      input.blur();
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

const handleColumnAdd = (status, column) => {
  if (status === "backlog") {
    addTaskForm(column);
    return;
  }
  const hasPrev = canMoveFromPrev(status, getTasksForCurrentUser());
  if (!hasPrev) return;
  buildDropdown(column, status);
};

const handleEdit = (taskId) => {
  const target = appState.tasks.find((task) => task.id === taskId);
  if (!canModifyTask(target)) return;
  const nextTitle = prompt("Изменить название задачи", target.title);
  if (nextTitle === null) return;
  const trimmed = nextTitle.trim();
  if (!trimmed) return;
  retitleTask(taskId, trimmed);
  rerenderBoard();
};

const handleDelete = (taskId) => {
  const target = appState.tasks.find((task) => task.id === taskId);
  if (!canDeleteTask(target)) return;
  const confirmed = window.confirm("Удалить задачу без возможности восстановления?");
  if (!confirmed) return;
  removeTask(taskId);
  rerenderBoard();
};

const handleComplete = (taskId) => {
  const target = appState.tasks.find((task) => task.id === taskId);
  if (!canModifyTask(target)) return;
  moveTask(taskId, "finished");
  rerenderBoard();
};

let openedMenuId = null;
let lastMenuTrigger = null;
let lastMenuTriggerTaskId = null;
let listenersBound = false;

const closeAllTaskMenus = ({ restoreFocus, preserveTriggerId } = { restoreFocus: false, preserveTriggerId: false }) => {
  document.querySelectorAll(".task-menu__dropdown").forEach((menu) => {
    menu.hidden = true;
    menu.parentElement?.querySelector(".task-menu__trigger")?.setAttribute("aria-expanded", "false");
  });
  openedMenuId = null;
  if (restoreFocus) {
    const connectedTrigger =
      lastMenuTrigger instanceof HTMLElement && document.contains(lastMenuTrigger)
        ? lastMenuTrigger
        : null;
    const fallbackTrigger = document.querySelector(
      `.task-menu[data-task-id="${lastMenuTriggerTaskId}"] .task-menu__trigger`
    );
    (connectedTrigger || fallbackTrigger)?.focus();
  }
  lastMenuTrigger = null;
  if (!preserveTriggerId) lastMenuTriggerTaskId = null;
};

const focusFirstMenuItem = (menu) => {
  const firstItem = menu.querySelector(".task-menu__item:not([disabled])");
  if (firstItem instanceof HTMLElement) {
    firstItem.focus();
  }
};

const toggleTaskMenu = (taskId, trigger) => {
  if (!(trigger instanceof HTMLElement)) return;
  const menuWrapper = trigger.closest(".task-menu");
  const menu = menuWrapper?.querySelector(".task-menu__dropdown");
  if (!menu) return;

  if (openedMenuId && openedMenuId !== taskId) {
    closeAllTaskMenus();
  }

  const isOpen = menu.hidden === false;
  if (isOpen) {
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    trigger.focus();
    openedMenuId = null;
    lastMenuTrigger = null;
    lastMenuTriggerTaskId = null;
    return;
  }

  menu.hidden = false;
  trigger.setAttribute("aria-expanded", "true");
  lastMenuTrigger = trigger;
  lastMenuTriggerTaskId = taskId;
  openedMenuId = taskId;
  focusFirstMenuItem(menu);
};

const handleOutsideClick = (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.closest(".task-menu")) return;
  closeAllTaskMenus({ restoreFocus: true });
};

const handleGlobalKeydown = (event) => {
  if (event.key !== "Escape") return;
  const wasOpen = openedMenuId !== null;
  closeAllTaskMenus({ restoreFocus: wasOpen });
};

const bindGlobalMenuListeners = () => {
  if (listenersBound) return;
  document.addEventListener("click", handleOutsideClick);
  document.addEventListener("keydown", handleGlobalKeydown);
  listenersBound = true;
};

const attachColumnHandlers = () => {
  const boardRoot = getBoardRoot();
  if (!boardRoot) return;
  bindGlobalMenuListeners();
  boardRoot.querySelectorAll(".board__column").forEach((column) => {
    const status = column.getAttribute("data-status");
    const addBtn = column.querySelector(".board__add");
    addBtn.addEventListener("click", () => handleColumnAdd(status, column));
    column.addEventListener("click", (e) => {
      const button = e.target.closest("[data-action]");
      if (!button) return;
      const action = button.dataset.action;
      const taskId = button.dataset.id || button.closest(".board__task")?.dataset.id;
      if (!taskId) return;
      switch (action) {
        case "open-menu":
          toggleTaskMenu(taskId, button);
          return;
        case "delete":
          handleDelete(taskId);
          closeAllTaskMenus({ restoreFocus: true });
          return;
        case "edit":
          handleEdit(taskId);
          closeAllTaskMenus({ restoreFocus: true });
          return;
        case "complete":
          handleComplete(taskId);
          closeAllTaskMenus({ restoreFocus: true });
          return;
        default:
          break;
      }
    });
    column.addEventListener("keydown", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.dataset.action;
      if (!action) return;
      if (["Enter", " "].includes(event.key)) {
        event.preventDefault();
        target.click();
      }
      if (event.key === "Escape") {
        closeAllTaskMenus({ restoreFocus: true });
      }
    });
  });
};

const renderAdminPanel = () => {
  const adminRoot = document.querySelector("#admin-panel");
  if (!adminRoot || appState.currentUser.role !== "admin") return;
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
    usersList.push({
      id: uuid(),
      login,
      password,
      role,
      profile: { displayName: login },
    });
    saveUsers(usersList);
    renderAdminPanel();
    rerenderBoard();
  });
  adminRoot.querySelectorAll(".user-admin__delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeUserById(btn.dataset.id);
      renderAdminPanel();
      rerenderBoard();
    });
  });
};

const updateOwnerFilter = () => {
  const ownerSelect = document.querySelector(filtersSelectors.owner);
  if (!ownerSelect) return;
  const owners = buildOwnerOptions(appState.currentUser);
  ownerSelect.innerHTML = `
    <option value="all">Все исполнители</option>
    ${owners
      .map(
        (owner) => `<option value="${owner.value}">${owner.label}</option>`
      )
      .join("")}
  `;
  ownerSelect.value = lens.owner;
};

const hideOwnerControlsForUser = () => {
  if (isAdmin()) return;
  const ownerSelect = document.querySelector(filtersSelectors.owner);
  const ownerGroup = ownerSelect?.closest(".board-toolbar__group");
  if (ownerGroup) ownerGroup.remove();
  const sortSelect = document.querySelector(filtersSelectors.sort);
  if (sortSelect) {
    const ownerSortOption = sortSelect.querySelector('option[value="owner"]');
    if (ownerSortOption) ownerSortOption.remove();
    if (lens.sort === "owner") {
      lens = { ...lens, sort: "recent" };
      sortSelect.value = lens.sort;
    }
  }
};

const bindFilters = () => {
  if (filtersBound) return;
  const queryInput = document.querySelector(filtersSelectors.query);
  const statusSelect = document.querySelector(filtersSelectors.status);
  const ownerSelect = document.querySelector(filtersSelectors.owner);
  const sortSelect = document.querySelector(filtersSelectors.sort);
  if (!queryInput || !statusSelect || !sortSelect) return;

  queryInput.addEventListener("input", (event) => {
    lens = { ...lens, query: event.target.value.trim() };
    rerenderBoard();
  });
  statusSelect.addEventListener("change", (event) => {
    lens = { ...lens, status: event.target.value };
    rerenderBoard();
  });
  if (ownerSelect) {
    ownerSelect.addEventListener("change", (event) => {
      lens = { ...lens, owner: event.target.value };
      rerenderBoard();
    });
  }
  sortSelect.addEventListener("change", (event) => {
    lens = { ...lens, sort: event.target.value };
    rerenderBoard();
  });
  filtersBound = true;
};

const syncFilterControls = () => {
  const queryInput = document.querySelector(filtersSelectors.query);
  const statusSelect = document.querySelector(filtersSelectors.status);
  const ownerSelect = document.querySelector(filtersSelectors.owner);
  const sortSelect = document.querySelector(filtersSelectors.sort);
  if (queryInput) queryInput.value = lens.query;
  if (statusSelect) statusSelect.value = lens.status;
  if (ownerSelect) ownerSelect.value = lens.owner;
  if (sortSelect) sortSelect.value = lens.sort;
};

const rerenderBoard = () => {
  hydrateTasks();
  closeAllTaskMenus({ preserveTriggerId: true });
  const tasks = getTasksForCurrentUser();
  const visibleTasks = applyLens(tasks, lens);
  const boardRoot = getBoardRoot();
  if (!boardRoot) return;
  const isAdmin = appState.currentUser?.role === "admin";
  boardRoot.classList.toggle("board--admin", isAdmin);
  boardRoot.classList.toggle("board--user", !isAdmin);
  boardRoot.innerHTML = renderBoardHtml(visibleTasks, {
    owners: buildOwnerOptions(appState.currentUser),
    canEdit: canModifyTask,
    canDelete: canDeleteTask,
    canDrag: canModifyTask,
    disableNonBacklog: canMoveFromPrev,
    activeClass,
    disabledClass,
    fullList: tasks,
  });
  attachColumnHandlers();
  attachDragAndDrop();
  renderAdminPanel();
  updateOwnerFilter();
  syncFilterControls();
  updateFooterCounts();
};

export const buildHeaderControls = () => {
  const headerHello = document.querySelector("#header-hello");
  const signOutBtn = document.querySelector("#sign-out-btn");
  const menuLogin = document.querySelector("#user-menu-login");
  const displayName = appState.currentUser.profile?.displayName || appState.currentUser.login;
  if (headerHello) headerHello.textContent = `Здравствуйте, ${displayName}`;
  if (signOutBtn) signOutBtn.classList.remove("hidden");
  if (menuLogin) menuLogin.textContent = displayName;
};

export const buildBoard = () => {
  hydrateTasks();
  lens = defaultLens();
  filtersBound = false;
  hideOwnerControlsForUser();
  updateOwnerFilter();
  bindFilters();
  rerenderBoard();
};
