/**
 * ダッシュボードHTML出力ユーティリティ
 * ダッシュボード画面の全チャート・グラフ・テーブルを包括的なHTMLレポートとして生成
 */
import { Platform } from "react-native";
import {
  getPresetData,
  formatLargeNumber,
  type PresetSiteData,
  type PresetDisplayAdNetwork,
  type PresetSocialBreakdown,
} from "./preset-data";
import { saveAndShareFile } from "./export-utils";
import type { LiveSiteData } from "./live-data-store";

// ===== カラーパレット =====
const CHART_COLORS = [
  "#1E40AF", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16",
];

const PRIMARY_COLOR = "#1E40AF";
const WARNING_COLOR = "#F59E0B";

// ===== データ型 =====
interface DashboardSite {
  domain: string;
  name: string;
  isOwn: boolean;
}

interface DisplayDataItem {
  name: string;
  domain: string;
  isOwn: boolean;
  sessions: number;
  uniqueVisitors: number;
  duration: string;
  pageViews: number;
  bounceRate: number;
  totalPageViews: number;
  accessShare: number;
  channels: {
    total: number;
    direct: number;
    organicSearch: number;
    paidSearch: number;
    referral: number;
    displayAds: number;
    social: number;
    email: number;
  } | null;
  updatedAt: string | null;
  isLive: boolean;
}

// ===== SVGチャート生成ヘルパー =====

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  if (num < 1 && num > 0) return num.toFixed(2);
  return Math.round(num).toString();
}

/** 円グラフSVG生成 */
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

/** 棒グラフSVG生成 */
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
      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="${color}" />
        <text x="${x + barWidth / 2}" y="${y - 4}" font-size="10" fill="#6b7280" text-anchor="middle">${formatNumber(item.value)}</text>
        <text x="${x + barWidth / 2}" y="${height + 14}" font-size="9" fill="#6b7280" text-anchor="middle">${item.label.length > 8 ? item.label.slice(0, 8) + "…" : item.label}</text>
      `;
    })
    .join("");

  return `
    <div class="chart-center">
      <svg width="${chartWidth}" height="${height + 24}" viewBox="0 0 ${chartWidth} ${height + 24}">
        ${bars}
      </svg>
    </div>
  `;
}

/** 水平棒グラフSVG生成 */
function generateHorizontalBarSvg(
  data: { label: string; value: number; maxValue?: number; color?: string }[]
): string {
  if (!data.length) return "";
  const maxValue = Math.max(...data.map((d) => d.maxValue || d.value), 1);
  const barHeight = 18;
  const gap = 28;
  const labelWidth = 140;
  const chartWidth = 500;
  const svgHeight = data.length * (barHeight + gap) + 10;

  const bars = data
    .map((item, i) => {
      const width = Math.max((item.value / maxValue) * (chartWidth - labelWidth - 80), 4);
      const y = i * (barHeight + gap) + 5;
      const color = item.color || CHART_COLORS[i % CHART_COLORS.length];
      return `
        <text x="0" y="${y + barHeight / 2 + 4}" font-size="11" fill="#374151">${item.label}</text>
        <rect x="${labelWidth}" y="${y}" width="${chartWidth - labelWidth - 80}" height="${barHeight}" rx="4" fill="#e5e7eb" />
        <rect x="${labelWidth}" y="${y}" width="${width}" height="${barHeight}" rx="4" fill="${color}" />
        <text x="${chartWidth - 5}" y="${y + barHeight / 2 + 4}" font-size="11" fill="#6b7280" text-anchor="end" font-weight="600">${formatNumber(item.value)}</text>
      `;
    })
    .join("");

  return `
    <div class="chart-center">
      <svg width="${chartWidth}" height="${svgHeight}" viewBox="0 0 ${chartWidth} ${svgHeight}">
        ${bars}
      </svg>
    </div>
  `;
}

/** 積み上げ横棒グラフSVG生成 */
function generateStackedBarSvg(
  data: {
    label: string;
    segments: { name: string; value: number; color: string }[];
  }[]
): string {
  if (!data.length) return "";
  const barHeight = 24;
  const gap = 36;
  const labelWidth = 140;
  const chartWidth = 550;
  const svgHeight = data.length * (barHeight + gap) + 20;

  const segmentNames = Array.from(
    new Set(data.flatMap((d) => d.segments.map((s) => s.name)))
  );

  const bars = data
    .map((item, i) => {
      const total = item.segments.reduce((sum, s) => sum + s.value, 0) || 1;
      const y = i * (barHeight + gap) + 10;
      let currentX = labelWidth;
      const barW = chartWidth - labelWidth - 20;

      const segs = item.segments
        .map((seg) => {
          const segWidth = (seg.value / total) * barW;
          const x = currentX;
          currentX += segWidth;
          const textEl =
            segWidth > 30
              ? `<text x="${x + segWidth / 2}" y="${y + barHeight / 2 + 4}" font-size="8" fill="#fff" text-anchor="middle" font-weight="bold">${seg.value.toFixed(1)}%</text>`
              : "";
          return `<rect x="${x}" y="${y}" width="${Math.max(segWidth, 0.5)}" height="${barHeight}" fill="${seg.color}" />${textEl}`;
        })
        .join("");

      return `
        <text x="0" y="${y + barHeight / 2 + 4}" font-size="10" fill="#374151">${item.label.length > 20 ? item.label.slice(0, 20) + "…" : item.label}</text>
        ${segs}
      `;
    })
    .join("");

  const legendHtml = segmentNames
    .map((name) => {
      const seg = data[0]?.segments.find((s) => s.name === name);
      return `<span class="legend-item"><span class="legend-dot" style="background:${seg?.color || "#9CA3AF"}"></span>${name}</span>`;
    })
    .join("");

  return `
    <div class="chart-center">
      <svg width="${chartWidth}" height="${svgHeight}" viewBox="0 0 ${chartWidth} ${svgHeight}">
        ${bars}
      </svg>
      <div class="legend">${legendHtml}</div>
    </div>
  `;
}

