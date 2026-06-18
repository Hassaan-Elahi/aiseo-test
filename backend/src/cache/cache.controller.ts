import { Controller, Delete, Get } from "@nestjs/common";
import { CacheService } from "./cache.service";
import { MetricsService } from "../metrics/metrics.service";

@Controller()
export class CacheController {
  constructor(
    private readonly cacheService: CacheService,
    private readonly metricsService: MetricsService,
  ) {}

  @Delete("cache")
  clearCache() {
    this.cacheService.clear();
    return {
      message: "Cache cleared successfully",
      cache: this.cacheService.getStatus(),
    };
  }

  @Get("cache-status")
  cacheStatus() {
    const metricsSummary = this.metricsService.getSummary();

    return {
      ...this.cacheService.getStatus(),
      averageResponseTimeMs: metricsSummary.averageResponseTimeMs,
      p95ResponseTimeMs: metricsSummary.p95ResponseTimeMs,
      totalRequests: metricsSummary.totalRequests,
      totalErrors: metricsSummary.totalErrors,
      errorRate: metricsSummary.errorRate,
    };
  }
}
