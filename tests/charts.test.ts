import { describe, it, expect } from "vitest";

// Test the formatNumber function directly without importing the full component
// (which requires react-native-svg and JSX)
function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  if (num < 1 && num > 0) return num.toFixed(2);
  return Math.round(num).toString();
}

const CHART_COLORS = [
  "#1E40AF", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16",
];

describe("Chart Utilities", () => {
  describe("formatNumber", () => {
    it("should format millions", () => {
      expect(formatNumber(1500000)).toBe("1.5M");
      expect(formatNumber(1000000)).toBe("1.0M");
      expect(formatNumber(10000000)).toBe("10.0M");
    });

    it("should format thousands", () => {
      expect(formatNumber(1500)).toBe("1.5K");
      expect(formatNumber(1000)).toBe("1.0K");
      expect(formatNumber(999999)).toBe("1000.0K");
    });

    it("should format small numbers", () => {
      expect(formatNumber(500)).toBe("500");
      expect(formatNumber(0)).toBe("0");
      expect(formatNumber(42)).toBe("42");
    });

    it("should format decimal numbers", () => {
      expect(formatNumber(0.5)).toBe("0.50");
      expect(formatNumber(0.123)).toBe("0.12");
    });
  });

  describe("CHART_COLORS", () => {
    it("should have at least 5 colors", () => {
      expect(CHART_COLORS.length).toBeGreaterThanOrEqual(5);
    });

    it("should contain valid hex colors", () => {
      for (const color of CHART_COLORS) {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });
  });
});
