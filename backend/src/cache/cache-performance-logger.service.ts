import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { MetricsService } from "../metrics/metrics.service";
import { CacheService } from "./cache.service";

@Injectable()
export class CachePerformanceLoggerService implements OnModuleDestroy {
  private static readonly LOG_INTERVAL_MS = 30_000;

  private readonly logger = new Logger(CachePerformanceLoggerService.name);
  private readonly timer: NodeJS.Timeout;

  constructor(
    private readonly cacheService: CacheService,
    private readonly metricsService: MetricsService,
  ) {
    this.timer = setInterval(() => {
      this.logSnapshot();
    }, CachePerformanceLoggerService.LOG_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  private logSnapshot(): void {
    const cache = this.cacheService.getStatus();
    const metrics = this.metricsService.getSummary();

    this.logger.log(
      JSON.stringify({
        event: "api_performance_snapshot",
        cache,
        metrics,
      }),
    );
  }
}
