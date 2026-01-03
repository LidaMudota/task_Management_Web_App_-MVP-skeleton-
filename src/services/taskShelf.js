import { appState } from "../app";
import { Task } from "../models/Task";
import { columnFlow } from "./taskScheme";
import { ensureTaskShape } from "./taskLens";

const toResult = (ok, payload = {}) => ({ ok, ...payload });

const readTasks = () => ensureTaskShape(appState.tasks || []);

const persistTasks = (tasks) => {
  appState.tasks = tasks;
  return tasks;
};

const findTaskIndex = (tasks, taskId) => tasks.findIndex((task) => task.id === taskId);

const isStatusAllowed = (status) => columnFlow.includes(status);

export const pullTasks = () => toResult(true, { tasks: persistTasks(readTasks()) });

export const addTask = ({ title, description = "", status = "backlog", owner }) => {
  const trimmedTitle = (title || "").trim();
  if (!trimmedTitle) {
    return toResult(false, { message: "Укажите название задачи." });
  }
  if (!isStatusAllowed(status)) {
    return toResult(false, { message: "Недопустимый статус задачи." });
  }
  const currentTasks = readTasks();
  const taskOwner = owner || appState.currentUser?.login || "";
  const nextTask = new Task(trimmedTitle, description, status, taskOwner);
  const nextList = persistTasks([...currentTasks, nextTask]);
  return toResult(true, { tasks: nextList, task: nextTask });
};

export const renameTask = (taskId, title) => {
  const trimmedTitle = (title || "").trim();
  if (!trimmedTitle) {
    return toResult(false, { message: "Название задачи не может быть пустым." });
  }
  const currentTasks = readTasks();
  const idx = findTaskIndex(currentTasks, taskId);
  if (idx === -1) {
    return toResult(false, { message: "Задача не найдена." });
  }
  const nextTask = {
    ...currentTasks[idx],
    title: trimmedTitle,
    updatedAt: new Date().toISOString(),
  };
  const nextList = [...currentTasks];
  nextList[idx] = nextTask;
  return toResult(true, { tasks: persistTasks(nextList), task: nextTask });
};

export const shiftTask = (taskId, status) => {
  if (!isStatusAllowed(status)) {
    return toResult(false, { message: "Недопустимый статус задачи." });
  }
  const currentTasks = readTasks();
  const idx = findTaskIndex(currentTasks, taskId);
  if (idx === -1) {
    return toResult(false, { message: "Задача не найдена." });
  }
  const nextTask = {
    ...currentTasks[idx],
    status,
    updatedAt: new Date().toISOString(),
  };
  const nextList = [...currentTasks];
  nextList[idx] = nextTask;
  return toResult(true, { tasks: persistTasks(nextList), task: nextTask });
};

export const reassignTask = (taskId, owner) => {
  const currentTasks = readTasks();
  const idx = findTaskIndex(currentTasks, taskId);
  if (idx === -1) {
    return toResult(false, { message: "Задача не найдена." });
  }
  const nextTask = {
    ...currentTasks[idx],
    owner,
    updatedAt: new Date().toISOString(),
  };
  const nextList = [...currentTasks];
  nextList[idx] = nextTask;
  return toResult(true, { tasks: persistTasks(nextList), task: nextTask });
};

export const dropTask = (taskId) => {
  const currentTasks = readTasks();
  const nextList = currentTasks.filter((task) => task.id !== taskId);
  if (nextList.length === currentTasks.length) {
    return toResult(false, { message: "Задача не найдена." });
  }
  return toResult(true, { tasks: persistTasks(nextList) });
};
