import { addTask, dropTask, pullTasks, reassignTask, renameTask, shiftTask } from "./taskShelf";

export const createTask = (title, owner) => addTask({ title, owner });

export const retitleTask = (taskId, title) => renameTask(taskId, title);

export const moveTask = (taskId, status) => shiftTask(taskId, status);

export const assignTask = (taskId, owner) => reassignTask(taskId, owner);

export const removeTask = (taskId) => dropTask(taskId);

export const hydrateTasks = () => pullTasks();
