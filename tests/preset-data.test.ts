import { describe, it, expect } from "vitest";
import {
  PRESET_SITES,
  PRESET_DATA,
  getPresetData,
  getAllPresetSites,
  formatDuration,
  formatLargeNumber,
} from "@/lib/preset-data";

describe("Preset Data", () => {
  it("should have 5 preset sites", () => {
    expect(PRESET_SITES).toHaveLength(5);
  });

  it("should have one own site (hojyokin-portal.jp)", () => {
    const ownSites = PRESET_SITES.filter((s) => s.isOwn);
    expect(ownSites).toHaveLength(1);
    expect(ownSites[0].domain).toBe("hojyokin-portal.jp");
  });

  it("should have preset data for all 5 sites", () => {
    for (const site of PRESET_SITES) {
      const data = getPresetData(site.domain);
      expect(data).not.toBeNull();
      expect(data!.site.domain).toBe(site.domain);
    }
  });

  it("should return null for unknown domains", () => {
    expect(getPresetData("unknown.com")).toBeNull();
  });

  it("should have valid engagement data for hojyokin-portal.jp", () => {
    const data = getPresetData("hojyokin-portal.jp");
    expect(data).not.toBeNull();
    expect(data!.engagement.monthlySessions).toBe(211757);
    expect(data!.engagement.monthlyUniqueVisitors).toBe(154592);
    expect(data!.engagement.avgDuration).toBe("02:13");
    expect(data!.engagement.bounceRate).toBe(0.5211);
    expect(data!.engagement.avgPageViews).toBe(2.86);
  });

  it("should have valid channel data", () => {
    const data = getPresetData("hojyokin-portal.jp");
    expect(data).not.toBeNull();
    expect(data!.channels.total).toBe(2541000);
    expect(data!.channels.organicSearch).toBe(1100000);
    expect(data!.channels.direct).toBe(380000);
  });

  it("should have valid keyword data with 10 entries per site", () => {
    for (const site of PRESET_SITES) {
      const data = getPresetData(site.domain);
      expect(data).not.toBeNull();
      expect(data!.keywords).toHaveLength(10);
      expect(data!.keywords[0].rank).toBe(1);
    }
  });

  it("should have valid access share percentages", () => {
    const data = getPresetData("hojyokin-portal.jp");
    expect(data!.accessShare).toBe(50.65);
    const data2 = getPresetData("hojyokin-concierge.com");
    expect(data2!.accessShare).toBe(44.22);
  });

  it("should return all preset sites from getAllPresetSites", () => {
    const sites = getAllPresetSites();
    expect(sites).toHaveLength(5);
    expect(sites).toEqual(PRESET_SITES);
  });

  it("should format duration correctly", () => {
    expect(formatDuration(133)).toBe("02:13");
    expect(formatDuration(63)).toBe("01:03");
    expect(formatDuration(0)).toBe("00:00");
  });

  it("should format large numbers correctly", () => {
    expect(formatLargeNumber(1500000)).toBe("1.5M");
    expect(formatLargeNumber(211757)).toBe("211.8K");
    expect(formatLargeNumber(500)).toBe("500");
  });
});
