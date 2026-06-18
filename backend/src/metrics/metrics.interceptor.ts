import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { MetricsService } from "./metrics.service";

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const response = context.switchToHttp().getResponse<{ statusCode?: number }>();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - start;
          const statusCode = response.statusCode ?? 200;
          this.metricsService.recordRequest(durationMs, statusCode >= 400);
        },
        error: (error: unknown) => {
          const durationMs = Date.now() - start;
          const httpStatus =
            error instanceof HttpException ? error.getStatus() : response.statusCode;
          this.metricsService.recordRequest(durationMs, (httpStatus ?? 500) >= 400);
        },
      }),
    );
  }
}
