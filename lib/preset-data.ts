/**
 * PDFレポート「0210_競合レポート」のプリセットデータ
 * 5社の補助金関連サイトの分析データ
 */

export interface PresetSite {
  domain: string;
  name: string;
  isOwn: boolean;
}

export interface PresetEngagement {
  monthlySessions: number;
  monthlyUniqueVisitors: number;
  visitsPerUniqueVisitor: number;
  deduplicatedAudience: number;
  avgDuration: string; // "MM:SS"
  avgDurationSeconds: number;
  avgPageViews: number;
  bounceRate: number; // 0-1
  totalPageViews: number;
}

export interface PresetChannel {
  total: number;
  direct: number;
  organicSearch: number;
  paidSearch: number;
  referral: number;
  displayAds: number;
  social: number;
  email: number;
}

export interface PresetSearchTraffic {
  total: number;
  organicPercent: number;
  paidPercent: number;
}

export interface PresetKeyword {
  rank: number;
  keyword: string;
  clicks: number;
  sharePercent: number;
  searchVolume: number | string; // string for "<50"
}

export interface PresetDisplayAdNetwork {
  name: string;
  share: number; // percentage
}

export interface PresetSocialBreakdown {
  youtube: number;
  facebook: number;
  twitter: number;
  reddit: number;
  instagram: number;
  other: number;
}

export interface PresetSiteData {
  site: PresetSite;
  engagement: PresetEngagement;
  channels: PresetChannel;
  searchTraffic: PresetSearchTraffic;
  displayAds: number;
  displayAdNetworks: PresetDisplayAdNetwork[];
  socialTraffic: number;
  socialBreakdown: PresetSocialBreakdown;
  keywords: PresetKeyword[];
  totalKeywords: number;
  accessShare: number; // percentage
  monthlyTraffic12m: number; // Feb2024-Jan2025 total
  monthlySessionsTrend: number[]; // 12ヶ月分のセッション数推移
}

// 5社のプリセットサイト
export const PRESET_SITES: PresetSite[] = [
  { domain: "hojyokin-portal.jp", name: "補助金ポータル", isOwn: true },
  { domain: "hojyokin-concierge.com", name: "みんなの補助金コンシェルジュ", isOwn: false },
  { domain: "hojokin-office.essencimo.co.jp", name: "補助金オフィス", isOwn: false },
  { domain: "hojyokin-migiude.info", name: "補助金の右腕", isOwn: false },
  { domain: "hojokin-shinsei.co.jp", name: "補助金申請プロサポート", isOwn: false },
];

