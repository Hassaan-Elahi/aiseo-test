import { Injectable, OnModuleDestroy } from "@nestjs/common";

interface RequestMetricSample {
  timestamp: string;
  requestsInWindow: number;
  errorsInWindow: number;
  averageResponseTimeMs: number;
  errorRate: number;
  totalRequests: number;
  totalErrors: number;
}

@Injectable()
export class MetricsService implements OnModuleDestroy {
  private static readonly METRICS_WINDOW_MS = 10_000;
  private static readonly MAX_SNAPSHOTS = 120;

  private totalRequests = 0;
  private totalErrors = 0;
  private totalResponseTimeMs = 0;
  private readonly recentResponseTimes: number[] = [];
  private readonly snapshots: RequestMetricSample[] = [];

  private lastSnapshotRequestCount = 0;
  private lastSnapshotErrorCount = 0;
  private lastSnapshotResponseTimeTotal = 0;

  private readonly snapshotTimer: NodeJS.Timeout;

  constructor() {
    this.snapshotTimer = setInterval(() => {
      this.captureSnapshot();
    }, MetricsService.METRICS_WINDOW_MS);
  }

  onModuleDestroy(): void {
    clearInterval(this.snapshotTimer);
  }

  recordRequest(durationMs: number, isError: boolean): void {
    this.totalRequests += 1;
    this.totalResponseTimeMs += durationMs;
    if (isError) {
      this.totalErrors += 1;
    }

    this.recentResponseTimes.push(durationMs);
    if (this.recentResponseTimes.length > 500) {
      this.recentResponseTimes.shift();
    }
  }

  getAverageResponseTimeMs(): number {
    if (this.totalRequests === 0) {
      return 0;
    }

    return Number((this.totalResponseTimeMs / this.totalRequests).toFixed(2));
  }

  getSummary() {
    const errorRate =
      this.totalRequests === 0
        ? 0
        : Number((this.totalErrors / this.totalRequests).toFixed(4));

    return {
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      errorRate,
      averageResponseTimeMs: this.getAverageResponseTimeMs(),
      p95ResponseTimeMs: this.getP95ResponseTimeMs(),
    };
  }

  getRecentSnapshots(): RequestMetricSample[] {
    return [...this.snapshots];
  }

  private getP95ResponseTimeMs(): number {
    if (this.recentResponseTimes.length === 0) {
      return 0;
    }

    const sorted = [...this.recentResponseTimes].sort((a, b) => a - b);
    const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
    return sorted[index];
  }

  private captureSnapshot(): void {
    const requestsInWindow = this.totalRequests - this.lastSnapshotRequestCount;
    const errorsInWindow = this.totalErrors - this.lastSnapshotErrorCount;
    const responseTimeWindow =
      this.totalResponseTimeMs - this.lastSnapshotResponseTimeTotal;

    const averageResponseTimeMs =
      requestsInWindow === 0
        ? 0
        : Number((responseTimeWindow / requestsInWindow).toFixed(2));
    const errorRate =
      requestsInWindow === 0
        ? 0
        : Number((errorsInWindow / requestsInWindow).toFixed(4));

    this.snapshots.push({
      timestamp: new Date().toISOString(),
      requestsInWindow,
      errorsInWindow,
      averageResponseTimeMs,
      errorRate,
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
    });

    if (this.snapshots.length > MetricsService.MAX_SNAPSHOTS) {
      this.snapshots.shift();
    }

    this.lastSnapshotRequestCount = this.totalRequests;
    this.lastSnapshotErrorCount = this.totalErrors;
    this.lastSnapshotResponseTimeTotal = this.totalResponseTimeMs;
  }
}
