import { describe, it, expect } from "vitest";
import { PRESET_DATA, PRESET_SITES, getPresetData } from "@/lib/preset-data";

describe("Bar Charts - Preset Data for Charts", () => {
  const domains = PRESET_SITES.map((s) => s.domain);

  describe("Search Traffic Data", () => {
    it("all preset sites have searchTraffic data", () => {
      for (const domain of domains) {
        const data = getPresetData(domain);
        expect(data).not.toBeNull();
        expect(data!.searchTraffic).toBeDefined();
        expect(data!.searchTraffic.total).toBeGreaterThan(0);
        expect(data!.searchTraffic.organicPercent).toBeGreaterThanOrEqual(0);
        expect(data!.searchTraffic.paidPercent).toBeGreaterThanOrEqual(0);
      }
    });

    it("organic + paid percentages sum to ~100%", () => {
      for (const domain of domains) {
        const data = getPresetData(domain)!;
        const sum = data.searchTraffic.organicPercent + data.searchTraffic.paidPercent;
        expect(sum).toBeCloseTo(100, 0);
      }
    });
  });

  describe("Channel Data for Stacked Bar Chart", () => {
    it("all preset sites have channel data", () => {
      for (const domain of domains) {
        const data = getPresetData(domain);
        expect(data).not.toBeNull();
        expect(data!.channels).toBeDefined();
        expect(data!.channels.total).toBeGreaterThan(0);
      }
    });

    it("channel breakdown values are non-negative", () => {
      for (const domain of domains) {
        const ch = getPresetData(domain)!.channels;
        expect(ch.direct).toBeGreaterThanOrEqual(0);
        expect(ch.organicSearch).toBeGreaterThanOrEqual(0);
        expect(ch.paidSearch).toBeGreaterThanOrEqual(0);
        expect(ch.referral).toBeGreaterThanOrEqual(0);
        expect(ch.displayAds).toBeGreaterThanOrEqual(0);
        expect(ch.social).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Display Ad Networks Data", () => {
    it("all preset sites have displayAdNetworks array", () => {
      for (const domain of domains) {
        const data = getPresetData(domain);
        expect(data).not.toBeNull();
        expect(Array.isArray(data!.displayAdNetworks)).toBe(true);
        expect(data!.displayAdNetworks.length).toBeGreaterThan(0);
      }
    });

    it("displayAdNetworks have name and share", () => {
      for (const domain of domains) {
        const networks = getPresetData(domain)!.displayAdNetworks;
        for (const n of networks) {
          expect(n.name).toBeTruthy();
          expect(n.share).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("Monthly Sessions Trend Data", () => {
    it("all preset sites have 12 months of session data", () => {
      for (const domain of domains) {
        const data = getPresetData(domain);
        expect(data).not.toBeNull();
        expect(data!.monthlySessionsTrend).toBeDefined();
        expect(data!.monthlySessionsTrend.length).toBe(12);
      }
    });

    it("monthly session values are positive", () => {
      for (const domain of domains) {
        const trend = getPresetData(domain)!.monthlySessionsTrend;
        for (const val of trend) {
          expect(val).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("Social Breakdown Data", () => {
    it("all preset sites have socialBreakdown", () => {
      for (const domain of domains) {
        const data = getPresetData(domain);
        expect(data).not.toBeNull();
        expect(data!.socialBreakdown).toBeDefined();
      }
    });

    it("social breakdown values sum to ~100%", () => {
      for (const domain of domains) {
        const sb = getPresetData(domain)!.socialBreakdown;
        const sum = sb.youtube + sb.facebook + sb.twitter + sb.reddit + sb.instagram + sb.other;
        expect(sum).toBeCloseTo(100, 0);
      }
    });
  });

  describe("Ratio Bar Chart Data Integrity", () => {
    it("hojyokin-portal.jp has highest search traffic", () => {
      const portal = getPresetData("hojyokin-portal.jp")!;
      const others = domains
        .filter((d) => d !== "hojyokin-portal.jp")
        .map((d) => getPresetData(d)!.searchTraffic.total);
      expect(portal.searchTraffic.total).toBeGreaterThanOrEqual(Math.max(...others));
    });

    it("access share values are between 0 and 1", () => {
      for (const domain of domains) {
        const data = getPresetData(domain)!;
        expect(data.accessShare).toBeGreaterThanOrEqual(0);
        expect(data.accessShare).toBeLessThanOrEqual(100);
      }
    });
  });
});
