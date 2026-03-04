/**
 * CSV/PDFエクスポートユーティリティ
 * 競合分析データをCSVまたはHTML(PDF印刷用)形式でエクスポート
 */
import { Platform } from "react-native";
import { getPresetData, formatLargeNumber, type PresetSiteData } from "./preset-data";

// ===== CSV生成 =====

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

/** エンゲージメントサマリーCSV */
export function generateEngagementCsv(
  sites: { domain: string; name: string; isOwn: boolean }[]
): string {
  const header = buildCsvRow([
    "サイト名",
    "ドメイン",
    "種別",
    "月間セッション",
    "月間ユニーク訪問者",
    "平均滞在時間",
    "平均ページビュー",
    "直帰率(%)",
    "総ページビュー",
    "アクセスシェア(%)",
  ]);
  const rows = sites.map((site) => {
    const data = getPresetData(site.domain);
    if (!data) {
      return buildCsvRow([site.name, site.domain, site.isOwn ? "自社" : "競合", "-", "-", "-", "-", "-", "-", "-"]);
    }
    return buildCsvRow([
      data.site.name,
      site.domain,
      site.isOwn ? "自社" : "競合",
      data.engagement.monthlySessions,
      data.engagement.monthlyUniqueVisitors,
      data.engagement.avgDuration,
      data.engagement.avgPageViews,
      (data.engagement.bounceRate * 100).toFixed(1),
      data.engagement.totalPageViews,
      data.accessShare,
    ]);
  });
  return "\uFEFF" + [header, ...rows].join("\n");
}

/** チャネル別トラフィックCSV */
export function generateChannelCsv(
  sites: { domain: string; name: string; isOwn: boolean }[]
): string {
  const header = buildCsvRow([
    "サイト名",
    "ドメイン",
    "合計",
    "ダイレクト",
    "オーガニック検索",
    "有料検索",
    "リファラル",
    "ディスプレイ広告",
    "ソーシャル",
    "メール",
  ]);
  const rows = sites.map((site) => {
    const data = getPresetData(site.domain);
    if (!data) {
      return buildCsvRow([site.name, site.domain, "-", "-", "-", "-", "-", "-", "-", "-"]);
    }
    return buildCsvRow([
      data.site.name,
      site.domain,
      data.channels.total,
      data.channels.direct,
      data.channels.organicSearch,
      data.channels.paidSearch,
      data.channels.referral,
      data.channels.displayAds,
      data.channels.social,
      data.channels.email,
    ]);
  });
  return "\uFEFF" + [header, ...rows].join("\n");
}

/** キーワードCSV */
export function generateKeywordCsv(
  sites: { domain: string; name: string }[]
): string {
  const header = buildCsvRow([
    "サイト名",
    "ドメイン",
    "順位",
    "キーワード",
    "クリック数",
    "シェア(%)",
    "検索ボリューム",
  ]);
  const rows: string[] = [];
  for (const site of sites) {
    const data = getPresetData(site.domain);
    if (!data) continue;
    for (const kw of data.keywords) {
      rows.push(
        buildCsvRow([
          data.site.name,
          site.domain,
          kw.rank,
          kw.keyword,
          kw.clicks,
          kw.sharePercent,
          String(kw.searchVolume),
        ])
      );
    }
  }
  return "\uFEFF" + [header, ...rows].join("\n");
}

/** 全データ統合CSV */
export function generateFullReportCsv(
  sites: { domain: string; name: string; isOwn: boolean }[]
): string {
  const sections: string[] = [];

  // セクション1: エンゲージメント
  sections.push("=== エンゲージメント サマリー ===");
  sections.push(generateEngagementCsv(sites).replace("\uFEFF", ""));

  // セクション2: チャネル
  sections.push("");
  sections.push("=== チャネル別トラフィック ===");
  sections.push(generateChannelCsv(sites).replace("\uFEFF", ""));

  // セクション3: キーワード
  sections.push("");
  sections.push("=== キーワード ===");
  sections.push(generateKeywordCsv(sites).replace("\uFEFF", ""));

  return "\uFEFF" + sections.join("\n");
}

// ===== HTMLレポート生成（PDF印刷用） =====

