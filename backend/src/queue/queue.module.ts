import { Global, Module } from "@nestjs/common";
import { AsyncQueueService } from "./async-queue.service";

@Global()
@Module({
  providers: [AsyncQueueService],
  exports: [AsyncQueueService],
})
export class QueueModule {}
