import { describe, it, expect } from "vitest";

describe("API Keys Validation", () => {
  it("should have DATAFORSEO_LOGIN set", () => {
    expect(process.env.DATAFORSEO_LOGIN).toBeDefined();
    expect(process.env.DATAFORSEO_LOGIN).not.toBe("");
  });

  it("should have DATAFORSEO_PASSWORD set", () => {
    expect(process.env.DATAFORSEO_PASSWORD).toBeDefined();
    expect(process.env.DATAFORSEO_PASSWORD).not.toBe("");
  });

  it("should have GOOGLE_API_KEY set", () => {
    expect(process.env.GOOGLE_API_KEY).toBeDefined();
    expect(process.env.GOOGLE_API_KEY).not.toBe("");
  });

  it(
    "should authenticate with DataForSEO API",
    async () => {
      const login = process.env.DATAFORSEO_LOGIN;
      const password = process.env.DATAFORSEO_PASSWORD;
      const credentials = Buffer.from(`${login}:${password}`).toString(
        "base64"
      );

      const response = await fetch(
        "https://api.dataforseo.com/v3/appendix/user_data",
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      expect(response.status).toBeLessThan(500);
    },
    30000
  );

  it(
    "should authenticate with Google PageSpeed API",
    async () => {
      const apiKey = process.env.GOOGLE_API_KEY;
      const response = await fetch(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com&key=${apiKey}&strategy=mobile&category=performance`
      );

      expect(response.status).toBeLessThan(500);
    },
    30000
  );
});
