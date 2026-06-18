import { Injectable, NotFoundException } from "@nestjs/common";
import { CacheService } from "../cache/cache.service";
import { DB_SIMULATED_DELAY_MS } from "../constants";
import { AsyncQueueService } from "../queue/async-queue.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { User } from "./user.types";
import { UsersDataStore } from "./users.data-store";

@Injectable()
export class UsersService {
  private readonly inFlightByUserId = new Map<number, Promise<User>>();

  constructor(
    private readonly cacheService: CacheService,
    private readonly queueService: AsyncQueueService,
    private readonly usersDataStore: UsersDataStore,
  ) {}

  async getUserById(id: number): Promise<User> {
    const cacheKey = this.getCacheKey(id);
    const cachedUser = this.cacheService.get<User>(cacheKey);
    if (cachedUser) {
      return cachedUser;
    }

    const pending = this.inFlightByUserId.get(id);
    if (pending) {
      return pending;
    }

    const fetchPromise = this.queueService
      .enqueue(async () => {
        await this.simulateDbDelay();
        const user = this.usersDataStore.getById(id);
        if (!user) {
          throw new NotFoundException(`User with id ${id} was not found`);
        }

        this.cacheService.set(cacheKey, user);
        return user;
      })
      .finally(() => {
        this.inFlightByUserId.delete(id);
      });

    this.inFlightByUserId.set(id, fetchPromise);
    return fetchPromise;
  }

  createUser(dto: CreateUserDto): User {
    const user = this.usersDataStore.create({
      name: dto.name,
      email: dto.email,
    });

    this.cacheService.upsert(this.getCacheKey(user.id), user);
    return user;
  }

  private getCacheKey(id: number): string {
    return `user:${id}`;
  }

  private async simulateDbDelay(): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, DB_SIMULATED_DELAY_MS);
    });
  }
}
