import { describe, it, expect } from "vitest";
import { filterKeywords, sortKeywords } from "../lib/keyword-filters";

const mockKeywords = [
  { keyword: "補助金 申請", position: 1, position1: 1, searchVolume: 5000, cpc: 2.5, competition: 0.8, etv: 300 },
  { keyword: "助成金 種類", position: 5, position1: 5, searchVolume: 3000, cpc: 1.8, competition: 0.6, etv: 200 },
  { keyword: "事業再構築補助金", position: 12, position1: 12, searchVolume: 800, cpc: 3.2, competition: 0.9, etv: 100 },
  { keyword: "小規模事業者持続化補助金", position: 25, position1: 25, searchVolume: 500, cpc: 1.0, competition: 0.4, etv: 50 },
  { keyword: "IT導入補助金 2024", position: 3, position1: 3, searchVolume: 2000, cpc: 4.0, competition: 0.7, etv: 150 },
  { keyword: "ものづくり補助金", position: 8, position1: 8, searchVolume: 1500, cpc: 2.0, competition: 0.5, etv: 120 },
  { keyword: "補助金 コンサル", position: 15, position1: 15, searchVolume: 60, cpc: 5.0, competition: 0.95, etv: 10 },
  { keyword: "創業補助金", position: 18, position1: 18, searchVolume: 90, cpc: 1.5, competition: 0.3, etv: 20 },
];

describe("filterKeywords", () => {
  it("should return all keywords when no filters are applied", () => {
    const result = filterKeywords(mockKeywords, "", "all", "all");
    expect(result).toHaveLength(8);
  });

  it("should filter by search query (case insensitive)", () => {
    const result = filterKeywords(mockKeywords, "補助金", "all", "all");
    expect(result.length).toBeGreaterThanOrEqual(4);
    result.forEach((kw: any) => {
      expect(kw.keyword.toLowerCase()).toContain("補助金");
    });
  });

  it("should filter by search query with partial match", () => {
    const result = filterKeywords(mockKeywords, "IT導入", "all", "all");
    expect(result).toHaveLength(1);
    expect(result[0].keyword).toBe("IT導入補助金 2024");
  });

  it("should return empty array when search query matches nothing", () => {
    const result = filterKeywords(mockKeywords, "存在しないキーワード", "all", "all");
    expect(result).toHaveLength(0);
  });

  it("should filter by position: top3", () => {
    const result = filterKeywords(mockKeywords, "", "top3", "all");
    result.forEach((kw: any) => {
      expect(kw.position).toBeLessThanOrEqual(3);
    });
    expect(result).toHaveLength(2); // position 1 and 3
  });

  it("should filter by position: top10", () => {
    const result = filterKeywords(mockKeywords, "", "top10", "all");
    result.forEach((kw: any) => {
      expect(kw.position).toBeLessThanOrEqual(10);
    });
    expect(result).toHaveLength(4); // position 1, 3, 5, 8
  });

  it("should filter by position: top20", () => {
    const result = filterKeywords(mockKeywords, "", "top20", "all");
    result.forEach((kw: any) => {
      expect(kw.position).toBeLessThanOrEqual(20);
    });
    expect(result).toHaveLength(7); // all except position 25
  });

  it("should filter by volume: high (1000+)", () => {
    const result = filterKeywords(mockKeywords, "", "all", "high");
    result.forEach((kw: any) => {
      expect(kw.searchVolume).toBeGreaterThanOrEqual(1000);
    });
    expect(result).toHaveLength(4); // 5000, 3000, 2000, 1500
  });

  it("should filter by volume: medium (100-999)", () => {
    const result = filterKeywords(mockKeywords, "", "all", "medium");
    result.forEach((kw: any) => {
      expect(kw.searchVolume).toBeGreaterThanOrEqual(100);
      expect(kw.searchVolume).toBeLessThan(1000);
    });
    expect(result).toHaveLength(2); // 800, 500
  });

  it("should filter by volume: low (<100)", () => {
    const result = filterKeywords(mockKeywords, "", "all", "low");
    result.forEach((kw: any) => {
      expect(kw.searchVolume).toBeLessThan(100);
    });
    expect(result).toHaveLength(2); // 60, 90
  });

  it("should combine search + position filter", () => {
    const result = filterKeywords(mockKeywords, "補助金", "top10", "all");
    result.forEach((kw: any) => {
      expect(kw.keyword).toContain("補助金");
      expect(kw.position).toBeLessThanOrEqual(10);
    });
  });

  it("should combine search + volume filter", () => {
    const result = filterKeywords(mockKeywords, "補助金", "all", "high");
    result.forEach((kw: any) => {
      expect(kw.keyword).toContain("補助金");
      expect(kw.searchVolume).toBeGreaterThanOrEqual(1000);
    });
  });

  it("should combine all three filters", () => {
    const result = filterKeywords(mockKeywords, "補助金", "top10", "high");
    result.forEach((kw: any) => {
      expect(kw.keyword).toContain("補助金");
      expect(kw.position).toBeLessThanOrEqual(10);
      expect(kw.searchVolume).toBeGreaterThanOrEqual(1000);
    });
  });

  it("should use position1 key for gap keywords", () => {
    const gapKeywords = [
      { keyword: "test1", position1: 2, searchVolume: 500 },
      { keyword: "test2", position1: 15, searchVolume: 300 },
    ];
    const result = filterKeywords(gapKeywords, "", "top10", "all", "position1");
    expect(result).toHaveLength(1);
    expect(result[0].keyword).toBe("test1");
  });

  it("should handle empty keyword array", () => {
    const result = filterKeywords([], "test", "top3", "high");
    expect(result).toHaveLength(0);
  });

  it("should trim search query whitespace", () => {
    const result = filterKeywords(mockKeywords, "  IT導入  ", "all", "all");
    expect(result).toHaveLength(1);
  });
});

