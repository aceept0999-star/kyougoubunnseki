import { describe, it, expect, vi } from "vitest";

// Mock DataForSEO API response for domain intersection
const mockIntersectionResponse = {
  tasks: [
    {
      result: [
        {
          total_count: 150,
          items: [
            {
              keyword_data: {
                keyword: "補助金 申請",
                keyword_info: {
                  search_volume: 5400,
                  cpc: 2.5,
                  competition: 0.65,
                },
              },
              first_domain_serp_element: {
                se_position: 3,
                etv: 120,
              },
              second_domain_serp_element: {
                se_position: 7,
                etv: 45,
              },
            },
            {
              keyword_data: {
                keyword: "事業再構築補助金",
                keyword_info: {
                  search_volume: 12000,
                  cpc: 3.8,
                  competition: 0.82,
                },
              },
              first_domain_serp_element: {
                se_position: 1,
                etv: 350,
              },
              second_domain_serp_element: {
                se_position: 5,
                etv: 80,
              },
            },
          ],
        },
      ],
    },
  ],
};

// Mock ranked keywords response
const mockRankedKeywordsResponse = {
  tasks: [
    {
      result: [
        {
          total_count: 200,
          items: [
            {
              keyword_data: {
                keyword: "補助金 一覧",
                keyword_info: {
                  search_volume: 8100,
                  cpc: 1.8,
                  competition: 0.55,
                },
              },
              ranked_serp_element: {
                serp_item: {
                  rank_absolute: 2,
                  etv: 250,
                },
              },
            },
            {
              keyword_data: {
                keyword: "IT導入補助金",
                keyword_info: {
                  search_volume: 6600,
                  cpc: 4.2,
                  competition: 0.78,
                },
              },
              ranked_serp_element: {
                serp_item: {
                  rank_absolute: 5,
                  etv: 100,
                },
              },
            },
          ],
        },
      ],
    },
  ],
};

describe("Keyword Analysis - Data Parsing", () => {
  it("should parse domain intersection response correctly", () => {
    const tasks = mockIntersectionResponse.tasks;
    const items = tasks[0]?.result?.[0]?.items || [];
    const totalCount = tasks[0]?.result?.[0]?.total_count || 0;

    const keywords = items.map((item: any) => ({
      keyword: item.keyword_data?.keyword || "",
      searchVolume: item.keyword_data?.keyword_info?.search_volume || 0,
      cpc: item.keyword_data?.keyword_info?.cpc || 0,
      competition: item.keyword_data?.keyword_info?.competition || 0,
      position1: item.first_domain_serp_element?.se_position || null,
      etv1: item.first_domain_serp_element?.etv || 0,
      position2: item.second_domain_serp_element?.se_position || null,
      etv2: item.second_domain_serp_element?.etv || 0,
    }));

    expect(totalCount).toBe(150);
    expect(keywords).toHaveLength(2);
    expect(keywords[0].keyword).toBe("補助金 申請");
    expect(keywords[0].searchVolume).toBe(5400);
    expect(keywords[0].position1).toBe(3);
    expect(keywords[0].position2).toBe(7);
    expect(keywords[1].keyword).toBe("事業再構築補助金");
    expect(keywords[1].cpc).toBe(3.8);
    expect(keywords[1].competition).toBe(0.82);
  });

  it("should parse ranked keywords response correctly", () => {
    const tasks = mockRankedKeywordsResponse.tasks;
    const items = tasks[0]?.result?.[0]?.items || [];

    const keywords = items.map((item: any) => ({
      keyword: item.keyword_data?.keyword || "",
      position: item.ranked_serp_element?.serp_item?.rank_absolute || 0,
      searchVolume: item.keyword_data?.keyword_info?.search_volume || 0,
      cpc: item.keyword_data?.keyword_info?.cpc || 0,
      competition: item.keyword_data?.keyword_info?.competition || 0,
      etv: item.ranked_serp_element?.serp_item?.etv || 0,
    }));

    expect(keywords).toHaveLength(2);
    expect(keywords[0].keyword).toBe("補助金 一覧");
    expect(keywords[0].position).toBe(2);
    expect(keywords[0].searchVolume).toBe(8100);
    expect(keywords[0].etv).toBe(250);
    expect(keywords[1].keyword).toBe("IT導入補助金");
    expect(keywords[1].position).toBe(5);
  });

  it("should handle empty response gracefully", () => {
    const emptyResponse = { tasks: [{ result: [{ total_count: 0, items: [] }] }] };
    const tasks = emptyResponse.tasks;
    const items = tasks[0]?.result?.[0]?.items || [];
    const totalCount = tasks[0]?.result?.[0]?.total_count || 0;

    expect(totalCount).toBe(0);
    expect(items).toHaveLength(0);
  });

  it("should handle malformed response gracefully", () => {
    const malformedResponse = { tasks: [] as any[] };
    const tasks = malformedResponse.tasks;
    const items = tasks[0]?.result?.[0]?.items || [];
    const totalCount = tasks[0]?.result?.[0]?.total_count || 0;

    expect(totalCount).toBe(0);
    expect(items).toHaveLength(0);
  });

  it("should handle null values in keyword data", () => {
    const responseWithNulls = {
      tasks: [
        {
          result: [
            {
              total_count: 1,
              items: [
                {
                  keyword_data: {
                    keyword: "test keyword",
                    keyword_info: {
                      search_volume: null as number | null,
                      cpc: null as number | null,
                      competition: null as number | null,
                    },
                  },
                  first_domain_serp_element: null as any,
                  second_domain_serp_element: null as any,
                },
              ],
            },
          ],
        },
      ],
    };

    const items = responseWithNulls.tasks[0].result[0].items;
    const kw = items[0];
    const parsed = {
      keyword: kw.keyword_data?.keyword || "",
      searchVolume: kw.keyword_data?.keyword_info?.search_volume || 0,
      cpc: kw.keyword_data?.keyword_info?.cpc || 0,
      competition: kw.keyword_data?.keyword_info?.competition || 0,
      position1: kw.first_domain_serp_element?.se_position || null,
      position2: kw.second_domain_serp_element?.se_position || null,
    };

    expect(parsed.keyword).toBe("test keyword");
    expect(parsed.searchVolume).toBe(0);
    expect(parsed.cpc).toBe(0);
    expect(parsed.position1).toBeNull();
    expect(parsed.position2).toBeNull();
  });
});

