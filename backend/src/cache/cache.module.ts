import { Module } from "@nestjs/common";
import { MetricsModule } from "../metrics/metrics.module";
import { CachePerformanceLoggerService } from "./cache-performance-logger.service";
import { CacheController } from "./cache.controller";
import { CacheService } from "./cache.service";

@Module({
  imports: [MetricsModule],
  controllers: [CacheController],
  providers: [CacheService, CachePerformanceLoggerService],
  exports: [CacheService],
})
export class CacheModule {}
