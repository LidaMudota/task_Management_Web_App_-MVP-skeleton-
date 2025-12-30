import { BaseModel } from "./BaseModel";

export class Task extends BaseModel {
  constructor(title, description = "", status = "backlog", owner, meta = {}) {
    super();
    this.title = title;
    this.description = description;
    this.status = status;
    this.owner = owner;
    this.createdAt = meta.createdAt || new Date().toISOString();
    this.updatedAt = meta.updatedAt || this.createdAt;
  }
}