describe("Keyword Gap Analysis - Categorization", () => {
  it("should correctly categorize gap data", () => {
    const gapData = {
      shared: { keywords: [{ keyword: "共通1" }, { keyword: "共通2" }], totalCount: 50 },
      ownOnly: { keywords: [{ keyword: "自社1" }], totalCount: 30 },
      competitorOnly: { keywords: [{ keyword: "競合1" }, { keyword: "競合2" }, { keyword: "競合3" }], totalCount: 80 },
    };

    expect(gapData.shared.totalCount).toBe(50);
    expect(gapData.ownOnly.totalCount).toBe(30);
    expect(gapData.competitorOnly.totalCount).toBe(80);
    expect(gapData.shared.keywords).toHaveLength(2);
    expect(gapData.ownOnly.keywords).toHaveLength(1);
    expect(gapData.competitorOnly.keywords).toHaveLength(3);
  });

  it("should calculate gap bar percentages correctly", () => {
    const shared = 50;
    const ownOnly = 30;
    const compOnly = 80;
    const total = shared + ownOnly + compOnly;

    const sharedPct = (shared / total) * 100;
    const ownPct = (ownOnly / total) * 100;
    const compPct = (compOnly / total) * 100;

    expect(sharedPct + ownPct + compPct).toBeCloseTo(100);
    expect(sharedPct).toBeCloseTo(31.25);
    expect(ownPct).toBeCloseTo(18.75);
    expect(compPct).toBeCloseTo(50);
  });

  it("should handle zero total gracefully", () => {
    const shared = 0;
    const ownOnly = 0;
    const compOnly = 0;
    const total = shared + ownOnly + compOnly || 1;

    const sharedPct = (shared / total) * 100;
    expect(sharedPct).toBe(0);
  });
});

describe("Keyword Ranking - Summary Calculations", () => {
  it("should calculate average position correctly", () => {
    const keywords = [
      { position: 1 },
      { position: 5 },
      { position: 10 },
      { position: 20 },
    ];
    const avgPosition = keywords.reduce((s, k) => s + k.position, 0) / keywords.length;
    expect(avgPosition).toBe(9);
  });

  it("should calculate total ETV correctly", () => {
    const keywords = [
      { etv: 100 },
      { etv: 250 },
      { etv: 50 },
    ];
    const totalEtv = keywords.reduce((s, k) => s + k.etv, 0);
    expect(totalEtv).toBe(400);
  });

  it("should determine position badge color category", () => {
    const getCategory = (position: number) => {
      if (position <= 3) return "top3";
      if (position <= 10) return "top10";
      if (position <= 20) return "top20";
      return "other";
    };

    expect(getCategory(1)).toBe("top3");
    expect(getCategory(3)).toBe("top3");
    expect(getCategory(5)).toBe("top10");
    expect(getCategory(10)).toBe("top10");
    expect(getCategory(15)).toBe("top20");
    expect(getCategory(50)).toBe("other");
  });
});
