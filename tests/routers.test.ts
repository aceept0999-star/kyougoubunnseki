import { describe, it, expect } from "vitest";

// Mock environment variables
process.env.DATAFORSEO_LOGIN = "test@example.com";
process.env.DATAFORSEO_PASSWORD = "testpassword";
process.env.GOOGLE_API_KEY = "test-google-key";

describe("Server Router Structure", () => {
  it("should export appRouter with expected routes", async () => {
    const { appRouter } = await import("@/server/routers");
    expect(appRouter).toBeDefined();
    const routerDef = appRouter._def;
    expect(routerDef).toBeDefined();
  });

  it("should have analysis namespace with expected procedures", async () => {
    const { appRouter } = await import("@/server/routers");
    const procedures = appRouter._def.procedures as Record<string, unknown>;

    expect(procedures["analysis.getTrafficSources"]).toBeDefined();
    expect(procedures["analysis.getTotalVisits"]).toBeDefined();
    expect(procedures["analysis.getBounceRate"]).toBeDefined();
    expect(procedures["analysis.getUniqueVisitors"]).toBeDefined();
    expect(procedures["analysis.getGlobalRank"]).toBeDefined();
    expect(procedures["analysis.getTrafficByCountry"]).toBeDefined();
    expect(procedures["analysis.getDomainKeywords"]).toBeDefined();
    expect(procedures["analysis.getCompetitors"]).toBeDefined();
    expect(procedures["analysis.getPageSpeed"]).toBeDefined();
  });

  it("should have auth namespace", async () => {
    const { appRouter } = await import("@/server/routers");
    const procedures = appRouter._def.procedures as Record<string, unknown>;

    expect(procedures["auth.me"]).toBeDefined();
    expect(procedures["auth.logout"]).toBeDefined();
  });
});

describe("Date Helper Functions", () => {
  it("should generate valid date strings in YYYY-MM format", () => {
    const now = new Date();
    const startMonth = now.getMonth() - 4;
    const endMonth = now.getMonth() - 1;

    const startDate = new Date(now.getFullYear(), startMonth, 1);
    const endDate = new Date(now.getFullYear(), endMonth, 1);

    const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}`;
    const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}`;

    expect(startStr).toMatch(/^\d{4}-\d{2}$/);
    expect(endStr).toMatch(/^\d{4}-\d{2}$/);
  });
});
