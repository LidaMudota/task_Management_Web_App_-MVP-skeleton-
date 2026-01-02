import taskCardTemplate from "../templates/taskCard.html";
import { columnOrder, columnTitles } from "./taskScheme";

const fillTemplate = (template, replacements) =>
  Object.entries(replacements).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value ?? ""),
    template
  );

const buildInitials = (text = "") => {
  const trimmed = text.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const renderAssignment = (task, owners) => {
  const label =
    owners.find((user) => user.value === task.owner)?.label || task.owner || "не назначен";
  const initials = buildInitials(label);

  return `
    <div class="board__assignee-chip" aria-label="Назначена: ${label}">
      <span class="board__assignee-avatar" aria-hidden="true">${initials}</span>
      <div class="board__assignee-text">
        <span class="board__assignee-label">Исполнитель</span>
        <span class="board__assignee-name">${label}</span>
      </div>
    </div>
  `;
};

const renderActionsMenu = (task, context) => {
  const { canEdit, canDelete } = context;
  const isEditable = typeof canEdit === "function" ? canEdit(task) : !!canEdit;
  const isDeletable = typeof canDelete === "function" ? canDelete(task) : !!canDelete;
  const assigneeName = context.owners.find((user) => user.value === task.owner)?.label || task.owner || "не назначен";

  return `
    <div class="task-menu" data-task-id="${task.id}">
      <button
        class="task-menu__trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded="false"
        aria-label="Меню задачи"
        data-id="${task.id}"
        data-action="open-menu"
        draggable="false"
      >
        ⋯
      </button>
      <div class="task-menu__dropdown" role="menu" aria-label="Действия с задачей" hidden>
        <button class="task-menu__item" type="button" role="menuitem" draggable="false" data-id="${task.id}" data-action="edit" ${
          isEditable ? "" : "disabled"
        }>Изменить</button>
        <button class="task-menu__item" type="button" role="menuitem" draggable="false" data-id="${task.id}" data-action="complete" ${
          isEditable ? "" : "disabled"
        }>Готово</button>
        <div class="task-menu__label" role="presentation">Исполнитель: ${assigneeName}</div>
        <button class="task-menu__item task-menu__item--danger" type="button" role="menuitem" draggable="false" data-id="${task.id}" data-action="delete" ${
          isDeletable ? "" : "disabled"
        }>Удалить</button>
      </div>
    </div>
  `;
};

export const renderTaskCard = (task, context) => {
  const { owners, canEdit, canDelete, canDrag } = context;
  const draggable = typeof canDrag === "function" ? canDrag(task) : !!canDrag;
  const assignmentBlock = renderAssignment(task, owners);
  const actionsMenu = renderActionsMenu(task, context);
  return fillTemplate(taskCardTemplate, {
    id: task.id,
    title: task.title,
    owner: task.owner,
    status: task.status,
    draggable: draggable ? "true" : "false",
    assignment: assignmentBlock,
    actionsMenu,
    createdAt: new Date(task.createdAt).toLocaleDateString("ru-RU"),
  });
};

const renderColumn = (status, tasks, context) => {
  const tasksHtml = tasks.map((task) => renderTaskCard(task, context)).join("");
  const isDisabled =
    status !== "backlog" &&
    context.disableNonBacklog &&
    context.disableNonBacklog(status, context.fullList || []);
  const addBtnClasses = [
    "board__add",
    isDisabled ? context.disabledClass : context.activeClass,
  ].join(" ");
  return `
    <section class="board__column" data-status="${status}">
      <div class="board__column-header">
        <h2 class="board__column-title">${columnTitles[status]}</h2>
      </div>
      <ul class="board__tasks">${tasksHtml}</ul>
      <div class="board__controls">
        <button class="${addBtnClasses}" type="button">+ Add card</button>
      </div>
    </section>
  `;
};

export const renderBoardHtml = (tasks, context) =>
  columnOrder
    .map((status) =>
      renderColumn(
        status,
        tasks.filter((task) => task.status === status),
        context
      )
    )
    .join("");