/** 比率棒グラフSVG生成 */
function generateRatioBarSvg(
  data: {
    label: string;
    values: { name: string; value: number; color: string }[];
  }[]
): string {
  if (!data.length) return "";
  const barHeight = 22;
  const gap = 30;
  const labelWidth = 140;
  const chartWidth = 550;
  const svgHeight = data.length * (barHeight + gap) + 10;

  const bars = data
    .map((item, i) => {
      const total = item.values.reduce((sum, v) => sum + v.value, 0) || 1;
      const y = i * (barHeight + gap) + 5;
      let currentX = labelWidth;
      const barW = chartWidth - labelWidth - 100;

      const segs = item.values
        .map((v, vi) => {
          const segWidth = (v.value / total) * barW;
          const x = currentX;
          currentX += segWidth;
          return `<rect x="${x}" y="${y}" width="${Math.max(segWidth, 0.5)}" height="${barHeight}" ${vi === 0 ? 'rx="4"' : ""} fill="${v.color}" />`;
        })
        .join("");

      return `
        <text x="0" y="${y + barHeight / 2 + 4}" font-size="10" fill="#374151">${item.label.length > 20 ? item.label.slice(0, 20) + "…" : item.label}</text>
        ${segs}
        <text x="${chartWidth - 5}" y="${y + barHeight / 2 + 4}" font-size="10" fill="#6b7280" text-anchor="end">${item.values.map((v) => `${v.value.toFixed(1)}%`).join(" / ")}</text>
      `;
    })
    .join("");

  const legendHtml = data[0]?.values
    .map(
      (v) =>
        `<span class="legend-item"><span class="legend-dot" style="background:${v.color}"></span>${v.name}</span>`
    )
    .join("") || "";

  return `
    <div class="chart-center">
      <svg width="${chartWidth}" height="${svgHeight}" viewBox="0 0 ${chartWidth} ${svgHeight}">
        ${bars}
      </svg>
      <div class="legend">${legendHtml}</div>
    </div>
  `;
}

