import { appState } from "../app";
import { Task } from "../models/Task";
import { ensureTaskShape } from "./taskLens";

const withUpdatedTasks = (updater) => {
  const next = updater(ensureTaskShape(appState.tasks));
  appState.tasks = next;
  return next;
};

export const createTask = (title, owner) =>
  withUpdatedTasks((tasks) => [...tasks, new Task(title, "", "backlog", owner)]);

export const retitleTask = (taskId, title) =>
  withUpdatedTasks((tasks) =>
    tasks.map((task) =>
      task.id === taskId ? { ...task, title, updatedAt: new Date().toISOString() } : task
    )
  );

export const moveTask = (taskId, status) =>
  withUpdatedTasks((tasks) =>
    tasks.map((task) =>
      task.id === taskId ? { ...task, status, updatedAt: new Date().toISOString() } : task
    )
  );

export const assignTask = (taskId, owner) =>
  withUpdatedTasks((tasks) =>
    tasks.map((task) =>
      task.id === taskId ? { ...task, owner, updatedAt: new Date().toISOString() } : task
    )
  );

export const removeTask = (taskId) =>
  withUpdatedTasks((tasks) => tasks.filter((task) => task.id !== taskId));

export const hydrateTasks = () => {
  appState.tasks = ensureTaskShape(appState.tasks);
};
