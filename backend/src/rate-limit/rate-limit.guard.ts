import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import {
  RATE_LIMIT_BURST_CAPACITY,
  RATE_LIMIT_BURST_WINDOW_MS,
  RATE_LIMIT_MINUTE_CAPACITY,
  RATE_LIMIT_MINUTE_WINDOW_MS,
} from "../constants";

interface ClientWindowState {
  requests: number[];
  lastSeenAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly clients = new Map<string, ClientWindowState>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      ip?: string;
      headers: Record<string, string | string[] | undefined>;
      socket?: { remoteAddress?: string };
    }>();
    const response = context.switchToHttp().getResponse<{
      setHeader: (name: string, value: string) => void;
    }>();

    const now = Date.now();
    const key = this.resolveClientKey(request);
    const state = this.clients.get(key) ?? { requests: [], lastSeenAt: now };

    state.requests = state.requests.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_MINUTE_WINDOW_MS,
    );

    const burstCount = state.requests.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_BURST_WINDOW_MS,
    ).length;

    if (burstCount >= RATE_LIMIT_BURST_CAPACITY) {
      const oldestBurstTs = state.requests.find(
        (timestamp) => now - timestamp < RATE_LIMIT_BURST_WINDOW_MS,
      );
      const retryAfterMs = oldestBurstTs
        ? RATE_LIMIT_BURST_WINDOW_MS - (now - oldestBurstTs)
        : RATE_LIMIT_BURST_WINDOW_MS;
      response.setHeader(
        "Retry-After",
        String(Math.max(1, Math.ceil(retryAfterMs / 1000))),
      );
      throw this.tooManyRequests(
        "Burst rate limit exceeded (5 requests per 10 seconds)",
        Math.max(1, Math.ceil(retryAfterMs / 1000)),
        "burst",
      );
    }

    if (state.requests.length >= RATE_LIMIT_MINUTE_CAPACITY) {
      const oldestMinuteTs = state.requests[0];
      const retryAfterMs = RATE_LIMIT_MINUTE_WINDOW_MS - (now - oldestMinuteTs);
      response.setHeader(
        "Retry-After",
        String(Math.max(1, Math.ceil(retryAfterMs / 1000))),
      );
      throw this.tooManyRequests(
        "Rate limit exceeded (10 requests per minute)",
        Math.max(1, Math.ceil(retryAfterMs / 1000)),
        "minute",
      );
    }

    state.requests.push(now);
    state.lastSeenAt = now;
    this.clients.set(key, state);
    this.cleanupIdleClients(now);

    return true;
  }

  private resolveClientKey(request: {
    ip?: string;
    headers: Record<string, string | string[] | undefined>;
    socket?: { remoteAddress?: string };
  }): string {
    const forwarded = request.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
      return forwarded.split(",")[0].trim();
    }

    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0].split(",")[0].trim();
    }

    return request.ip ?? request.socket?.remoteAddress ?? "unknown";
  }

  private cleanupIdleClients(now: number): void {
    for (const [key, state] of this.clients.entries()) {
      if (now - state.lastSeenAt > RATE_LIMIT_MINUTE_WINDOW_MS * 2) {
        this.clients.delete(key);
      }
    }
  }

  private tooManyRequests(
    message: string,
    retryAfterSeconds: number,
    window: "burst" | "minute",
  ): HttpException {
    return new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: "Too Many Requests",
        message,
        window,
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
