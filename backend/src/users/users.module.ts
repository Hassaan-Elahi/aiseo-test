import { Module } from "@nestjs/common";
import { CacheModule } from "../cache/cache.module";
import { QueueModule } from "../queue/queue.module";
import { UsersController } from "./users.controller";
import { UsersDataStore } from "./users.data-store";
import { UsersService } from "./users.service";

@Module({
  imports: [CacheModule, QueueModule],
  controllers: [UsersController],
  providers: [UsersService, UsersDataStore],
})
export class UsersModule {}
