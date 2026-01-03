const activeMenuState = {
  dropdown: null,
  trigger: null,
  host: null,
  placeholder: null,
  taskId: null,
};

let lastTriggerTaskId = null;
let menuHandlers = {
  onEdit: () => {},
  onDelete: () => {},
  onComplete: () => {},
};

let layerEl = null;
let listenersAttached = false;
let resizeScheduled = false;
let layerActionsBound = false;

const ensureLayer = () => {
  if (layerEl) return layerEl;
  layerEl = document.createElement("div");
  layerEl.className = "task-menu-layer";
  document.body.appendChild(layerEl);
  return layerEl;
};

const clearInlinePlacement = (dropdown) => {
  dropdown.style.left = "";
  dropdown.style.top = "";
  dropdown.style.visibility = "";
};

const restoreMenuToHost = () => {
  const { dropdown, placeholder, host, trigger } = activeMenuState;
  if (!dropdown) return;
  dropdown.hidden = true;
  dropdown.classList.remove("task-menu__dropdown--floating");
  clearInlinePlacement(dropdown);
  if (placeholder?.parentNode) {
    placeholder.replaceWith(dropdown);
  } else if (host) {
    host.appendChild(dropdown);
  }
  placeholder?.remove();
  trigger?.setAttribute("aria-expanded", "false");
  activeMenuState.dropdown = null;
  activeMenuState.trigger = null;
  activeMenuState.host = null;
  activeMenuState.placeholder = null;
  activeMenuState.taskId = null;
};

export const closeTaskMenus = ({ restoreFocus = false, preserveTriggerId = false } = {}) => {
  const { trigger } = activeMenuState;
  restoreMenuToHost();
  if (restoreFocus && trigger instanceof HTMLElement) {
    trigger.focus();
  }
  if (!preserveTriggerId) {
    lastTriggerTaskId = null;
  }
};

const focusFirstMenuItem = (dropdown) => {
  const firstItem = dropdown.querySelector(
    ".task-menu__item:not([disabled])"
  );
  if (firstItem instanceof HTMLElement) {
    firstItem.focus();
  }
};

const calcPosition = (dropdown, triggerRect) => {
  const viewportPadding = 8;
  const gap = 8;
  const menuRect = dropdown.getBoundingClientRect();
  const prefersLeft = triggerRect.right + menuRect.width + viewportPadding > window.innerWidth;
  const prefersUp = triggerRect.bottom + menuRect.height + viewportPadding > window.innerHeight;

  let left = prefersLeft
    ? triggerRect.right - menuRect.width
    : triggerRect.left;
  let top = prefersUp
    ? triggerRect.top - menuRect.height - gap
    : triggerRect.bottom + gap;

  left = Math.max(viewportPadding, Math.min(left, window.innerWidth - menuRect.width - viewportPadding));
  top = Math.max(viewportPadding, Math.min(top, window.innerHeight - menuRect.height - viewportPadding));

  return { left, top };
};

const placeDropdown = (dropdown, triggerRect) => {
  const layer = ensureLayer();
  dropdown.hidden = false;
  dropdown.classList.add("task-menu__dropdown--floating");
  dropdown.style.visibility = "hidden";
  dropdown.style.left = "0px";
  dropdown.style.top = "0px";
  layer.appendChild(dropdown);

  const { left, top } = calcPosition(dropdown, triggerRect);
  dropdown.style.left = `${left}px`;
  dropdown.style.top = `${top}px`;
  dropdown.style.visibility = "visible";
};

const scheduleReposition = () => {
  if (resizeScheduled) return;
  resizeScheduled = true;
  requestAnimationFrame(() => {
    resizeScheduled = false;
    const { dropdown, trigger } = activeMenuState;
    if (!dropdown || !(trigger instanceof HTMLElement)) return;
    placeDropdown(dropdown, trigger.getBoundingClientRect());
  });
};

