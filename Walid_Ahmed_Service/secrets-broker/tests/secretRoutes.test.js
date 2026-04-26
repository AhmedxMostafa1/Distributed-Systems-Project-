jest.mock("../src/services/secretService", () => ({
  issueSecret: jest.fn(),
  countActiveSecrets: jest.fn()
}));

const request = require("supertest");
const app = require("../src/app");
const { issueSecret, countActiveSecrets } = require("../src/services/secretService");

describe("Secrets Broker API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GET /docs/openapi.json returns API documentation", async () => {
    const response = await request(app).get("/docs/openapi.json");

    expect(response.statusCode).toBe(200);
    expect(response.body.info.title).toBe("Secrets Broker API");
  });

  test("GET /health returns service status", async () => {
    countActiveSecrets.mockResolvedValue(3);

    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.activeSecrets).toBe(3);
  });

  test("POST /secrets/issue validates input", async () => {
    const response = await request(app).post("/secrets/issue").send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("POST /secrets/issue returns created secret", async () => {
    issueSecret.mockResolvedValue({
      id: "abc123",
      service: "chaos-simulator",
      secret: "plain-secret",
      expires_at: "2026-04-26T22:00:00.000Z",
      issued_at: "2026-04-26T21:00:00.000Z",
      scopes: []
    });

    const response = await request(app).post("/secrets/issue").send({
      service: "chaos-simulator",
      expiresInSeconds: 3600
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.secret).toBe("plain-secret");
  });
});
