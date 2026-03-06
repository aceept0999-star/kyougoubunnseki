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
                exclude_top_domains: true,
              },
            ]
          );
          // Parse response into clean competitor list
          const tasks = result?.tasks || [];
          const items = tasks[0]?.result?.[0]?.items || [];
          const competitors = items.map((item: any) => ({
            domain: item.domain || "",
            avgPosition: item.avg_position || 0,
            intersections: item.intersections || 0,
            organicTraffic: item.full_domain_metrics?.organic?.etv || 0,
            organicKeywords: item.full_domain_metrics?.organic?.count || 0,
            paidTraffic: item.full_domain_metrics?.paid?.etv || 0,
          }));
          return { success: true, data: { competitors } };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return { success: false, error: message, data: null };
        }
      }),

    // DataForSEO: ドメインキーワードインターセクション（共通キーワード）
    getKeywordIntersection: publicProcedure
      .input(
        z.object({
          target1: z.string(),
          target2: z.string(),
          locationCode: z.number().default(2392),
          languageCode: z.string().default("ja"),
          limit: z.number().default(50),
          intersections: z.boolean().default(true),
        })
      )
      .query(async ({ input }) => {
        try {
          const result = await callDataForSEO(
            "/dataforseo_labs/google/domain_intersection/live",
            [
              {
                target1: input.target1,
                target2: input.target2,
                location_code: input.locationCode,
                language_code: input.languageCode,
                limit: input.limit,
                intersections: input.intersections,
                item_types: ["organic"],
                order_by: ["keyword_data.keyword_info.search_volume,desc"],
              },
            ]
          );
          // Parse response into clean keyword data
          const tasks = result?.tasks || [];
          const items = tasks[0]?.result?.[0]?.items || [];
          const totalCount = tasks[0]?.result?.[0]?.total_count || 0;
          const keywords = items.map((item: any) => ({
            keyword: item.keyword_data?.keyword || "",
            searchVolume: item.keyword_data?.keyword_info?.search_volume || 0,
            cpc: item.keyword_data?.keyword_info?.cpc || 0,
            competition: item.keyword_data?.keyword_info?.competition || 0,
            target1Position: item.first_domain_serp_element?.se_position || null,
            target1Etv: item.first_domain_serp_element?.etv || 0,
            target2Position: item.second_domain_serp_element?.se_position || null,
            target2Etv: item.second_domain_serp_element?.etv || 0,
          }));
          return { success: true, data: { keywords, totalCount } };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return { success: false, error: message, data: null };
        }
      }),

    // DataForSEO: キーワードギャップ分析（3つのリクエストをまとめて実行）
    getKeywordGap: publicProcedure
      .input(
        z.object({
          ownDomain: z.string(),
          competitorDomain: z.string(),
          locationCode: z.number().default(2392),
          languageCode: z.string().default("ja"),
          limit: z.number().default(30),
        })
      )
      .query(async ({ input }) => {
        try {
          const baseParams = {
            location_code: input.locationCode,
            language_code: input.languageCode,
            limit: input.limit,
            item_types: ["organic"],
            order_by: ["keyword_data.keyword_info.search_volume,desc"],
          };

          // 3つのリクエストを並行実行
          const [sharedRes, ownOnlyRes, compOnlyRes] = await Promise.all([
            // 共通キーワード
            callDataForSEO("/dataforseo_labs/google/domain_intersection/live", [
              { ...baseParams, target1: input.ownDomain, target2: input.competitorDomain, intersections: true },
            ]),
            // 自社のみのキーワード
            callDataForSEO("/dataforseo_labs/google/domain_intersection/live", [
              { ...baseParams, target1: input.ownDomain, target2: input.competitorDomain, intersections: false },
            ]),
            // 競合のみのキーワード
            callDataForSEO("/dataforseo_labs/google/domain_intersection/live", [
              { ...baseParams, target1: input.competitorDomain, target2: input.ownDomain, intersections: false },
            ]),
          ]);

          const parseItems = (res: any) => {
            const tasks = res?.tasks || [];
            const items = tasks[0]?.result?.[0]?.items || [];
            const totalCount = tasks[0]?.result?.[0]?.total_count || 0;
            return {
              totalCount,
              keywords: items.map((item: any) => ({
                keyword: item.keyword_data?.keyword || "",
                searchVolume: item.keyword_data?.keyword_info?.search_volume || 0,
                cpc: item.keyword_data?.keyword_info?.cpc || 0,
                competition: item.keyword_data?.keyword_info?.competition || 0,
                position1: item.first_domain_serp_element?.se_position || null,
                etv1: item.first_domain_serp_element?.etv || 0,
                position2: item.second_domain_serp_element?.se_position || null,
                etv2: item.second_domain_serp_element?.etv || 0,
              })),
            };
          };

          const shared = parseItems(sharedRes);
          const ownOnly = parseItems(ownOnlyRes);
          const compOnly = parseItems(compOnlyRes);

          return {
            success: true,
            data: {
              shared: { keywords: shared.keywords, totalCount: shared.totalCount },
              ownOnly: { keywords: ownOnly.keywords, totalCount: ownOnly.totalCount },
              competitorOnly: { keywords: compOnly.keywords, totalCount: compOnly.totalCount },
            },
          };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return { success: false, error: message, data: null };
        }
      }),

    // 統合データ更新: SimilarWeb + DataForSEO + PageSpeed を一括取得
    refreshSiteData: publicProcedure
      .input(
        z.object({
          domain: z.string(),
          locationCode: z.number().default(2392),
          languageCode: z.string().default("ja"),
        })
      )
      .mutation(async ({ input }) => {
        const results: Record<string, any> = {};
        const errors: string[] = [];

        // 1. SimilarWeb: Traffic Sources
        try {
          const ts = await callDataApi("Similarweb/get_traffic_sources_desktop", {
            pathParams: { domain: input.domain },
            query: {
              country: "world",
              granularity: "monthly",
              main_domain_only: "false",
              start_date: getDefaultStartDate(),
              end_date: getDefaultEndDate(),
            },
          });
          results.trafficSources = ts;
        } catch (e: any) {
          errors.push(`TrafficSources: ${e.message}`);
        }

        // 2. SimilarWeb: Total Visits
        try {
          const tv = await callDataApi("Similarweb/get_visits_total", {
            pathParams: { domain: input.domain },
            query: {
              country: "world",
              granularity: "monthly",
              main_domain_only: "false",
              start_date: getDefaultStartDate(),
              end_date: getDefaultEndDate(),
            },
          });
          results.totalVisits = tv;
        } catch (e: any) {
          errors.push(`TotalVisits: ${e.message}`);
        }

        // 3. SimilarWeb: Bounce Rate
        try {
          const br = await callDataApi("Similarweb/get_bounce_rate", {
            pathParams: { domain: input.domain },
            query: {
              country: "world",
              granularity: "monthly",
              main_domain_only: "false",
              start_date: getDefaultStartDate(),
              end_date: getDefaultEndDate(),
            },
          });
          results.bounceRate = br;
        } catch (e: any) {
          errors.push(`BounceRate: ${e.message}`);
        }

        // 4. SimilarWeb: Unique Visitors
        try {
          const uv = await callDataApi("Similarweb/get_unique_visit", {
            pathParams: { domain: input.domain },
            query: {
              main_domain_only: "false",
              start_date: getDefaultStartDate(),
              end_date: getDefaultEndDate(),
            },
          });
          results.uniqueVisitors = uv;
        } catch (e: any) {
          errors.push(`UniqueVisitors: ${e.message}`);
        }

        // 5. SimilarWeb: Global Rank
        try {
          const gr = await callDataApi("Similarweb/get_global_rank", {
            pathParams: { domain: input.domain },
            query: {
              main_domain_only: "false",
              start_date: getDefaultStartDate(),
              end_date: getDefaultEndDate(),
            },
          });
          results.globalRank = gr;
        } catch (e: any) {
          errors.push(`GlobalRank: ${e.message}`);
        }

        // 6. DataForSEO: Domain Keywords
        try {
          const kw = await callDataForSEO(
            "/dataforseo_labs/google/ranked_keywords/live",
            [
              {
                target: input.domain,
                location_code: input.locationCode,
                language_code: input.languageCode,
                limit: 20,
              },
            ]
          );
          results.keywords = kw;
        } catch (e: any) {
          errors.push(`Keywords: ${e.message}`);
        }

        // 7. Google PageSpeed
        try {
          const ps = await callPageSpeedAPI(`https://${input.domain}`, "mobile");
          const lhr = ps.lighthouseResult;
          results.pageSpeed = {
            performanceScore: Math.round((lhr?.categories?.performance?.score || 0) * 100),
            metrics: {
              fcp: lhr?.audits?.["first-contentful-paint"]?.displayValue || "N/A",
              lcp: lhr?.audits?.["largest-contentful-paint"]?.displayValue || "N/A",
              tbt: lhr?.audits?.["total-blocking-time"]?.displayValue || "N/A",
              cls: lhr?.audits?.["cumulative-layout-shift"]?.displayValue || "N/A",
              si: lhr?.audits?.["speed-index"]?.displayValue || "N/A",
            },
          };
        } catch (e: any) {
          errors.push(`PageSpeed: ${e.message}`);
        }

        return {
          success: true,
          data: results,
          errors: errors.length > 0 ? errors : undefined,
          updatedAt: new Date().toISOString(),
        };
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
