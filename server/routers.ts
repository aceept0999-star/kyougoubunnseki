import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { callDataApi } from "./_core/dataApi";
import { z } from "zod";

// DataForSEO API helper
async function callDataForSEO(endpoint: string, body?: unknown[]) {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) throw new Error("DataForSEO credentials not configured");

  const credentials = Buffer.from(`${login}:${password}`).toString("base64");
  const response = await fetch(`https://api.dataforseo.com/v3${endpoint}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`DataForSEO API error: ${response.status} ${text}`);
  }
  return response.json();
}

// Google PageSpeed API helper
async function callPageSpeedAPI(url: string, strategy: "mobile" | "desktop" = "mobile") {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Google API key not configured");

  const params = new URLSearchParams({
    url,
    key: apiKey,
    strategy,
    category: "performance",
  });

  const response = await fetch(
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`PageSpeed API error: ${response.status} ${text}`);
  }
  return response.json();
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // 競合分析API
  analysis: router({
    // SimilarWeb: トラフィックソース（デスクトップ）
    getTrafficSources: publicProcedure
      .input(
        z.object({
          domain: z.string(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        try {
          const result = await callDataApi("Similarweb/get_traffic_sources_desktop", {
            pathParams: { domain: input.domain },
            query: {
              country: "world",
              granularity: "monthly",
              main_domain_only: false,
              start_date: input.startDate || getDefaultStartDate(),
              end_date: input.endDate || getDefaultEndDate(),
            },
          });
          return { success: true, data: result };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return { success: false, error: message, data: null };
        }
      }),

    // SimilarWeb: 総訪問数
    getTotalVisits: publicProcedure
      .input(
        z.object({
          domain: z.string(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        try {
          const result = await callDataApi("Similarweb/get_visits_total", {
            pathParams: { domain: input.domain },
            query: {
              country: "world",
              granularity: "monthly",
              main_domain_only: false,
              start_date: input.startDate || getDefaultStartDate(),
              end_date: input.endDate || getDefaultEndDate(),
            },
          });
          return { success: true, data: result };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return { success: false, error: message, data: null };
        }
      }),

    // SimilarWeb: 直帰率
    getBounceRate: publicProcedure
      .input(
        z.object({
          domain: z.string(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        try {
          const result = await callDataApi("Similarweb/get_bounce_rate", {
            pathParams: { domain: input.domain },
            query: {
              country: "world",
              granularity: "monthly",
              main_domain_only: false,
              start_date: input.startDate || getDefaultStartDate(),
              end_date: input.endDate || getDefaultEndDate(),
            },
          });
          return { success: true, data: result };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return { success: false, error: message, data: null };
        }
      }),

    // SimilarWeb: ユニーク訪問者
    getUniqueVisitors: publicProcedure
      .input(
        z.object({
          domain: z.string(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        try {
          const result = await callDataApi("Similarweb/get_unique_visit", {
            pathParams: { domain: input.domain },
            query: {
              main_domain_only: false,
              start_date: input.startDate || getDefaultStartDate(),
              end_date: input.endDate || getDefaultEndDate(),
            },
          });
          return { success: true, data: result };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return { success: false, error: message, data: null };
        }
      }),

    // SimilarWeb: グローバルランク
    getGlobalRank: publicProcedure
      .input(
        z.object({
          domain: z.string(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        try {
          const result = await callDataApi("Similarweb/get_global_rank", {
            pathParams: { domain: input.domain },
            query: {
              main_domain_only: false,
              start_date: input.startDate || getDefaultStartDate(),
              end_date: input.endDate || getDefaultEndDate(),
            },
          });
          return { success: true, data: result };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return { success: false, error: message, data: null };
        }
      }),

    // SimilarWeb: 国別トラフィック
    getTrafficByCountry: publicProcedure
      .input(
        z.object({
          domain: z.string(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        try {
          const result = await callDataApi("Similarweb/get_total_traffic_by_country", {
            pathParams: { domain: input.domain },
            query: {
              main_domain_only: true,
              limit: "5",
              start_date: input.startDate || getDefaultStartDate(),
              end_date: input.endDate || getDefaultEndDate(),
            },
          });
          return { success: true, data: result };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return { success: false, error: message, data: null };
        }
      }),

    // DataForSEO: ドメインキーワード
    getDomainKeywords: publicProcedure
      .input(
        z.object({
          domain: z.string(),
          locationCode: z.number().default(2392), // Japan
          languageCode: z.string().default("ja"),
          limit: z.number().default(20),
        })
      )
      .query(async ({ input }) => {
        try {
          const result = await callDataForSEO(
            "/dataforseo_labs/google/ranked_keywords/live",
            [
              {
                target: input.domain,
                location_code: input.locationCode,
                language_code: input.languageCode,
                limit: input.limit,
              },
            ]
          );
          return { success: true, data: result };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return { success: false, error: message, data: null };
        }
      }),

    // DataForSEO: 競合ドメイン発見
    getCompetitors: publicProcedure
      .input(
        z.object({
          domain: z.string(),
          locationCode: z.number().default(2392),
          languageCode: z.string().default("ja"),
          limit: z.number().default(10),
        })
      )
      .query(async ({ input }) => {
        try {
          const result = await callDataForSEO(
            "/dataforseo_labs/google/competitors_domain/live",
            [
              {
                target: input.domain,
                location_code: input.locationCode,
                language_code: input.languageCode,
                limit: input.limit,
              },
            ]
          );
          return { success: true, data: result };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return { success: false, error: message, data: null };
        }
      }),

    // Google PageSpeed Insights
    getPageSpeed: publicProcedure
      .input(
        z.object({
          url: z.string().url(),
          strategy: z.enum(["mobile", "desktop"]).default("mobile"),
        })
      )
      .query(async ({ input }) => {
        try {
          const result = await callPageSpeedAPI(input.url, input.strategy);
          const lhr = result.lighthouseResult;
          return {
            success: true,
            data: {
              performanceScore: Math.round((lhr?.categories?.performance?.score || 0) * 100),
              metrics: {
                fcp: lhr?.audits?.["first-contentful-paint"]?.displayValue || "N/A",
                lcp: lhr?.audits?.["largest-contentful-paint"]?.displayValue || "N/A",
                tbt: lhr?.audits?.["total-blocking-time"]?.displayValue || "N/A",
                cls: lhr?.audits?.["cumulative-layout-shift"]?.displayValue || "N/A",
                si: lhr?.audits?.["speed-index"]?.displayValue || "N/A",
              },
            },
          };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return { success: false, error: message, data: null };
        }
      }),
  }),
});

// Helper functions
function getDefaultStartDate(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 4, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getDefaultEndDate(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export type AppRouter = typeof appRouter;
