/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

// 競合サイトデータ型
export interface CompetitorSite {
  id: string;
  domain: string;
  name: string;
  isOwn: boolean;
  addedAt: string;
}

// トラフィックデータ
export interface TrafficData {
  date: string;
  visits: number;
}

// エンゲージメント指標
export interface EngagementMetrics {
  totalVisits: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgVisitDuration: number;
  pagesPerVisit: number;
  pageViews: number;
}

// チャネル別トラフィック
export interface ChannelTraffic {
  direct: number;
  organicSearch: number;
  paidSearch: number;
  referral: number;
  displayAds: number;
  social: number;
  email: number;
}

// PageSpeed指標
export interface PageSpeedData {
  performanceScore: number;
  metrics: {
    fcp: string;
    lcp: string;
    tbt: string;
    cls: string;
    si: string;
  };
}

// キーワードデータ
export interface KeywordData {
  keyword: string;
  position: number;
  searchVolume: number;
  cpc: number;
  traffic: number;
}

// サイト分析結果
export interface SiteAnalysis {
  domain: string;
  engagement: EngagementMetrics;
  channels: ChannelTraffic;
  trafficHistory: TrafficData[];
  pageSpeed: PageSpeedData | null;
  keywords: KeywordData[];
  globalRank: number | null;
  lastUpdated: string;
}
