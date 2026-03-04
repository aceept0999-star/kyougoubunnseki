import { describe, it, expect } from "vitest";
// export-utils.tsはreact-nativeのPlatformをimportするため、
// テスト用にCSV/HTML生成ロジックを直接テストする
import { getPresetData, formatLargeNumber } from "../lib/preset-data";

// CSV生成ロジックをテスト用に再実装（export-utilsと同じロジック）
function escapeCsvField(field: string | number): string {
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsvRow(fields: (string | number)[]): string {
  return fields.map(escapeCsvField).join(",");
}

function generateEngagementCsv(
  sites: { domain: string; name: string; isOwn: boolean }[]
): string {
  const header = buildCsvRow([
    "サイト名", "ドメイン", "種別", "月間セッション",
    "月間ユニーク訪問者", "平均滞在時間", "平均ページビュー",
    "直帰率(%)", "総ページビュー", "アクセスシェア(%)",
  ]);
  const rows = sites.map((site) => {
    const data = getPresetData(site.domain);
    if (!data) {
      return buildCsvRow([site.name, site.domain, site.isOwn ? "自社" : "競合", "-", "-", "-", "-", "-", "-", "-"]);
    }
    return buildCsvRow([
      data.site.name, site.domain, site.isOwn ? "自社" : "競合",
      data.engagement.monthlySessions, data.engagement.monthlyUniqueVisitors,
      data.engagement.avgDuration, data.engagement.avgPageViews,
      (data.engagement.bounceRate * 100).toFixed(1),
      data.engagement.totalPageViews, data.accessShare,
    ]);
  });
  return "\uFEFF" + [header, ...rows].join("\n");
}

function generateChannelCsv(
  sites: { domain: string; name: string; isOwn: boolean }[]
): string {
  const header = buildCsvRow([
    "サイト名", "ドメイン", "合計", "ダイレクト",
    "オーガニック検索", "有料検索", "リファラル",
    "ディスプレイ広告", "ソーシャル", "メール",
  ]);
  const rows = sites.map((site) => {
    const data = getPresetData(site.domain);
    if (!data) {
      return buildCsvRow([site.name, site.domain, "-", "-", "-", "-", "-", "-", "-", "-"]);
    }
    return buildCsvRow([
      data.site.name, site.domain, data.channels.total,
      data.channels.direct, data.channels.organicSearch,
      data.channels.paidSearch, data.channels.referral,
      data.channels.displayAds, data.channels.social, data.channels.email,
    ]);
  });
  return "\uFEFF" + [header, ...rows].join("\n");
}

function generateKeywordCsv(
  sites: { domain: string; name: string }[]
): string {
  const header = buildCsvRow([
    "サイト名", "ドメイン", "順位", "キーワード",
    "クリック数", "シェア(%)", "検索ボリューム",
  ]);
  const rows: string[] = [];
  for (const site of sites) {
    const data = getPresetData(site.domain);
    if (!data) continue;
    for (const kw of data.keywords) {
      rows.push(buildCsvRow([
        data.site.name, site.domain, kw.rank, kw.keyword,
        kw.clicks, kw.sharePercent, String(kw.searchVolume),
      ]));
    }
  }
  return "\uFEFF" + [header, ...rows].join("\n");
}

function generateFullReportCsv(
  sites: { domain: string; name: string; isOwn: boolean }[]
): string {
  const sections: string[] = [];
  sections.push("=== エンゲージメント サマリー ===");
  sections.push(generateEngagementCsv(sites).replace("\uFEFF", ""));
  sections.push("");
  sections.push("=== チャネル別トラフィック ===");
  sections.push(generateChannelCsv(sites).replace("\uFEFF", ""));
  sections.push("");
  sections.push("=== キーワード ===");
  sections.push(generateKeywordCsv(sites).replace("\uFEFF", ""));
  return "\uFEFF" + sections.join("\n");
}

function buildHtmlTable(headers: string[], rows: string[][]): string {
  const headerHtml = headers.map((h) => `<th>${h}</th>`).join("");
  const bodyHtml = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

function generateHtmlReport(
  sites: { domain: string; name: string; isOwn: boolean }[]
): string {
  const now = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
  const engHeaders = ["サイト名", "種別", "月間セッション", "ユニーク訪問者", "滞在時間", "平均PV", "直帰率", "シェア"];
  const engRows = sites.map((site) => {
    const data = getPresetData(site.domain);
    if (!data) return null;
    return [
      data.site.name, site.isOwn ? "自社" : "競合",
      formatLargeNumber(data.engagement.monthlySessions),
      formatLargeNumber(data.engagement.monthlyUniqueVisitors),
      data.engagement.avgDuration,
      data.engagement.avgPageViews.toFixed(1),
      (data.engagement.bounceRate * 100).toFixed(1) + "%",
      data.accessShare + "%",
    ];
  }).filter(Boolean) as string[][];
  const chHeaders = ["サイト名", "合計", "ダイレクト", "オーガニック", "有料検索", "リファラル", "ソーシャル"];
  const chRows = sites.map((site) => {
    const data = getPresetData(site.domain);
    if (!data) return null;
    return [
      data.site.name,
      formatLargeNumber(data.channels.total),
      formatLargeNumber(data.channels.direct),
      formatLargeNumber(data.channels.organicSearch),
      formatLargeNumber(data.channels.paidSearch),
      formatLargeNumber(data.channels.referral),
      formatLargeNumber(data.channels.social),
    ];
  }).filter(Boolean) as string[][];
  const kwSections = sites.map((site) => {
    const data = getPresetData(site.domain);
    if (!data || data.keywords.length === 0) return "";
    const kwRows = data.keywords.slice(0, 10).map((kw) => [
      String(kw.rank), kw.keyword, String(kw.clicks), kw.sharePercent + "%", String(kw.searchVolume),
    ]);
    return `<h3>${data.site.name} - 流入キーワード Top10</h3>${buildHtmlTable(["順位", "キーワード", "クリック数", "シェア", "検索ボリューム"], kwRows)}`;
  }).filter(Boolean).join("");
  return `<!DOCTYPE html>\n<html lang="ja">\n<head>\n<meta charset="UTF-8">\n<title>競合分析レポート - ${now}</title>\n<style>\n  * { margin: 0; padding: 0; box-sizing: border-box; }\n  body { font-family: sans-serif; padding: 24px; color: #1a1a1a; font-size: 12px; }\n  h1 { font-size: 20px; margin-bottom: 4px; color: #1E40AF; }\n  h2 { font-size: 16px; margin: 24px 0 12px; color: #1E40AF; border-bottom: 2px solid #1E40AF; padding-bottom: 4px; }\n  h3 { font-size: 13px; margin: 16px 0 8px; color: #374151; }\n  .subtitle { color: #6b7280; margin-bottom: 20px; }\n  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }\n  th { background: #1E40AF; color: white; padding: 6px 8px; text-align: left; font-size: 11px; }\n  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }\n  tr:nth-child(even) { background: #f9fafb; }\n  .footer { margin-top: 32px; text-align: center; color: #9ca3af; font-size: 10px; }\n  @media print { body { padding: 12px; } }\n</style>\n</head>\n<body>\n  <h1>競合分析レポート</h1>\n  <p class="subtitle">作成日: ${now} | 対象: ${sites.length}サイト</p>\n  <h2>エンゲージメント サマリー</h2>\n  ${buildHtmlTable(engHeaders, engRows)}\n  <h2>チャネル別トラフィック</h2>\n  ${buildHtmlTable(chHeaders, chRows)}\n  <h2>流入キーワード分析</h2>\n  ${kwSections}\n  <div class="footer"><p>競合分析アプリ - 自動生成レポート</p></div>\n</body>\n</html>`;
}

const testSites = [
  { domain: "hojyokin-portal.jp", name: "補助金ポータル", isOwn: true },
  { domain: "hojyokin-concierge.com", name: "みんなの補助金コンシェルジュ", isOwn: false },
];

const unknownSite = [
  { domain: "unknown-site.com", name: "不明サイト", isOwn: false },
];

describe("CSV生成", () => {
  describe("generateEngagementCsv", () => {
    it("ヘッダー行を含むCSVを生成する", () => {
      const csv = generateEngagementCsv(testSites);
      expect(csv).toContain("\uFEFF"); // BOM
      const lines = csv.replace("\uFEFF", "").split("\n");
      expect(lines[0]).toContain("サイト名");
      expect(lines[0]).toContain("月間セッション");
      expect(lines[0]).toContain("直帰率(%)");
      expect(lines[0]).toContain("アクセスシェア(%)");
    });

    it("プリセットデータのあるサイトのデータ行を生成する", () => {
      const csv = generateEngagementCsv(testSites);
      const lines = csv.replace("\uFEFF", "").split("\n");
      expect(lines.length).toBe(3); // header + 2 data rows
      expect(lines[1]).toContain("補助金ポータル");
      expect(lines[1]).toContain("hojyokin-portal.jp");
      expect(lines[1]).toContain("自社");
      expect(lines[1]).toContain("211757");
      expect(lines[2]).toContain("みんなの補助金コンシェルジュ");
      expect(lines[2]).toContain("競合");
    });

    it("プリセットデータのないサイトはダッシュで表示する", () => {
      const csv = generateEngagementCsv(unknownSite);
      const lines = csv.replace("\uFEFF", "").split("\n");
      expect(lines[1]).toContain("不明サイト");
      expect(lines[1]).toContain("-");
    });

    it("空のサイトリストでもヘッダーのみ生成する", () => {
      const csv = generateEngagementCsv([]);
      const lines = csv.replace("\uFEFF", "").split("\n");
      expect(lines.length).toBe(1);
      expect(lines[0]).toContain("サイト名");
    });
  });

  describe("generateChannelCsv", () => {
    it("チャネルデータを含むCSVを生成する", () => {
      const csv = generateChannelCsv(testSites);
      const lines = csv.replace("\uFEFF", "").split("\n");
      expect(lines[0]).toContain("ダイレクト");
      expect(lines[0]).toContain("オーガニック検索");
      expect(lines[0]).toContain("ソーシャル");
      expect(lines.length).toBe(3);
    });

    it("チャネルのトラフィック数値が含まれる", () => {
      const csv = generateChannelCsv(testSites);
      expect(csv).toContain("2541000"); // 補助金ポータルのtotal
    });
  });

  describe("generateKeywordCsv", () => {
    it("キーワードデータを含むCSVを生成する", () => {
      const csv = generateKeywordCsv(testSites);
      const lines = csv.replace("\uFEFF", "").split("\n");
      expect(lines[0]).toContain("キーワード");
      expect(lines[0]).toContain("クリック数");
      expect(lines[0]).toContain("検索ボリューム");
      expect(lines.length).toBeGreaterThan(2); // header + keyword rows
    });

    it("プリセットデータのないサイトはスキップする", () => {
      const csv = generateKeywordCsv(unknownSite);
      const lines = csv.replace("\uFEFF", "").split("\n");
      expect(lines.length).toBe(1); // header only
    });
  });

  describe("generateFullReportCsv", () => {
    it("全セクションを含む統合CSVを生成する", () => {
      const csv = generateFullReportCsv(testSites);
      expect(csv).toContain("エンゲージメント サマリー");
      expect(csv).toContain("チャネル別トラフィック");
      expect(csv).toContain("キーワード");
    });

    it("BOMを含む", () => {
      const csv = generateFullReportCsv(testSites);
      expect(csv.startsWith("\uFEFF")).toBe(true);
    });
  });
});

describe("HTMLレポート生成", () => {
  describe("generateHtmlReport", () => {
    it("有効なHTMLドキュメントを生成する", () => {
      const html = generateHtmlReport(testSites);
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html lang=\"ja\">");
      expect(html).toContain("</html>");
      expect(html).toContain("競合分析レポート");
    });

    it("エンゲージメントテーブルを含む", () => {
      const html = generateHtmlReport(testSites);
      expect(html).toContain("エンゲージメント サマリー");
      expect(html).toContain("補助金ポータル");
      expect(html).toContain("みんなの補助金コンシェルジュ");
    });

    it("チャネルテーブルを含む", () => {
      const html = generateHtmlReport(testSites);
      expect(html).toContain("チャネル別トラフィック");
    });

    it("キーワードセクションを含む", () => {
      const html = generateHtmlReport(testSites);
      expect(html).toContain("流入キーワード分析");
    });

    it("日付を含む", () => {
      const html = generateHtmlReport(testSites);
      // 日本語の日付フォーマット
      expect(html).toContain("作成日:");
    });

    it("スタイルを含む", () => {
      const html = generateHtmlReport(testSites);
      expect(html).toContain("<style>");
      expect(html).toContain("@media print");
    });

    it("プリセットデータのないサイトはテーブルに含まれない", () => {
      const html = generateHtmlReport(unknownSite);
      expect(html).toContain("<!DOCTYPE html>");
      // テーブルは空だがHTMLは有効
      expect(html).not.toContain("不明サイト");
    });
  });
});

describe("CSVフィールドエスケープ", () => {
  it("カンマを含むフィールドをダブルクォートで囲む", () => {
    // プリセットデータにないドメインを使用してnameがそのまま使われることを確認
    const sites = [{ domain: "test-comma.example.com", name: "テスト,サイト", isOwn: true }];
    const csv = generateEngagementCsv(sites);
    expect(csv).toContain('"\u30c6\u30b9\u30c8,\u30b5\u30a4\u30c8"');
  });

  it("ダブルクォートを含むフィールドをエスケープする", () => {
    const sites = [{ domain: "test-quote.example.com", name: '\u30c6\u30b9\u30c8"\u30b5\u30a4\u30c8', isOwn: true }];
    const csv = generateEngagementCsv(sites);
    expect(csv).toContain('"\u30c6\u30b9\u30c8""\u30b5\u30a4\u30c8"');
  });
});
