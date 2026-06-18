import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("User Data API (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.enableCors();
    app.getHttpAdapter().getInstance().set("trust proxy", true);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /users/:id returns user data", async () => {
    const response = await request(app.getHttpServer())
      .get("/users/1")
      .set("x-forwarded-for", "198.51.100.1")
      .expect(200);

    expect(response.body).toEqual({
      id: 1,
      name: "John Doe",
      email: "john@example.com",
    });
  });

  it("GET /users/:id returns 404 for unknown user", async () => {
    await request(app.getHttpServer())
      .get("/users/9999")
      .set("x-forwarded-for", "198.51.100.2")
      .expect(404);
  });

  it("Cache stats show miss then hit for repeated requests", async () => {
    const ip = "198.51.100.3";

    await request(app.getHttpServer()).get("/users/2").set("x-forwarded-for", ip);
    await request(app.getHttpServer()).get("/users/2").set("x-forwarded-for", ip);

    const status = await request(app.getHttpServer())
      .get("/cache-status")
      .set("x-forwarded-for", "198.51.100.30")
      .expect(200);

    expect(status.body.misses).toBeGreaterThanOrEqual(1);
    expect(status.body.hits).toBeGreaterThanOrEqual(1);
    expect(status.body.hitRate).toBeGreaterThanOrEqual(0);
    expect(status.body.errorRate).toBeGreaterThanOrEqual(0);
  });

  it("GET /metrics-status returns metrics summary and recent windows", async () => {
    await request(app.getHttpServer())
      .get("/users/1")
      .set("x-forwarded-for", "198.51.100.80")
      .expect(200);

    const response = await request(app.getHttpServer())
      .get("/metrics-status")
      .set("x-forwarded-for", "198.51.100.81")
      .expect(200);

    expect(response.body.summary).toBeDefined();
    expect(response.body.summary.totalRequests).toBeGreaterThan(0);
    expect(response.body.summary.averageResponseTimeMs).toBeGreaterThanOrEqual(0);
    expect(response.body.summary.errorRate).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(response.body.recentWindows)).toBe(true);
  });

  it("POST /users creates a user and it is retrievable", async () => {
    const created = await request(app.getHttpServer())
      .post("/users")
      .set("x-forwarded-for", "198.51.100.4")
      .send({ name: "Bob Stone", email: "bob@example.com" })
      .expect(201);

    expect(created.body.id).toBeDefined();

    await request(app.getHttpServer())
      .get(`/users/${created.body.id}`)
      .set("x-forwarded-for", "198.51.100.5")
      .expect(200);
  });

  it("Rate limiter rejects burst above 5 requests per 10 seconds", async () => {
    const ip = "203.0.113.10";
    const server = app.getHttpServer();

    for (let i = 0; i < 5; i += 1) {
      await request(server).get("/users/1").set("x-forwarded-for", ip).expect(200);
    }

    const rejected = await request(server)
      .get("/users/1")
      .set("x-forwarded-for", ip)
      .expect(429);

    expect(rejected.body.window).toBe("burst");
  });
});
