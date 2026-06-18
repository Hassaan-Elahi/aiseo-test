import { Controller, Get } from "@nestjs/common";
import { MetricsService } from "./metrics.service";

@Controller()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get("metrics-status")
  getMetricsStatus() {
    return {
      summary: this.metricsService.getSummary(),
      recentWindows: this.metricsService.getRecentSnapshots(),
    };
  }
}
