import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    }),
    getAllKeys: vi.fn(() => Promise.resolve(Object.keys(mockStorage))),
    multiGet: vi.fn((keys: string[]) =>
      Promise.resolve(keys.map((k) => [k, mockStorage[k] || null]))
    ),
  },
}));

import {
  getLiveData,
  saveLiveData,
  removeLiveData,
  getAllLiveData,
  parseApiResponse,
  type LiveSiteData,
} from "@/lib/live-data-store";

describe("Live Data Store", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  it("should save and retrieve live data", async () => {
    const data: LiveSiteData = {
      domain: "example.com",
      updatedAt: "2025-03-01T00:00:00Z",
      engagement: {
        monthlySessions: 100000,
        monthlyUniqueVisitors: 80000,
        avgDurationSeconds: 120,
        avgDuration: "02:00",
        avgPageViews: 3.5,
        bounceRate: 0.45,
        totalPageViews: 350000,
      },
      channels: {
        total: 100000,
        direct: 30000,
        organicSearch: 40000,
        paidSearch: 10000,
        referral: 5000,
        displayAds: 5000,
        social: 8000,
        email: 2000,
      },
      keywords: [
        { keyword: "test", position: 1, searchVolume: 5000, cpc: 1.5, traffic: 2000 },
      ],
      pageSpeed: null,
      globalRank: 50000,
    };

    await saveLiveData(data);
    const retrieved = await getLiveData("example.com");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.domain).toBe("example.com");
    expect(retrieved!.engagement!.monthlySessions).toBe(100000);
    expect(retrieved!.channels!.organicSearch).toBe(40000);
    expect(retrieved!.keywords.length).toBe(1);
  });

  it("should return null for non-existent domain", async () => {
    const result = await getLiveData("nonexistent.com");
    expect(result).toBeNull();
  });

  it("should remove live data", async () => {
    const data: LiveSiteData = {
      domain: "remove-test.com",
      updatedAt: "2025-03-01T00:00:00Z",
      engagement: null,
      channels: null,
      keywords: [],
      pageSpeed: null,
      globalRank: null,
    };

    await saveLiveData(data);
    let retrieved = await getLiveData("remove-test.com");
    expect(retrieved).not.toBeNull();

    await removeLiveData("remove-test.com");
    retrieved = await getLiveData("remove-test.com");
    expect(retrieved).toBeNull();
  });

  it("should get all live data", async () => {
    const data1: LiveSiteData = {
      domain: "site1.com",
      updatedAt: "2025-03-01T00:00:00Z",
      engagement: null,
      channels: null,
      keywords: [],
      pageSpeed: null,
      globalRank: null,
    };
    const data2: LiveSiteData = {
      domain: "site2.com",
      updatedAt: "2025-03-01T00:00:00Z",
      engagement: null,
      channels: null,
      keywords: [],
      pageSpeed: null,
      globalRank: null,
    };

    await saveLiveData(data1);
    await saveLiveData(data2);

    const all = await getAllLiveData();
    expect(Object.keys(all).length).toBe(2);
    expect(all["site1.com"]).toBeDefined();
    expect(all["site2.com"]).toBeDefined();
  });
});

