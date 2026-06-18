import { Injectable } from "@nestjs/common";
import { User } from "./user.types";

@Injectable()
export class UsersDataStore {
  private nextId = 4;

  private readonly users = new Map<number, User>([
    [1, { id: 1, name: "John Doe", email: "john@example.com" }],
    [2, { id: 2, name: "Jane Smith", email: "jane@example.com" }],
    [3, { id: 3, name: "Alice Johnson", email: "alice@example.com" }],
  ]);

  getById(id: number): User | undefined {
    return this.users.get(id);
  }

  create(payload: Omit<User, "id">): User {
    const user: User = {
      id: this.nextId,
      name: payload.name,
      email: payload.email,
    };

    this.users.set(user.id, user);
    this.nextId += 1;
    return user;
  }
}
