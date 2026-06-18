import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { CacheModule } from "./cache/cache.module";
import { MetricsModule } from "./metrics/metrics.module";
import { MetricsInterceptor } from "./metrics/metrics.interceptor";
import { RateLimitGuard } from "./rate-limit/rate-limit.guard";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [UsersModule, CacheModule, MetricsModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