function buildHtmlTable(headers: string[], rows: string[][]): string {
  const headerHtml = headers.map((h) => `<th>${h}</th>`).join("");
  const bodyHtml = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

export function generateHtmlReport(
  sites: { domain: string; name: string; isOwn: boolean }[]
): string {
  const now = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // エンゲージメントテーブル
  const engHeaders = ["サイト名", "種別", "月間セッション", "ユニーク訪問者", "滞在時間", "平均PV", "直帰率", "シェア"];
  const engRows = sites
    .map((site) => {
      const data = getPresetData(site.domain);
      if (!data) return null;
      return [
        data.site.name,
        site.isOwn ? "自社" : "競合",
        formatLargeNumber(data.engagement.monthlySessions),
        formatLargeNumber(data.engagement.monthlyUniqueVisitors),
        data.engagement.avgDuration,
        data.engagement.avgPageViews.toFixed(1),
        (data.engagement.bounceRate * 100).toFixed(1) + "%",
        data.accessShare + "%",
      ];
    })
    .filter(Boolean) as string[][];

  // チャネルテーブル
  const chHeaders = ["サイト名", "合計", "ダイレクト", "オーガニック", "有料検索", "リファラル", "ソーシャル"];
  const chRows = sites
    .map((site) => {
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
    })
    .filter(Boolean) as string[][];

  // キーワードテーブル（各サイトTop10）
  const kwSections = sites
    .map((site) => {
      const data = getPresetData(site.domain);
      if (!data || data.keywords.length === 0) return "";
      const kwRows = data.keywords.slice(0, 10).map((kw) => [
        String(kw.rank),
        kw.keyword,
        String(kw.clicks),
        kw.sharePercent + "%",
        String(kw.searchVolume),
      ]);
      return `
        <h3>${data.site.name} - 流入キーワード Top10</h3>
        ${buildHtmlTable(["順位", "キーワード", "クリック数", "シェア", "検索ボリューム"], kwRows)}
      `;
    })
    .filter(Boolean)
    .join("");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>競合分析レポート - ${now}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; color: #1a1a1a; font-size: 12px; }
  h1 { font-size: 20px; margin-bottom: 4px; color: #1E40AF; }
  h2 { font-size: 16px; margin: 24px 0 12px; color: #1E40AF; border-bottom: 2px solid #1E40AF; padding-bottom: 4px; }
  h3 { font-size: 13px; margin: 16px 0 8px; color: #374151; }
  .subtitle { color: #6b7280; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #1E40AF; color: white; padding: 6px 8px; text-align: left; font-size: 11px; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
  tr:nth-child(even) { background: #f9fafb; }
  .footer { margin-top: 32px; text-align: center; color: #9ca3af; font-size: 10px; }
  @media print { body { padding: 12px; } }
</style>
</head>
<body>
  <h1>競合分析レポート</h1>
  <p class="subtitle">作成日: ${now} | 対象: ${sites.length}サイト</p>

  <h2>エンゲージメント サマリー</h2>
  ${buildHtmlTable(engHeaders, engRows)}

  <h2>チャネル別トラフィック</h2>
  ${buildHtmlTable(chHeaders, chRows)}

  <h2>流入キーワード分析</h2>
  ${kwSections}

  <div class="footer">
    <p>競合分析アプリ - 自動生成レポート</p>
  </div>
</body>
</html>`;
}

// ===== ファイル保存・共有ヘルパー =====

export async function saveAndShareFile(
  content: string,
  filename: string,
  mimeType: string
): Promise<void> {
  if (Platform.OS === "web") {
    // Web: Blob + download link
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  // Native: expo-file-system + expo-sharing
  const FileSystem = await import("expo-file-system/legacy");
  const Sharing = await import("expo-sharing");

  const fileUri = FileSystem.documentDirectory + filename;
  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(fileUri, { mimeType });
  }
}

/** CSVエクスポート */
export async function exportCsv(
  sites: { domain: string; name: string; isOwn: boolean }[],
  type: "engagement" | "channel" | "keyword" | "full"
): Promise<void> {
  let content: string;
  let filename: string;
  const dateStr = new Date().toISOString().slice(0, 10);

  switch (type) {
    case "engagement":
      content = generateEngagementCsv(sites);
      filename = `engagement_${dateStr}.csv`;
      break;
    case "channel":
      content = generateChannelCsv(sites);
      filename = `channel_${dateStr}.csv`;
      break;
    case "keyword":
      content = generateKeywordCsv(sites);
      filename = `keywords_${dateStr}.csv`;
      break;
    case "full":
    default:
      content = generateFullReportCsv(sites);
      filename = `full_report_${dateStr}.csv`;
      break;
  }

  await saveAndShareFile(content, filename, "text/csv");
}

/** HTMLレポートエクスポート（印刷でPDF化可能） */
export async function exportHtmlReport(
  sites: { domain: string; name: string; isOwn: boolean }[]
): Promise<void> {
  const content = generateHtmlReport(sites);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `competitor_report_${dateStr}.html`;

  if (Platform.OS === "web") {
    // Web: 新しいウィンドウで開いて印刷
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) {
      win.onload = () => {
        setTimeout(() => win.print(), 500);
      };
    }
    return;
  }

  await saveAndShareFile(content, filename, "text/html");
}