describe("parseApiResponse", () => {
  it("should parse empty API response gracefully", () => {
    const result = parseApiResponse("test.com", {}, "2025-03-01T00:00:00Z");
    expect(result.domain).toBe("test.com");
    expect(result.engagement).toBeNull();
    expect(result.channels).toBeNull();
    expect(result.keywords).toEqual([]);
    expect(result.pageSpeed).toBeNull();
  });

  it("should parse traffic sources into channels", () => {
    const apiData = {
      trafficSources: {
        visits: {
          direct: 5000,
          search_organic: 8000,
          search_paid: 2000,
          referral: 1000,
          display_ad: 500,
          social: 3000,
          mail: 200,
        },
      },
    };

    const result = parseApiResponse("test.com", apiData, "2025-03-01T00:00:00Z");
    expect(result.channels).not.toBeNull();
    expect(result.channels!.direct).toBe(5000);
    expect(result.channels!.organicSearch).toBe(8000);
    expect(result.channels!.paidSearch).toBe(2000);
    expect(result.channels!.social).toBe(3000);
  });

  it("should parse keywords from DataForSEO format", () => {
    const apiData = {
      keywords: {
        tasks: [
          {
            result: [
              {
                items: [
                  {
                    keyword_data: {
                      keyword: "補助金",
                      keyword_info: { search_volume: 10000, cpc: 2.5 },
                    },
                    ranked_serp_element: {
                      serp_item: { rank_absolute: 3, etv: 500 },
                    },
                  },
                  {
                    keyword_data: {
                      keyword: "助成金",
                      keyword_info: { search_volume: 8000, cpc: 1.8 },
                    },
                    ranked_serp_element: {
                      serp_item: { rank_absolute: 5, etv: 300 },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const result = parseApiResponse("test.com", apiData, "2025-03-01T00:00:00Z");
    expect(result.keywords.length).toBe(2);
    expect(result.keywords[0].keyword).toBe("補助金");
    expect(result.keywords[0].position).toBe(3);
    expect(result.keywords[0].searchVolume).toBe(10000);
    expect(result.keywords[0].cpc).toBe(2.5);
    expect(result.keywords[0].traffic).toBe(500);
    expect(result.keywords[1].keyword).toBe("助成金");
  });

  it("should parse PageSpeed data", () => {
    const apiData = {
      pageSpeed: {
        performanceScore: 85,
        metrics: { fcp: "1.2s", lcp: "2.5s", tbt: "150ms", cls: "0.1", si: "3.0s" },
      },
    };

    const result = parseApiResponse("test.com", apiData, "2025-03-01T00:00:00Z");
    expect(result.pageSpeed).not.toBeNull();
    expect(result.pageSpeed!.performanceScore).toBe(85);
    expect(result.pageSpeed!.metrics.fcp).toBe("1.2s");
  });

  it("should preserve errors from API response", () => {
    const apiData = {
      errors: ["SimilarWeb API failed", "DataForSEO timeout"],
    };

    const result = parseApiResponse("test.com", apiData, "2025-03-01T00:00:00Z");
    expect(result.errors).toEqual(["SimilarWeb API failed", "DataForSEO timeout"]);
  });

  it("should estimate sessions from DataForSEO ETV when SimilarWeb data is unavailable", () => {
    const apiData = {
      // SimilarWebデータなし（totalVisits、bounceRate、uniqueVisitorsなし）
      keywords: {
        tasks: [
          {
            result: [
              {
                items: [
                  {
                    keyword_data: {
                      keyword: "補助金",
                      keyword_info: { search_volume: 10000, cpc: 2.5 },
                    },
                    ranked_serp_element: {
                      serp_item: { rank_absolute: 3, etv: 500 },
                    },
                  },
                  {
                    keyword_data: {
                      keyword: "助成金",
                      keyword_info: { search_volume: 8000, cpc: 1.8 },
                    },
                    ranked_serp_element: {
                      serp_item: { rank_absolute: 5, etv: 300 },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const result = parseApiResponse("test.com", apiData, "2025-03-01T00:00:00Z");
    // SimilarWebデータなしなのでengagementはnull
    expect(result.engagement).toBeNull();
    // ETV合計 = 500 + 300 = 800, 推定セッション = 800 * 4.5 = 3600
    expect(result.estimatedSessions).toBe(3600);
    expect(result.estimatedUniqueVisitors).toBe(Math.round(3600 * 0.78));
    expect(result.isEstimated).toBe(true);
  });

  it("should not estimate sessions when ETV is zero", () => {
    const apiData = {
      keywords: {
        tasks: [
          {
            result: [
              {
                items: [
                  {
                    keyword_data: {
                      keyword: "テスト",
                      keyword_info: { search_volume: 100, cpc: 0 },
                    },
                    ranked_serp_element: {
                      serp_item: { rank_absolute: 50, etv: 0 },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const result = parseApiResponse("test.com", apiData, "2025-03-01T00:00:00Z");
    expect(result.estimatedSessions).toBeUndefined();
    expect(result.isEstimated).toBeUndefined();
  });
});