const openMenu = (taskId, trigger) => {
  if (!(trigger instanceof HTMLElement)) return;
  if (activeMenuState.taskId === taskId) {
    closeTaskMenus({ restoreFocus: true });
    return;
  }

  closeTaskMenus();
  const menuWrapper = trigger.closest(".task-menu");
  const dropdown = menuWrapper?.querySelector(".task-menu__dropdown");
  if (!dropdown) return;

  const placeholder = document.createElement("div");
  placeholder.className = "task-menu__placeholder";
  placeholder.setAttribute("aria-hidden", "true");
  menuWrapper.insertBefore(placeholder, dropdown);

  activeMenuState.dropdown = dropdown;
  activeMenuState.trigger = trigger;
  activeMenuState.host = menuWrapper;
  activeMenuState.placeholder = placeholder;
  activeMenuState.taskId = taskId;
  lastTriggerTaskId = taskId;

  trigger.setAttribute("aria-expanded", "true");
  placeDropdown(dropdown, trigger.getBoundingClientRect());
  focusFirstMenuItem(dropdown);
};

const handleOutsideClick = (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.closest(".task-menu__dropdown")) return;
  if (target.closest(".task-menu__trigger")) return;
  closeTaskMenus();
};

const handleGlobalKeydown = (event) => {
  if (event.key !== "Escape") return;
  const hasOpen = !!activeMenuState.dropdown;
  closeTaskMenus({ restoreFocus: hasOpen });
};

const bindGlobalListeners = () => {
  if (listenersAttached) return;
  document.addEventListener("click", handleOutsideClick);
  document.addEventListener("keydown", handleGlobalKeydown);
  window.addEventListener("resize", scheduleReposition, { passive: true });
  document.addEventListener("scroll", scheduleReposition, true);
  listenersAttached = true;
};

const handleAction = (action, taskId) => {
  if (!action || !taskId) return;
  switch (action) {
    case "edit":
      menuHandlers.onEdit(taskId);
      break;
    case "delete":
      menuHandlers.onDelete(taskId);
      break;
    case "complete":
      menuHandlers.onComplete(taskId);
      break;
    default:
      break;
  }
};

const attachLayerActions = () => {
  const layer = ensureLayer();
  if (layerActionsBound) return;
  layer.addEventListener("click", (event) => {
    const actionButton = event.target.closest(".task-menu__item");
    if (!actionButton) return;
    const action = actionButton.dataset.action;
    const taskId = actionButton.dataset.id || activeMenuState.taskId || lastTriggerTaskId;
    handleAction(action, taskId);
    closeTaskMenus({ restoreFocus: true });
  });
  layerActionsBound = true;
};

export const bindTaskMenuControls = (boardRoot, handlers) => {
  if (!boardRoot) return;
  menuHandlers = { ...menuHandlers, ...handlers };
  bindGlobalListeners();
  attachLayerActions();

  const handleTriggerClick = (event) => {
    const trigger = event.target.closest(".task-menu__trigger");
    if (!trigger || !boardRoot.contains(trigger)) return;
    event.preventDefault();
    const taskId = trigger.dataset.id || trigger.closest(".task-menu")?.dataset.taskId;
    openMenu(taskId, trigger);
  };

  const handleTriggerKeydown = (event) => {
    const trigger = event.target.closest(".task-menu__trigger");
    if (!trigger || !boardRoot.contains(trigger)) return;
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      const taskId = trigger.dataset.id || trigger.closest(".task-menu")?.dataset.taskId;
      openMenu(taskId, trigger);
    }
  };

  boardRoot.addEventListener("click", handleTriggerClick);
  boardRoot.addEventListener("keydown", handleTriggerKeydown);
};

export const restoreMenuFocus = () => {
  if (!lastTriggerTaskId) return;
  const trigger = document.querySelector(
    `.task-menu[data-task-id="${lastTriggerTaskId}"] .task-menu__trigger`
  );
  if (trigger instanceof HTMLElement) trigger.focus();
};