/** 折れ線グラフSVG生成 */
function generateLineChartSvg(
  labels: string[],
  datasets: { label: string; data: number[]; color?: string }[],
  height: number = 240
): string {
  if (!datasets.length || !labels.length) return "";

  const allValues = datasets.flatMap((d) => d.data);
  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(...allValues, 0);
  const range = maxValue - minValue || 1;
  const width = 550;
  const padding = { top: 15, right: 15, bottom: 35, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const y = padding.top + chartH * (1 - ratio);
      const val = minValue + range * ratio;
      return `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e5e7eb" stroke-width="0.5" />
        <text x="${padding.left - 6}" y="${y + 3}" font-size="9" fill="#6b7280" text-anchor="end">${formatNumber(val)}</text>
      `;
    })
    .join("");

  // Lines
  const lines = datasets
    .map((dataset, di) => {
      const lineColor = dataset.color || CHART_COLORS[di % CHART_COLORS.length];
      const points = dataset.data.map((val, i) => ({
        x: padding.left + (i / Math.max(labels.length - 1, 1)) * chartW,
        y: padding.top + chartH * (1 - (val - minValue) / range),
      }));

      const pathD = points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
        .join(" ");

      const circles = points
        .map((p) => `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="3" fill="${lineColor}" />`)
        .join("");

      return `<path d="${pathD}" stroke="${lineColor}" stroke-width="2" fill="none" />${circles}`;
    })
    .join("");

  // X labels
  const xLabels = labels
    .map((label, i) => {
      const x = padding.left + (i / Math.max(labels.length - 1, 1)) * chartW;
      return `<text x="${x.toFixed(2)}" y="${height - 4}" font-size="9" fill="#6b7280" text-anchor="middle">${label}</text>`;
    })
    .join("");

  const legendHtml = datasets
    .map(
      (d, i) =>
        `<span class="legend-item"><span class="legend-dot" style="background:${d.color || CHART_COLORS[i % CHART_COLORS.length]}"></span>${d.label}</span>`
    )
    .join("");

  return `
    <div class="chart-center">
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        ${gridLines}
        ${lines}
        ${xLabels}
      </svg>
      <div class="legend">${legendHtml}</div>
    </div>
  `;
}

// ===== HTMLテーブル生成 =====

