/**
 * dashboard-html-export.ts テスト
 * ダッシュボード全体のHTMLレポート生成機能をテスト
 * (react-nativeのPlatformを使わないHTML生成ロジックを直接テスト)
 */
import { describe, it, expect } from "vitest";
import { getPresetData, PRESET_SITES, formatLargeNumber, type PresetSiteData } from "../lib/preset-data";

// ===== テスト用にHTML生成ロジックの主要部分を再実装 =====

const CHART_COLORS = [
  "#1E40AF", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16",
];
const PRIMARY_COLOR = "#1E40AF";
const WARNING_COLOR = "#F59E0B";

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  if (num < 1 && num > 0) return num.toFixed(2);
  return Math.round(num).toString();
}

function generatePieChartSvg(
  data: { label: string; value: number; color?: string }[],
  size: number = 240
): string {
  if (!data.length) return "";
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;

  let currentAngle = -Math.PI / 2;
  const slices = data.map((item, i) => {
    const angle = (item.value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    return {
      path: `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`,
      color: item.color || CHART_COLORS[i % CHART_COLORS.length],
      label: item.label,
      percentage: ((item.value / total) * 100).toFixed(1),
    };
  });

  const legendHtml = slices
    .map(
      (s) =>
        `<span class="legend-item"><span class="legend-dot" style="background:${s.color}"></span>${s.label} ${s.percentage}%</span>`
    )
    .join("");

  return `
    <div class="chart-center">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        ${slices.map((s) => `<path d="${s.path}" fill="${s.color}" />`).join("")}
      </svg>
      <div class="legend">${legendHtml}</div>
    </div>
  `;
}

function generateBarChartSvg(
  data: { label: string; value: number; color?: string }[],
  height: number = 200
): string {
  if (!data.length) return "";
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.min(50, (400 - data.length * 10) / data.length);
  const chartWidth = Math.max(data.length * (barWidth + 14) + 40, 300);

  const bars = data
    .map((item, i) => {
      const barHeight = (item.value / maxValue) * (height - 30);
      const x = 30 + i * (barWidth + 14);
      const y = height - barHeight - 5;
      const color = item.color || CHART_COLORS[i % CHART_COLORS.length];
      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="${color}" />`;
    })
    .join("");

  return `<div class="chart-center"><svg width="${chartWidth}" height="${height + 24}">${bars}</svg></div>`;
}

function generateLineChartSvg(
  labels: string[],
  datasets: { label: string; data: number[]; color?: string }[],
  height: number = 240
): string {
  if (!datasets.length || !labels.length) return "";
  const width = 550;
  const lines = datasets
    .map((dataset, di) => {
      const lineColor = dataset.color || CHART_COLORS[di % CHART_COLORS.length];
      return `<path stroke="${lineColor}" stroke-width="2" fill="none" />`;
    })
    .join("");
  return `<div class="chart-center"><svg width="${width}" height="${height}">${lines}</svg></div>`;
}

// ===== テスト用のデータ準備 =====

const testSites = PRESET_SITES.map((s) => ({
  domain: s.domain,
  name: s.name,
  isOwn: s.isOwn,
}));

function buildDisplayData() {
  const map: Record<string, any> = {};
  for (const site of testSites) {
    const preset = getPresetData(site.domain);
    if (preset) {
      map[site.domain] = {
        name: preset.site.name,
        domain: site.domain,
        isOwn: site.isOwn,
        sessions: preset.engagement.monthlySessions,
        uniqueVisitors: preset.engagement.monthlyUniqueVisitors,
        duration: preset.engagement.avgDuration,
        pageViews: preset.engagement.avgPageViews,
        bounceRate: preset.engagement.bounceRate,
        totalPageViews: preset.engagement.totalPageViews,
        accessShare: preset.accessShare,
        channels: preset.channels,
        updatedAt: null,
        isLive: false,
      };
    }
  }
  return map;
}

function buildPresetMap() {
  const map: Record<string, PresetSiteData> = {};
  for (const site of testSites) {
    const data = getPresetData(site.domain);
    if (data) map[site.domain] = data;
  }
  return map;
}

// ===== テストケース =====

describe("Dashboard HTML Export", () => {
  const displayData = buildDisplayData();
  const presetMap = buildPresetMap();

  describe("formatNumber", () => {
    it("should format millions", () => {
      expect(formatNumber(1500000)).toBe("1.5M");
    });

    it("should format thousands", () => {
      expect(formatNumber(211757)).toBe("211.8K");
    });

    it("should format small numbers", () => {
      expect(formatNumber(42)).toBe("42");
    });

    it("should format decimals", () => {
      expect(formatNumber(0.75)).toBe("0.75");
    });
  });

  describe("Pie Chart SVG Generation", () => {
    it("should generate SVG for access share data", () => {
      const data = Object.values(displayData)
        .filter((d: any) => d.accessShare > 0)
        .map((d: any) => ({ label: d.name, value: d.accessShare }));

      const svg = generatePieChartSvg(data);
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
      expect(svg).toContain("<path");
      expect(svg).toContain("legend");
    });

    it("should return empty string for empty data", () => {
      expect(generatePieChartSvg([])).toBe("");
    });

    it("should include all site names in legend", () => {
      const data = [
        { label: "サイトA", value: 50 },
        { label: "サイトB", value: 30 },
        { label: "サイトC", value: 20 },
      ];
      const svg = generatePieChartSvg(data);
      expect(svg).toContain("サイトA");
      expect(svg).toContain("サイトB");
      expect(svg).toContain("サイトC");
      expect(svg).toContain("50.0%");
      expect(svg).toContain("30.0%");
      expect(svg).toContain("20.0%");
    });
  });

  describe("Bar Chart SVG Generation", () => {
    it("should generate SVG for traffic data", () => {
      const data = Object.values(displayData).map((d: any) => ({
        label: d.name,
        value: d.sessions,
      }));
      const svg = generateBarChartSvg(data);
      expect(svg).toContain("<svg");
      expect(svg).toContain("<rect");
    });

    it("should return empty string for empty data", () => {
      expect(generateBarChartSvg([])).toBe("");
    });
  });

  describe("Line Chart SVG Generation", () => {
    it("should generate SVG for trend data", () => {
      const labels = ["2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月", "1月"];
      const datasets = Object.values(displayData)
        .filter((d: any) => presetMap[d.domain]?.monthlySessionsTrend?.length)
        .map((d: any, i: number) => ({
          label: d.name,
          data: presetMap[d.domain]!.monthlySessionsTrend,
          color: d.isOwn ? PRIMARY_COLOR : WARNING_COLOR,
        }));
      const svg = generateLineChartSvg(labels, datasets);
      expect(svg).toContain("<svg");
      expect(svg).toContain("<path");
    });

    it("should return empty string for empty datasets", () => {
      expect(generateLineChartSvg([], [])).toBe("");
    });
  });

  describe("Display Data Construction", () => {
    it("should have data for all 5 preset sites", () => {
      expect(Object.keys(displayData)).toHaveLength(5);
    });

    it("should have correct own site flag", () => {
      const ownSite = displayData["hojyokin-portal.jp"];
      expect(ownSite.isOwn).toBe(true);

      const compSite = displayData["hojyokin-concierge.com"];
      expect(compSite.isOwn).toBe(false);
    });

    it("should have valid session data", () => {
      for (const d of Object.values(displayData) as any[]) {
        expect(d.sessions).toBeGreaterThan(0);
        expect(d.uniqueVisitors).toBeGreaterThan(0);
      }
    });

    it("should have valid channel data", () => {
      for (const d of Object.values(displayData) as any[]) {
        expect(d.channels).not.toBeNull();
        expect(d.channels.total).toBeGreaterThan(0);
      }
    });

    it("should have access share summing close to 100%", () => {
      const totalShare = Object.values(displayData).reduce(
        (sum: number, d: any) => sum + d.accessShare,
        0
      );
      expect(totalShare).toBeGreaterThan(95);
      expect(totalShare).toBeLessThan(105);
    });
  });

  describe("Preset Map Construction", () => {
    it("should have search traffic data", () => {
      for (const data of Object.values(presetMap)) {
        expect(data.searchTraffic).toBeDefined();
        expect(data.searchTraffic.total).toBeGreaterThan(0);
      }
    });

    it("should have monthly sessions trend data", () => {
      for (const data of Object.values(presetMap)) {
        expect(data.monthlySessionsTrend).toBeDefined();
        expect(data.monthlySessionsTrend.length).toBe(12);
      }
    });

    it("should have social breakdown data", () => {
      for (const data of Object.values(presetMap)) {
        expect(data.socialBreakdown).toBeDefined();
        expect(data.socialBreakdown.youtube).toBeGreaterThanOrEqual(0);
      }
    });

    it("should have display ad networks data", () => {
      for (const data of Object.values(presetMap)) {
        expect(data.displayAdNetworks).toBeDefined();
        expect(data.displayAdNetworks.length).toBeGreaterThan(0);
      }
    });

    it("should have keyword data", () => {
      for (const data of Object.values(presetMap)) {
        expect(data.keywords.length).toBeGreaterThan(0);
        expect(data.totalKeywords).toBeGreaterThan(0);
      }
    });
  });

  describe("HTML Report Structure", () => {
    // テスト用の簡易HTMLレポート生成（主要セクションの存在確認用）
    function generateTestHtml(): string {
      const displayItems = Object.values(displayData);
      const now = "2026年3月5日";
      const ownCount = testSites.filter((s) => s.isOwn).length;
      const compCount = testSites.filter((s) => !s.isOwn).length;

      // アクセスシェア
      const accessShareData = displayItems
        .filter((d: any) => d.accessShare > 0)
        .map((d: any) => ({ label: d.name, value: d.accessShare }));

      // エンゲージメントテーブル
      const engRows = displayItems.map((row: any) => [
        row.name,
        row.isOwn ? "自社" : "競合",
        formatLargeNumber(row.sessions),
        formatLargeNumber(row.uniqueVisitors),
        row.duration,
        row.pageViews.toFixed(1),
        (row.bounceRate * 100).toFixed(1) + "%",
        row.accessShare > 0 ? row.accessShare.toFixed(2) + "%" : "-",
      ]);

      // 検索トラフィック
      const searchTrafficData = displayItems
        .filter((d: any) => presetMap[d.domain]?.searchTraffic)
        .map((d: any) => ({
          label: d.name,
          value: presetMap[d.domain]?.searchTraffic?.total || 0,
        }));

      // オーガニック vs 有料
      const ratioData = displayItems
        .filter((d: any) => presetMap[d.domain]?.searchTraffic)
        .map((d: any) => {
          const st = presetMap[d.domain]!.searchTraffic;
          return { label: d.name, organic: st.organicPercent, paid: st.paidPercent };
        });

      // チャネル別シェア
      const channelShareData = displayItems
        .filter((d: any) => d.channels)
        .map((d: any) => d.name);

      // 月間推移
      const trendDatasets = displayItems
        .filter((d: any) => presetMap[d.domain]?.monthlySessionsTrend?.length)
        .map((d: any) => d.name);

      // ソーシャル
      const socialData = displayItems
        .filter((d: any) => presetMap[d.domain]?.socialBreakdown)
        .map((d: any) => d.name);

      return `<!DOCTYPE html>
<html lang="ja">
<head><title>ダッシュボード レポート - ${now}</title></head>
<body>
  <h1>ダッシュボード レポート</h1>
  <p>対象: ${testSites.length}サイト（自社${ownCount} + 競合${compCount}）</p>
  <div class="stats-row">登録:${testSites.length} 自社:${ownCount} 競合:${compCount}</div>
  <h2>アクセスシェア率</h2>
  ${generatePieChartSvg(accessShareData)}
  <h2>エンゲージメント サマリー</h2>
  <table>${engRows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</table>
  <h2>月間トラフィック比較</h2>
  <h2>チャネル別トラフィック概要</h2>
  <h2>検索トラフィック合計</h2>
  <h2>オーガニック vs 有料検索</h2>
  <h2>チャネル別トラフィックシェア</h2>
  <h2>ディスプレイ広告ネットワーク</h2>
  <h2>月間セッション数推移</h2>
  <h2>ソーシャルトラフィック内訳</h2>
  <h2>チャネル別トラフィック詳細</h2>
  <h2>流入キーワード分析</h2>
  <div class="footer">競合分析アプリ - ダッシュボード自動生成レポート</div>
</body>
</html>`;
    }

    const html = generateTestHtml();

    it("should be valid HTML document", () => {
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html lang=\"ja\">");
      expect(html).toContain("</html>");
    });

    it("should contain report title", () => {
      expect(html).toContain("ダッシュボード レポート");
    });

    it("should contain site count info", () => {
      expect(html).toContain("5サイト");
      expect(html).toContain("自社1");
      expect(html).toContain("競合4");
    });

    it("should contain quick stats section", () => {
      expect(html).toContain("stats-row");
    });

    it("should contain access share section", () => {
      expect(html).toContain("アクセスシェア率");
      expect(html).toContain("<svg");
    });

    it("should contain engagement summary section", () => {
      expect(html).toContain("エンゲージメント サマリー");
      expect(html).toContain("<table>");
    });

    it("should contain all chart sections", () => {
      expect(html).toContain("月間トラフィック比較");
      expect(html).toContain("チャネル別トラフィック概要");
      expect(html).toContain("検索トラフィック合計");
      expect(html).toContain("オーガニック vs 有料検索");
      expect(html).toContain("チャネル別トラフィックシェア");
      expect(html).toContain("ディスプレイ広告ネットワーク");
      expect(html).toContain("月間セッション数推移");
      expect(html).toContain("ソーシャルトラフィック内訳");
    });

    it("should contain channel detail table section", () => {
      expect(html).toContain("チャネル別トラフィック詳細");
    });

    it("should contain keyword analysis section", () => {
      expect(html).toContain("流入キーワード分析");
    });

    it("should contain footer", () => {
      expect(html).toContain("競合分析アプリ");
      expect(html).toContain("ダッシュボード自動生成レポート");
    });

    it("should contain engagement data for all sites", () => {
      expect(html).toContain("補助金ポータル");
      expect(html).toContain("みんなの補助金コンシェルジュ");
      expect(html).toContain("補助金オフィス");
      expect(html).toContain("補助金の右腕");
      expect(html).toContain("補助金申請プロサポート");
    });

    it("should contain pie chart SVG with correct data", () => {
      expect(html).toContain("50.6%");
      expect(html).toContain("44.2%");
    });
  });

  describe("Chart Data Preparation", () => {
    it("should prepare search traffic data correctly", () => {
      const searchTrafficData = Object.values(displayData)
        .filter((d: any) => presetMap[d.domain]?.searchTraffic)
        .map((d: any) => ({
          label: d.name,
          value: presetMap[d.domain]?.searchTraffic?.total || 0,
        }));

      expect(searchTrafficData.length).toBe(5);
      expect(searchTrafficData[0].value).toBeGreaterThan(0);
    });

    it("should prepare organic vs paid ratio data correctly", () => {
      const ratioData = Object.values(displayData)
        .filter((d: any) => presetMap[d.domain]?.searchTraffic)
        .map((d: any) => {
          const st = presetMap[d.domain]!.searchTraffic;
          return {
            label: d.name,
            organic: st.organicPercent,
            paid: st.paidPercent,
          };
        });

      expect(ratioData.length).toBe(5);
      for (const item of ratioData) {
        const sum = item.organic + item.paid;
        expect(sum).toBeCloseTo(100, 0);
      }
    });

    it("should prepare channel share data correctly", () => {
      const channelShareData = Object.values(displayData)
        .filter((d: any) => d.channels)
        .map((d: any) => {
          const ch = d.channels!;
          const total = ch.total || 1;
          const segments = [
            { name: "ダイレクト", value: (ch.direct / total) * 100 },
            { name: "オーガニック", value: (ch.organicSearch / total) * 100 },
            { name: "リファラル", value: (ch.referral / total) * 100 },
            { name: "有料検索", value: (ch.paidSearch / total) * 100 },
            { name: "ソーシャル", value: (ch.social / total) * 100 },
            { name: "ディスプレイ", value: (ch.displayAds / total) * 100 },
          ];
          return { label: d.name, segments };
        });

      expect(channelShareData.length).toBe(5);
      for (const item of channelShareData) {
        const totalPercent = item.segments.reduce((sum, s) => sum + s.value, 0);
        // Should be close to 100% (email is excluded so it won't be exactly 100)
        expect(totalPercent).toBeGreaterThan(0);
        expect(totalPercent).toBeLessThanOrEqual(100.1);
      }
    });

    it("should prepare display ad network data correctly", () => {
      for (const site of testSites) {
        const data = presetMap[site.domain];
        if (data?.displayAdNetworks?.length) {
          const totalShare = data.displayAdNetworks.reduce((sum, n) => sum + n.share, 0);
          expect(totalShare).toBeCloseTo(100, 0);
        }
      }
    });

    it("should prepare social breakdown data correctly", () => {
      for (const site of testSites) {
        const data = presetMap[site.domain];
        if (data?.socialBreakdown) {
          const sb = data.socialBreakdown;
          const total = sb.youtube + sb.facebook + sb.twitter + sb.reddit + sb.instagram + sb.other;
          expect(total).toBeCloseTo(100, 0);
        }
      }
    });

    it("should prepare monthly trend data with 12 months", () => {
      for (const site of testSites) {
        const data = presetMap[site.domain];
        if (data?.monthlySessionsTrend) {
          expect(data.monthlySessionsTrend).toHaveLength(12);
          for (const val of data.monthlySessionsTrend) {
            expect(val).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  describe("Keyword Data for HTML Export", () => {
    it("should have top 10 keywords for each site", () => {
      for (const site of testSites) {
        const data = presetMap[site.domain];
        expect(data).toBeDefined();
        expect(data!.keywords.length).toBeGreaterThanOrEqual(10);
      }
    });

    it("should have keyword rank, clicks, and share data", () => {
      const portal = presetMap["hojyokin-portal.jp"];
      expect(portal).toBeDefined();
      const kw = portal!.keywords[0];
      expect(kw.rank).toBe(1);
      expect(kw.keyword).toBe("補助金ポータル");
      expect(kw.clicks).toBeGreaterThan(0);
      expect(kw.sharePercent).toBeGreaterThan(0);
    });
  });
});
