const clampMaxHeight = (tasksContainer) => {
  const firstCard = tasksContainer.querySelector(".board__task");
  if (!firstCard) {
    tasksContainer.style.removeProperty("--task-list-max-height");
    tasksContainer.style.maxHeight = "";
    return;
  }
  const cardHeight = firstCard.offsetHeight;
  const gap = parseFloat(getComputedStyle(tasksContainer).gap || "0");
  const visibleCount = 3;
  const gapsTotal = gap * (visibleCount - 1);
  const maxHeight = cardHeight * visibleCount + gapsTotal;
  tasksContainer.style.setProperty("--task-list-max-height", `${maxHeight}px`);
  tasksContainer.style.maxHeight = `var(--task-list-max-height)`;
};

const watchRegistry = new WeakSet();

export const enforceTaskListHeight = (boardRoot) => {
  if (!boardRoot) return;
  const containers = boardRoot.querySelectorAll(".board__tasks");
  containers.forEach((list) => clampMaxHeight(list));
};

export const bindTaskListHeightWatcher = (boardRoot) => {
  if (!boardRoot || watchRegistry.has(boardRoot)) return;
  const schedule = () => requestAnimationFrame(() => enforceTaskListHeight(boardRoot));
  window.addEventListener("resize", schedule, { passive: true });
  watchRegistry.add(boardRoot);
};