function buildHtmlTable(headers: string[], rows: string[][], alignRight: number[] = []): string {
  const headerHtml = headers
    .map((h, i) => `<th${alignRight.includes(i) ? ' class="text-right"' : ""}>${h}</th>`)
    .join("");
  const bodyHtml = rows
    .map(
      (row) =>
        `<tr>${row.map((cell, i) => `<td${alignRight.includes(i) ? ' class="text-right"' : ""}>${cell}</td>`).join("")}</tr>`
    )
    .join("");
  return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

// ===== メインHTML生成関数 =====

export function generateDashboardHtml(
  sites: DashboardSite[],
  displayData: Record<string, DisplayDataItem>,
  presetMap: Record<string, PresetSiteData>,
  liveDataMap: Record<string, LiveSiteData>
): string {
  const now = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const displayItems = Object.values(displayData);
  const hasData = displayItems.length > 0;

  // ===== セクション1: クイックスタッツ =====
  const ownCount = sites.filter((s) => s.isOwn).length;
  const compCount = sites.filter((s) => !s.isOwn).length;
  const liveCount = displayItems.filter((d) => d.isLive).length;

  const quickStatsHtml = `
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">登録サイト</div>
        <div class="stat-value">${sites.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">自社サイト</div>
        <div class="stat-value" style="color:${PRIMARY_COLOR}">${ownCount}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">競合サイト</div>
        <div class="stat-value" style="color:${WARNING_COLOR}">${compCount}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">ライブデータ</div>
        <div class="stat-value" style="color:#22C55E">${liveCount}</div>
      </div>
    </div>
  `;

  // ===== セクション2: アクセスシェア円グラフ =====
  const accessShareData = displayItems
    .filter((d) => d.accessShare > 0)
    .map((d) => ({ label: d.name, value: d.accessShare }));
  const accessShareHtml =
    accessShareData.length > 0
      ? `
    <div class="section">
      <h2>アクセスシェア率</h2>
      ${generatePieChartSvg(accessShareData)}
    </div>
  `
      : "";

  // ===== セクション3: エンゲージメントサマリーテーブル =====
  const engRows = displayItems.map((row) => [
    `<span class="site-dot" style="background:${row.isOwn ? PRIMARY_COLOR : WARNING_COLOR}"></span> ${row.name}${row.isLive ? ' <span class="live-badge">LIVE</span>' : ""}`,
    row.isOwn ? "自社" : "競合",
    formatLargeNumber(row.sessions),
    formatLargeNumber(row.uniqueVisitors),
    row.duration,
    row.pageViews.toFixed(1),
    (row.bounceRate * 100).toFixed(1) + "%",
    row.accessShare > 0 ? row.accessShare.toFixed(2) + "%" : "-",
  ]);
  const engTableHtml = hasData
    ? `
    <div class="section">
      <h2>エンゲージメント サマリー</h2>
      ${buildHtmlTable(
        ["サイト名", "種別", "月間セッション", "ユニーク訪問者", "滞在時間", "平均PV", "直帰率", "シェア"],
        engRows,
        [2, 3, 5, 6, 7]
      )}
    </div>
  `
    : "";

  // ===== セクション4: 月間トラフィック比較棒グラフ =====
  const trafficBarData = displayItems.map((d) => ({
    label: d.name,
    value: d.sessions,
    color: d.isOwn ? PRIMARY_COLOR : WARNING_COLOR,
  }));
  const trafficBarHtml = hasData
    ? `
    <div class="section">
      <h2>月間トラフィック比較</h2>
      ${generateBarChartSvg(trafficBarData)}
    </div>
  `
    : "";

  // ===== セクション5: チャネル別トラフィック概要 =====
  const channelOverviewHtml = hasData
    ? `
    <div class="section">
      <h2>チャネル別トラフィック概要</h2>
      ${displayItems
        .filter((d) => d.channels)
        .map((d) => {
          const ch = d.channels!;
          const channels = [
            { label: "オーガニック検索", value: ch.organicSearch, color: "#10B981" },
            { label: "ダイレクト", value: ch.direct, color: "#1E40AF" },
            { label: "リファラル", value: ch.referral, color: "#8B5CF6" },
            { label: "有料検索", value: ch.paidSearch, color: "#F59E0B" },
            { label: "ソーシャル", value: ch.social, color: "#EC4899" },
            { label: "ディスプレイ", value: ch.displayAds, color: "#06B6D4" },
          ].filter((c) => c.value > 0);
          if (channels.length === 0) return "";
          return `
            <div class="subsection">
              <h3><span class="site-dot" style="background:${d.isOwn ? PRIMARY_COLOR : WARNING_COLOR}"></span> ${d.name} <span class="text-muted">(${formatLargeNumber(ch.total)} total)</span>${d.isLive ? ' <span class="live-badge">LIVE</span>' : ""}</h3>
              ${generateHorizontalBarSvg(channels)}
            </div>
          `;
        })
        .join("")}
    </div>
  `
    : "";

  // ===== セクション6: 検索トラフィック合計 =====
  const searchTrafficData = displayItems
    .filter((d) => presetMap[d.domain]?.searchTraffic)
    .map((d) => ({
      label: d.name,
      value: presetMap[d.domain]?.searchTraffic?.total || 0,
      color: d.isOwn ? PRIMARY_COLOR : WARNING_COLOR,
    }));
  const searchTrafficHtml =
    searchTrafficData.length > 0
      ? `
    <div class="section">
      <h2>検索トラフィック合計</h2>
      <p class="section-desc">オーガニック + 有料検索の合計トラフィック</p>
      ${generateHorizontalBarSvg(searchTrafficData)}
    </div>
  `
      : "";

  // ===== セクション7: オーガニック vs 有料検索 =====
  const ratioData = displayItems
    .filter((d) => presetMap[d.domain]?.searchTraffic)
    .map((d) => {
      const st = presetMap[d.domain]!.searchTraffic;
      return {
        label: d.name,
        values: [
          { name: "オーガニック", value: st.organicPercent, color: "#10B981" },
          { name: "有料", value: st.paidPercent, color: "#F59E0B" },
        ],
      };
    });
  const ratioHtml =
    ratioData.length > 0
      ? `
    <div class="section">
      <h2>オーガニック vs 有料検索</h2>
      <p class="section-desc">各サイトの検索トラフィック内訳</p>
      ${generateRatioBarSvg(ratioData)}
    </div>
  `
      : "";

  // ===== セクション8: チャネル別トラフィックシェア積み上げ棒グラフ =====
  const channelShareData = displayItems
    .filter((d) => d.channels)
    .map((d) => {
      const ch = d.channels!;
      const total = ch.total || 1;
      return {
        label: d.name,
        segments: [
          { name: "ダイレクト", value: (ch.direct / total) * 100, color: "#1E40AF" },
          { name: "オーガニック", value: (ch.organicSearch / total) * 100, color: "#10B981" },
          { name: "リファラル", value: (ch.referral / total) * 100, color: "#8B5CF6" },
          { name: "有料検索", value: (ch.paidSearch / total) * 100, color: "#F59E0B" },
          { name: "ソーシャル", value: (ch.social / total) * 100, color: "#EC4899" },
          { name: "ディスプレイ", value: (ch.displayAds / total) * 100, color: "#06B6D4" },
        ].filter((s) => s.value > 0.1),
      };
    });
  const channelShareHtml =
    channelShareData.length > 0
      ? `
    <div class="section">
      <h2>チャネル別トラフィックシェア</h2>
      <p class="section-desc">各チャネルの割合を比較</p>
      ${generateStackedBarSvg(channelShareData)}
    </div>
  `
      : "";

  // ===== セクション9: ディスプレイ広告ネットワーク =====
  const hasDisplayAds = Object.values(presetMap).some((p) => p.displayAdNetworks?.length > 0);
  const displayAdHtml = hasDisplayAds
    ? `
    <div class="section">
      <h2>ディスプレイ広告ネットワーク</h2>
      <p class="section-desc">各サイトの広告ネットワーク別シェア</p>
      ${displayItems
        .filter((d) => presetMap[d.domain]?.displayAdNetworks?.length)
        .map((d) => {
          const networks = presetMap[d.domain]!.displayAdNetworks;
          return `
            <div class="subsection">
              <h3><span class="site-dot" style="background:${d.isOwn ? PRIMARY_COLOR : WARNING_COLOR}"></span> ${d.name}</h3>
              ${generateHorizontalBarSvg(
                networks.map((n, i) => ({
                  label: n.name,
                  value: n.share,
                  maxValue: 100,
                  color: ["#1E40AF", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6"][i % 5],
                }))
              )}
            </div>
          `;
        })
        .join("")}
    </div>
  `
    : "";

  // ===== セクション10: 月間セッション数推移 =====
  const trendLabels = ["2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月", "1月"];
  const trendDatasets = displayItems
    .filter((d) => presetMap[d.domain]?.monthlySessionsTrend?.length)
    .map((d, i) => ({
      label: d.name,
      data: presetMap[d.domain]!.monthlySessionsTrend,
      color: d.isOwn ? PRIMARY_COLOR : [WARNING_COLOR, "#10B981", "#EF4444", "#8B5CF6"][i % 4],
    }));
  const trendHtml =
    trendDatasets.length > 0
      ? `
    <div class="section">
      <h2>月間セッション数推移</h2>
      <p class="section-desc">過去12ヶ月のトラフィック推移</p>
      ${generateLineChartSvg(trendLabels, trendDatasets)}
    </div>
  `
      : "";

  // ===== セクション11: ソーシャルトラフィック内訳 =====
  const socialData = displayItems
    .filter((d) => presetMap[d.domain]?.socialBreakdown)
    .map((d) => {
      const sb = presetMap[d.domain]!.socialBreakdown;
      return {
        label: d.name,
        segments: [
          { name: "YouTube", value: sb.youtube, color: "#FF0000" },
          { name: "Facebook", value: sb.facebook, color: "#1877F2" },
          { name: "Twitter", value: sb.twitter, color: "#1DA1F2" },
          { name: "Instagram", value: sb.instagram, color: "#E4405F" },
          { name: "Reddit", value: sb.reddit, color: "#FF4500" },
          { name: "Other", value: sb.other, color: "#9CA3AF" },
        ].filter((s) => s.value > 0.5),
      };
    });
  const socialHtml =
    socialData.length > 0
      ? `
    <div class="section">
      <h2>ソーシャルトラフィック内訳</h2>
      <p class="section-desc">各サイトのSNS別トラフィックシェア</p>
      ${generateStackedBarSvg(socialData)}
    </div>
  `
      : "";

  // ===== セクション12: チャネル別トラフィック詳細テーブル =====
  const chRows = displayItems
    .filter((d) => d.channels)
    .map((d) => {
      const ch = d.channels!;
      return [
        `<span class="site-dot" style="background:${d.isOwn ? PRIMARY_COLOR : WARNING_COLOR}"></span> ${d.name}`,
        formatLargeNumber(ch.total),
        formatLargeNumber(ch.direct),
        formatLargeNumber(ch.organicSearch),
        formatLargeNumber(ch.paidSearch),
        formatLargeNumber(ch.referral),
        formatLargeNumber(ch.social),
        formatLargeNumber(ch.displayAds),
        formatLargeNumber(ch.email),
      ];
    });
  const channelTableHtml =
    chRows.length > 0
      ? `
    <div class="section">
      <h2>チャネル別トラフィック詳細</h2>
      ${buildHtmlTable(
        ["サイト名", "合計", "ダイレクト", "オーガニック", "有料検索", "リファラル", "ソーシャル", "ディスプレイ", "メール"],
        chRows,
        [1, 2, 3, 4, 5, 6, 7, 8]
      )}
    </div>
  `
      : "";

  // ===== セクション13: 流入キーワード分析 =====
  const kwSections = sites
    .map((site) => {
      const data = presetMap[site.domain];
      if (!data || data.keywords.length === 0) return "";
      const kwRows = data.keywords.slice(0, 10).map((kw) => [
        String(kw.rank),
        kw.keyword,
        String(kw.clicks),
        kw.sharePercent + "%",
        String(kw.searchVolume),
      ]);
      return `
        <div class="subsection">
          <h3><span class="site-dot" style="background:${site.isOwn ? PRIMARY_COLOR : WARNING_COLOR}"></span> ${data.site.name} - 流入キーワード Top10 <span class="text-muted">(総キーワード数: ${formatLargeNumber(data.totalKeywords)})</span></h3>
          ${buildHtmlTable(["順位", "キーワード", "クリック数", "シェア", "検索ボリューム"], kwRows, [0, 2, 3, 4])}
        </div>
      `;
    })
    .filter(Boolean)
    .join("");
  const kwHtml = kwSections
    ? `
    <div class="section">
      <h2>流入キーワード分析</h2>
      ${kwSections}
    </div>
  `
    : "";

  // ===== 全体HTML =====
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ダッシュボード レポート - ${now}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif;
    padding: 32px;
    color: #1a1a1a;
    font-size: 12px;
    background: #ffffff;
    max-width: 900px;
    margin: 0 auto;
  }
  .header {
    text-align: center;
    margin-bottom: 32px;
    padding-bottom: 20px;
    border-bottom: 3px solid ${PRIMARY_COLOR};
  }
  .header h1 {
    font-size: 24px;
    color: ${PRIMARY_COLOR};
    margin-bottom: 4px;
  }
  .header .subtitle {
    color: #6b7280;
    font-size: 13px;
  }
  .stats-row {
    display: flex;
    gap: 16px;
    margin-bottom: 28px;
  }
  .stat-card {
    flex: 1;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 16px;
    text-align: center;
  }
  .stat-label {
    font-size: 11px;
    color: #6b7280;
    margin-bottom: 4px;
  }
  .stat-value {
    font-size: 28px;
    font-weight: 700;
    color: #1a1a1a;
  }
  .section {
    margin-bottom: 32px;
    page-break-inside: avoid;
  }
  .subsection {
    margin-bottom: 20px;
    padding-left: 8px;
    border-left: 3px solid #e5e7eb;
  }
  h2 {
    font-size: 16px;
    color: ${PRIMARY_COLOR};
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 2px solid ${PRIMARY_COLOR};
  }
  h3 {
    font-size: 13px;
    color: #374151;
    margin-bottom: 10px;
  }
  .section-desc {
    font-size: 11px;
    color: #6b7280;
    margin-bottom: 12px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
    font-size: 11px;
  }
  th {
    background: ${PRIMARY_COLOR};
    color: white;
    padding: 8px 10px;
    text-align: left;
    font-size: 11px;
    white-space: nowrap;
  }
  td {
    padding: 7px 10px;
    border-bottom: 1px solid #e5e7eb;
    font-size: 11px;
  }
  tr:nth-child(even) { background: #f9fafb; }
  tr:hover { background: #f0f4ff; }
  .text-right { text-align: right; }
  .text-muted { color: #6b7280; font-weight: normal; font-size: 11px; }
  .site-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 6px;
    vertical-align: middle;
  }
  .live-badge {
    display: inline-block;
    background: #dcfce7;
    color: #16a34a;
    font-size: 9px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 10px;
    margin-left: 4px;
    vertical-align: middle;
  }
  .chart-center {
    text-align: center;
    margin: 12px 0;
    overflow-x: auto;
  }
  .chart-center svg {
    max-width: 100%;
    height: auto;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
    margin-top: 8px;
    font-size: 11px;
    color: #6b7280;
  }
  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .legend-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 3px;
  }
  .footer {
    margin-top: 40px;
    text-align: center;
    color: #9ca3af;
    font-size: 10px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
  }
  @media print {
    body { padding: 16px; max-width: none; }
    .section { page-break-inside: avoid; }
    .stats-row { page-break-inside: avoid; }
    tr:hover { background: inherit; }
  }
</style>
</head>
<body>
  <div class="header">
    <h1>ダッシュボード レポート</h1>
    <p class="subtitle">作成日: ${now} | 対象: ${sites.length}サイト（自社${ownCount} + 競合${compCount}）</p>
  </div>

  ${quickStatsHtml}
  ${accessShareHtml}
  ${engTableHtml}
  ${trafficBarHtml}
  ${channelOverviewHtml}
  ${searchTrafficHtml}
  ${ratioHtml}
  ${channelShareHtml}
  ${displayAdHtml}
  ${trendHtml}
  ${socialHtml}
  ${channelTableHtml}
  ${kwHtml}

  <div class="footer">
    <p>競合分析アプリ - ダッシュボード自動生成レポート</p>
    <p>このレポートはブラウザの印刷機能（Ctrl+P / Cmd+P）でPDFとして保存できます</p>
  </div>
</body>
</html>`;
}

// ===== エクスポート関数 =====

export async function exportDashboardHtml(
  sites: DashboardSite[],
  displayData: Record<string, DisplayDataItem>,
  presetMap: Record<string, PresetSiteData>,
  liveDataMap: Record<string, LiveSiteData>
): Promise<void> {
  const content = generateDashboardHtml(sites, displayData, presetMap, liveDataMap);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `dashboard_report_${dateStr}.html`;

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
