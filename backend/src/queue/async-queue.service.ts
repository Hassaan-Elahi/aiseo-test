import { Injectable } from "@nestjs/common";

interface QueueJob<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

@Injectable()
export class AsyncQueueService {
  private readonly concurrency = 4;
  private running = 0;
  private readonly queue: Array<QueueJob<unknown>> = [];

  enqueue<T>(execute: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        execute: () => execute() as Promise<unknown>,
        resolve: (value) => {
          resolve(value as T);
        },
        reject,
      });
      this.processQueue();
    });
  }

  private processQueue(): void {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) {
        continue;
      }

      this.running += 1;
      void job
        .execute()
        .then((value) => {
          job.resolve(value);
        })
        .catch((error) => {
          job.reject(error);
        })
        .finally(() => {
          this.running -= 1;
          this.processQueue();
        });
    }
  }
}