export const PRESET_DATA: Record<string, PresetSiteData> = {
  "hojyokin-portal.jp": {
    site: PRESET_SITES[0],
    engagement: {
      monthlySessions: 211757,
      monthlyUniqueVisitors: 154592,
      visitsPerUniqueVisitor: 1.37,
      deduplicatedAudience: 138554,
      avgDuration: "02:13",
      avgDurationSeconds: 133,
      avgPageViews: 2.86,
      bounceRate: 0.5211,
      totalPageViews: 606006,
    },
    channels: {
      total: 2541000,
      direct: 380000,
      organicSearch: 1100000,
      paidSearch: 1100,
      referral: 850000,
      displayAds: 8,
      social: 757,
      email: 209135,
    },
    searchTraffic: {
      total: 1100000,
      organicPercent: 99.9,
      paidPercent: 0.1,
    },
    displayAds: 8,
    displayAdNetworks: [
      { name: "Google Display", share: 45.2 },
      { name: "Yahoo Display", share: 28.1 },
      { name: "Criteo", share: 12.5 },
      { name: "MicroAd", share: 8.3 },
      { name: "Other", share: 5.9 },
    ],
    socialTraffic: 757,
    socialBreakdown: { youtube: 35.2, facebook: 28.1, twitter: 22.4, reddit: 2.1, instagram: 5.8, other: 6.4 },
    monthlySessionsTrend: [185000, 192000, 205000, 198000, 210000, 215000, 208000, 220000, 225000, 218000, 211757, 205000],
    keywords: [
      { rank: 1, keyword: "補助金ポータル", clicks: 50300, sharePercent: 7.24, searchVolume: 55700 },
      { rank: 2, keyword: "補助金 助成金 一覧", clicks: 12600, sharePercent: 1.82, searchVolume: 2800 },
      { rank: 3, keyword: "補助金", clicks: 11800, sharePercent: 1.69, searchVolume: 255700 },
      { rank: 4, keyword: "助成金", clicks: 7500, sharePercent: 1.07, searchVolume: 135300 },
      { rank: 5, keyword: "観光庁 補助金", clicks: 6000, sharePercent: 0.87, searchVolume: 34100 },
      { rank: 6, keyword: "人材開発支援助成金", clicks: 5000, sharePercent: 0.72, searchVolume: 242400 },
      { rank: 7, keyword: "補助金 一覧", clicks: 3600, sharePercent: 0.52, searchVolume: 7500 },
      { rank: 8, keyword: "補助金 検索", clicks: 3300, sharePercent: 0.48, searchVolume: 6700 },
      { rank: 9, keyword: "キャリアアップ助成金 2024", clicks: 3200, sharePercent: 0.47, searchVolume: 100 },
      { rank: 10, keyword: "ものづくり補助金", clicks: 3000, sharePercent: 0.44, searchVolume: 446600 },
    ],
    totalKeywords: 59679,
    accessShare: 50.65,
    monthlyTraffic12m: 581058,
  },
  "hojyokin-concierge.com": {
    site: PRESET_SITES[1],
    engagement: {
      monthlySessions: 184886,
      monthlyUniqueVisitors: 136833,
      visitsPerUniqueVisitor: 1.35,
      deduplicatedAudience: 120358,
      avgDuration: "01:03",
      avgDurationSeconds: 63,
      avgPageViews: 1.36,
      bounceRate: 0.8064,
      totalPageViews: 252139,
    },
    channels: {
      total: 2218000,
      direct: 180000,
      organicSearch: 478900,
      paidSearch: 5300,
      referral: 1400000,
      displayAds: 350,
      social: 325,
      email: 153125,
    },
    searchTraffic: {
      total: 478900,
      organicPercent: 98.9,
      paidPercent: 1.1,
    },
    displayAds: 350,
    displayAdNetworks: [
      { name: "Google Display", share: 52.3 },
      { name: "Yahoo Display", share: 22.7 },
      { name: "Criteo", share: 10.8 },
      { name: "i-mobile", share: 8.5 },
      { name: "Other", share: 5.7 },
    ],
    socialTraffic: 325,
    socialBreakdown: { youtube: 42.1, facebook: 22.5, twitter: 18.3, reddit: 1.5, instagram: 8.2, other: 7.4 },
    monthlySessionsTrend: [160000, 168000, 175000, 180000, 185000, 190000, 188000, 192000, 195000, 190000, 184886, 178000],
    keywords: [
      { rank: 1, keyword: "給付金 2024", clicks: 7800, sharePercent: 2.52, searchVolume: 50300 },
      { rank: 2, keyword: "電動自転車 補助金", clicks: 6700, sharePercent: 2.18, searchVolume: 32700 },
      { rank: 3, keyword: "電動アシスト自転車 補助金", clicks: 4400, sharePercent: 1.44, searchVolume: 13700 },
      { rank: 4, keyword: "ものづくり補助金 2025", clicks: 3800, sharePercent: 1.23, searchVolume: 20100 },
      { rank: 5, keyword: "小規模事業者持続化補助金 2025", clicks: 3700, sharePercent: 1.20, searchVolume: 9700 },
      { rank: 6, keyword: "補助金 2025", clicks: 3500, sharePercent: 1.13, searchVolume: 15000 },
      { rank: 7, keyword: "省エネ補助金", clicks: 3200, sharePercent: 1.03, searchVolume: 8500 },
      { rank: 8, keyword: "IT導入補助金 2025", clicks: 3000, sharePercent: 0.97, searchVolume: 12000 },
      { rank: 9, keyword: "事業再構築補助金", clicks: 2800, sharePercent: 0.90, searchVolume: 45000 },
      { rank: 10, keyword: "補助金コンシェルジュ", clicks: 2500, sharePercent: 0.81, searchVolume: 3200 },
    ],
    totalKeywords: 20512,
    accessShare: 44.22,
    monthlyTraffic12m: 543398,
  },
  "hojokin-office.essencimo.co.jp": {
    site: PRESET_SITES[2],
    engagement: {
      monthlySessions: 8152,
      monthlyUniqueVisitors: 5331,
      visitsPerUniqueVisitor: 1.53,
      deduplicatedAudience: 5100,
      avgDuration: "01:42",
      avgDurationSeconds: 102,
      avgPageViews: 1.56,
      bounceRate: 0.7427,
      totalPageViews: 12742,
    },
    channels: {
      total: 97828,
      direct: 12000,
      organicSearch: 55300,
      paidSearch: 0,
      referral: 28000,
      displayAds: 585,
      social: 325,
      email: 1618,
    },
    searchTraffic: {
      total: 55300,
      organicPercent: 100,
      paidPercent: 0,
    },
    displayAds: 585,
    displayAdNetworks: [
      { name: "Google Display", share: 60.1 },
      { name: "Yahoo Display", share: 18.5 },
      { name: "MicroAd", share: 11.2 },
      { name: "Criteo", share: 6.8 },
      { name: "Other", share: 3.4 },
    ],
    socialTraffic: 325,
    socialBreakdown: { youtube: 30.5, facebook: 35.2, twitter: 15.8, reddit: 3.2, instagram: 7.1, other: 8.2 },
    monthlySessionsTrend: [6500, 7000, 7200, 7500, 7800, 8000, 8100, 8300, 8500, 8200, 8152, 7900],
    keywords: [
      { rank: 1, keyword: "小規模事業者持続化補助金 16回", clicks: 1600, sharePercent: 3.35, searchVolume: 27000 },
      { rank: 2, keyword: "essencimo", clicks: 1300, sharePercent: 2.68, searchVolume: 3200 },
      { rank: 3, keyword: "株式会社essencimo", clicks: 1000, sharePercent: 2.14, searchVolume: 2300 },
      { rank: 4, keyword: "経済産業省 補助金 2024", clicks: 930, sharePercent: 1.99, searchVolume: 460 },
      { rank: 5, keyword: "中小企業省力化投資補助事業", clicks: 860, sharePercent: 1.84, searchVolume: 23900 },
      { rank: 6, keyword: "経済産業省 補助金 一覧 2024", clicks: 790, sharePercent: 1.69, searchVolume: 1800 },
      { rank: 7, keyword: "補助金オフィス", clicks: 530, sharePercent: 1.14, searchVolume: 490 },
      { rank: 8, keyword: "補助金で買った機械は売れる？", clicks: 490, sharePercent: 1.05, searchVolume: "<50" },
      { rank: 9, keyword: "事業再構築補助金 返還 事例", clicks: 450, sharePercent: 0.97, searchVolume: 560 },
      { rank: 10, keyword: "補助金 2024 中小企業", clicks: 450, sharePercent: 0.97, searchVolume: "<50" },
    ],
    totalKeywords: 5253,
    accessShare: 1.95,
    monthlyTraffic12m: 23043,
  },
  "hojyokin-migiude.info": {
    site: PRESET_SITES[3],
    engagement: {
      monthlySessions: 11153,
      monthlyUniqueVisitors: 6646,
      visitsPerUniqueVisitor: 1.68,
      deduplicatedAudience: 5839,
      avgDuration: "01:40",
      avgDurationSeconds: 100,
      avgPageViews: 1.43,
      bounceRate: 0.6802,
      totalPageViews: 15942,
    },
    channels: {
      total: 133831,
      direct: 15000,
      organicSearch: 50900,
      paidSearch: 0,
      referral: 60000,
      displayAds: 430,
      social: 166,
      email: 7335,
    },
    searchTraffic: {
      total: 50900,
      organicPercent: 100,
      paidPercent: 0,
    },
    displayAds: 430,
    displayAdNetworks: [
      { name: "Google Display", share: 55.0 },
      { name: "Yahoo Display", share: 25.3 },
      { name: "Criteo", share: 9.5 },
      { name: "i-mobile", share: 6.2 },
      { name: "Other", share: 4.0 },
    ],
    socialTraffic: 166,
    socialBreakdown: { youtube: 25.8, facebook: 30.5, twitter: 20.2, reddit: 5.1, instagram: 10.2, other: 8.2 },
    monthlySessionsTrend: [9000, 9500, 10000, 10200, 10500, 10800, 11000, 11200, 11500, 11300, 11153, 10800],
    keywords: [
      { rank: 1, keyword: "小規模事業者持続化補助金 17回", clicks: 7300, sharePercent: 15.78, searchVolume: 64000 },
      { rank: 2, keyword: "ものづくり補助金 19次", clicks: 3400, sharePercent: 7.40, searchVolume: 37200 },
      { rank: 3, keyword: "小規模事業者持続化補助金 16回", clicks: 2100, sharePercent: 4.55, searchVolume: 36700 },
      { rank: 4, keyword: "持続化補助金 17回", clicks: 1600, sharePercent: 3.55, searchVolume: 10000 },
      { rank: 5, keyword: "小規模17回", clicks: 900, sharePercent: 1.96, searchVolume: 6200 },
      { rank: 6, keyword: "小規模事業者持続化補助金", clicks: 890, sharePercent: 1.94, searchVolume: 279200 },
      { rank: 7, keyword: "小規模事業者持続化補助金 2025", clicks: 650, sharePercent: 1.42, searchVolume: 9800 },
      { rank: 8, keyword: "新宿区 経営力強化支援事業補助金", clicks: 450, sharePercent: 0.98, searchVolume: 24500 },
      { rank: 9, keyword: "小規模事業者持続化補助金 18回", clicks: 360, sharePercent: 0.78, searchVolume: 1800 },
      { rank: 10, keyword: "持続化補助金 16回", clicks: 330, sharePercent: 0.72, searchVolume: 8400 },
    ],
    totalKeywords: 3518,
    accessShare: 2.67,
    monthlyTraffic12m: 25996,
  },
  "hojokin-shinsei.co.jp": {
    site: PRESET_SITES[4],
    engagement: {
      monthlySessions: 2157,
      monthlyUniqueVisitors: 1234,
      visitsPerUniqueVisitor: 1.75,
      deduplicatedAudience: 1062,
      avgDuration: "00:48",
      avgDurationSeconds: 48,
      avgPageViews: 1.57,
      bounceRate: 0.5267,
      totalPageViews: 3384,
    },
    channels: {
      total: 24272,
      direct: 5000,
      organicSearch: 6900,
      paidSearch: 0,
      referral: 10000,
      displayAds: 79,
      social: 134,
      email: 2159,
    },
    searchTraffic: {
      total: 6900,
      organicPercent: 100,
      paidPercent: 0,
    },
    displayAds: 79,
    displayAdNetworks: [
      { name: "Google Display", share: 65.3 },
      { name: "Yahoo Display", share: 20.1 },
      { name: "MicroAd", share: 8.2 },
      { name: "Criteo", share: 4.1 },
      { name: "Other", share: 2.3 },
    ],
    socialTraffic: 134,
    socialBreakdown: { youtube: 20.5, facebook: 40.2, twitter: 18.5, reddit: 2.8, instagram: 12.0, other: 6.0 },
    monthlySessionsTrend: [1800, 1900, 2000, 2050, 2100, 2150, 2200, 2180, 2160, 2170, 2157, 2100],
    keywords: [
      { rank: 1, keyword: "実現性", clicks: 160, sharePercent: 3.00, searchVolume: 7800 },
      { rank: 2, keyword: "マスターファイル it導入補助金", clicks: 150, sharePercent: 2.81, searchVolume: 210 },
      { rank: 3, keyword: "it導入補助金 2024 却下", clicks: 150, sharePercent: 2.81, searchVolume: "<50" },
      { rank: 4, keyword: "ものづくり助成金 給与", clicks: 140, sharePercent: 2.62, searchVolume: "<50" },
      { rank: 5, keyword: "人件費 給与支給総額 it補助金", clicks: 140, sharePercent: 2.62, searchVolume: "<50" },
      { rank: 6, keyword: "事業計画書 10ページ超える", clicks: 110, sharePercent: 2.06, searchVolume: 110 },
      { rank: 7, keyword: "it導入補助金マスターファイルとは何ですか", clicks: 110, sharePercent: 2.06, searchVolume: 120 },
      { rank: 8, keyword: "it導入補助金 不採択 理由は聞けるか", clicks: 110, sharePercent: 2.06, searchVolume: 110 },
      { rank: 9, keyword: "ものづくり補助金 事業計画書 ページ数", clicks: 110, sharePercent: 2.06, searchVolume: "<50" },
      { rank: 10, keyword: "ものづくり補助金 人件費", clicks: 100, sharePercent: 1.87, searchVolume: 860 },
    ],
    totalKeywords: 619,
    accessShare: 0.52,
    monthlyTraffic12m: 5963,
  },
};

// ヘルパー関数
export function getPresetData(domain: string): PresetSiteData | null {
  return PRESET_DATA[domain] || null;
}

export function getAllPresetSites(): PresetSite[] {
  return PRESET_SITES;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatLargeNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}
