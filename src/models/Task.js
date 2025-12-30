import { BaseModel } from "./BaseModel";

export class Task extends BaseModel {
  constructor(title, description = "", status = "backlog", owner) {
    super();
    this.title = title;
    this.description = description;
    this.status = status;
    this.owner = owner;
  }
}