describe("sortKeywords", () => {
  it("should sort by position ascending", () => {
    const result = sortKeywords(mockKeywords, "position", "asc");
    for (let i = 1; i < result.length; i++) {
      expect(result[i].position).toBeGreaterThanOrEqual(result[i - 1].position);
    }
  });

  it("should sort by position descending", () => {
    const result = sortKeywords(mockKeywords, "position", "desc");
    for (let i = 1; i < result.length; i++) {
      expect(result[i].position).toBeLessThanOrEqual(result[i - 1].position);
    }
  });

  it("should sort by searchVolume ascending", () => {
    const result = sortKeywords(mockKeywords, "searchVolume", "asc");
    for (let i = 1; i < result.length; i++) {
      expect(result[i].searchVolume).toBeGreaterThanOrEqual(result[i - 1].searchVolume);
    }
  });

  it("should sort by searchVolume descending", () => {
    const result = sortKeywords(mockKeywords, "searchVolume", "desc");
    for (let i = 1; i < result.length; i++) {
      expect(result[i].searchVolume).toBeLessThanOrEqual(result[i - 1].searchVolume);
    }
  });

  it("should sort by cpc ascending", () => {
    const result = sortKeywords(mockKeywords, "cpc", "asc");
    for (let i = 1; i < result.length; i++) {
      expect(result[i].cpc).toBeGreaterThanOrEqual(result[i - 1].cpc);
    }
  });

  it("should sort by cpc descending", () => {
    const result = sortKeywords(mockKeywords, "cpc", "desc");
    for (let i = 1; i < result.length; i++) {
      expect(result[i].cpc).toBeLessThanOrEqual(result[i - 1].cpc);
    }
  });

  it("should sort by competition ascending", () => {
    const result = sortKeywords(mockKeywords, "competition", "asc");
    for (let i = 1; i < result.length; i++) {
      expect(result[i].competition).toBeGreaterThanOrEqual(result[i - 1].competition);
    }
  });

  it("should sort by competition descending", () => {
    const result = sortKeywords(mockKeywords, "competition", "desc");
    for (let i = 1; i < result.length; i++) {
      expect(result[i].competition).toBeLessThanOrEqual(result[i - 1].competition);
    }
  });

  it("should not mutate original array", () => {
    const original = [...mockKeywords];
    sortKeywords(mockKeywords, "searchVolume", "desc");
    expect(mockKeywords).toEqual(original);
  });

  it("should handle empty array", () => {
    const result = sortKeywords([], "position", "asc");
    expect(result).toHaveLength(0);
  });

  it("should use position1 key for gap keywords", () => {
    const gapKeywords = [
      { keyword: "a", position1: 10, searchVolume: 100, cpc: 1, competition: 0.5 },
      { keyword: "b", position1: 2, searchVolume: 200, cpc: 2, competition: 0.3 },
      { keyword: "c", position1: 5, searchVolume: 150, cpc: 1.5, competition: 0.7 },
    ];
    const result = sortKeywords(gapKeywords, "position", "asc", "position1");
    expect(result[0].keyword).toBe("b");
    expect(result[1].keyword).toBe("c");
    expect(result[2].keyword).toBe("a");
  });
});
