import taskCardTemplate from "../templates/taskCard.html";
import { columnOrder, columnTitles } from "./taskScheme";

const fillTemplate = (template, replacements) =>
  Object.entries(replacements).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value ?? ""),
    template
  );

const renderAssignment = (task, owners, isEditable) => {
  if (!isEditable) {
    const label = owners.find((user) => user.value === task.owner)?.label || task.owner;
    return `<span class="board__task-owner">Назначена: ${label}</span>`;
  }

  const options = owners
    .map(
      (user) =>
        `<option value="${user.value}" ${user.value === task.owner ? "selected" : ""}>${user.label}</option>`
    )
    .join("");

  return `
    <label class="board__assignee-control">
      <span class="board__assignee-label">Назначить</span>
      <select class="board__assignee" data-id="${task.id}">
        ${options}
      </select>
    </label>
  `;
};

const renderDeleteButton = (taskId, canDelete) =>
  canDelete
    ? `<button class="board__task-delete" data-id="${taskId}" data-action="delete" type="button">✕</button>`
    : "";

export const renderTaskCard = (task, context) => {
  const { owners, canEdit, canDelete, canDrag } = context;
  const isEditable = typeof canEdit === "function" ? canEdit(task) : !!canEdit;
  const isDeletable = typeof canDelete === "function" ? canDelete(task) : !!canDelete;
  const draggable = typeof canDrag === "function" ? canDrag(task) : !!canDrag;
  const assignmentBlock = renderAssignment(task, owners, isEditable);
  const deleteButton = renderDeleteButton(task.id, isDeletable);
  return fillTemplate(taskCardTemplate, {
    id: task.id,
    title: task.title,
    owner: task.owner,
    status: task.status,
    draggable: draggable ? "true" : "false",
    assignment: assignmentBlock,
    deleteButton,
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
