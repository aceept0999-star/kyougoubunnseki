import { describe, it, expect, vi } from "vitest";

describe("Competitor Discovery", () => {
  describe("API response parsing", () => {
    it("should parse DataForSEO competitors_domain response correctly", () => {
      const mockApiResponse = {
        tasks: [
          {
            result: [
              {
                items: [
                  {
                    domain: "competitor1.com",
                    avg_position: 15.3,
                    intersections: 245,
                    full_domain_metrics: {
                      organic: { etv: 12500, count: 890 },
                      paid: { etv: 500 },
                    },
                  },
                  {
                    domain: "competitor2.com",
                    avg_position: 22.1,
                    intersections: 180,
                    full_domain_metrics: {
                      organic: { etv: 8900, count: 650 },
                      paid: { etv: 200 },
                    },
                  },
                  {
                    domain: "competitor3.com",
                    avg_position: 30.5,
                    intersections: 120,
                    full_domain_metrics: {
                      organic: { etv: 5600, count: 420 },
                      paid: { etv: 0 },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const tasks = mockApiResponse?.tasks || [];
      const items = tasks[0]?.result?.[0]?.items || [];
      const competitors = items.map((item: any) => ({
        domain: item.domain || "",
        avgPosition: item.avg_position || 0,
        intersections: item.intersections || 0,
        organicTraffic: item.full_domain_metrics?.organic?.etv || 0,
        organicKeywords: item.full_domain_metrics?.organic?.count || 0,
        paidTraffic: item.full_domain_metrics?.paid?.etv || 0,
      }));

      expect(competitors).toHaveLength(3);
      expect(competitors[0].domain).toBe("competitor1.com");
      expect(competitors[0].avgPosition).toBe(15.3);
      expect(competitors[0].intersections).toBe(245);
      expect(competitors[0].organicTraffic).toBe(12500);
      expect(competitors[0].organicKeywords).toBe(890);
      expect(competitors[0].paidTraffic).toBe(500);
    });

    it("should handle empty API response gracefully", () => {
      const emptyResponse = { tasks: [{ result: [{ items: [] }] }] };
      const items = emptyResponse?.tasks?.[0]?.result?.[0]?.items || [];
      expect(items).toHaveLength(0);
    });

    it("should handle malformed API response gracefully", () => {
      const malformedResponse = { tasks: [] } as any;
      const tasks = malformedResponse?.tasks || [];
      const items = tasks[0]?.result?.[0]?.items || [];
      expect(items).toHaveLength(0);
    });

    it("should handle null API response gracefully", () => {
      const nullResponse = null as any;
      const tasks = nullResponse?.tasks || [];
      const items = tasks[0]?.result?.[0]?.items || [];
      expect(items).toHaveLength(0);
    });
  });

  describe("Competitor filtering", () => {
    it("should filter out existing domains", () => {
      const discovered = [
        { domain: "new1.com", selected: true },
        { domain: "existing.com", selected: true },
        { domain: "new2.com", selected: true },
      ];
      const existingDomains = new Set(["existing.com", "mysite.com"]);

      const filtered = discovered.filter((c) => !existingDomains.has(c.domain));
      expect(filtered).toHaveLength(2);
      expect(filtered[0].domain).toBe("new1.com");
      expect(filtered[1].domain).toBe("new2.com");
    });

    it("should limit to 5 competitors", () => {
      const discovered = Array.from({ length: 10 }, (_, i) => ({
        domain: `site${i}.com`,
        selected: true,
      }));

      const limited = discovered.slice(0, 5);
      expect(limited).toHaveLength(5);
      expect(limited[4].domain).toBe("site4.com");
    });

    it("should filter out own domain from results", () => {
      const ownDomain = "mysite.com";
      const discovered = [
        { domain: "mysite.com" },
        { domain: "competitor1.com" },
        { domain: "competitor2.com" },
      ];
      const existingDomains = new Set([ownDomain]);
      const filtered = discovered.filter((c) => !existingDomains.has(c.domain));
      expect(filtered).toHaveLength(2);
    });
  });

  describe("Selection toggle", () => {
    it("should toggle competitor selection", () => {
      const competitors = [
        { domain: "a.com", selected: true },
        { domain: "b.com", selected: true },
        { domain: "c.com", selected: true },
      ];

      const toggleIndex = 1;
      const updated = competitors.map((c, i) =>
        i === toggleIndex ? { ...c, selected: !c.selected } : c
      );

      expect(updated[0].selected).toBe(true);
      expect(updated[1].selected).toBe(false);
      expect(updated[2].selected).toBe(true);
    });

    it("should count selected competitors correctly", () => {
      const competitors = [
        { domain: "a.com", selected: true },
        { domain: "b.com", selected: false },
        { domain: "c.com", selected: true },
        { domain: "d.com", selected: false },
        { domain: "e.com", selected: true },
      ];

      const selectedCount = competitors.filter((c) => c.selected).length;
      expect(selectedCount).toBe(3);
    });
  });

  describe("Domain normalization", () => {
    it("should strip protocol from domain", () => {
      const raw = "https://example.com/path";
      const domain = raw.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
      expect(domain).toBe("example.com");
    });

    it("should strip www from domain", () => {
      const raw = "www.example.com";
      const domain = raw.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
      expect(domain).toBe("example.com");
    });

    it("should handle domain without protocol", () => {
      const raw = "example.com";
      const domain = raw.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
      expect(domain).toBe("example.com");
    });

    it("should strip path from URL", () => {
      const raw = "https://www.example.com/page/subpage?q=test";
      const domain = raw.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
      expect(domain).toBe("example.com");
    });
  });
});
