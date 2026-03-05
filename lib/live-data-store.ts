import AsyncStorage from "@react-native-async-storage/async-storage";

const LIVE_DATA_PREFIX = "live_data_";

export interface LiveSiteData {
  domain: string;
  updatedAt: string;
  engagement: {
    monthlySessions: number;
    monthlyUniqueVisitors: number;
    avgDurationSeconds: number;
    avgDuration: string;
    avgPageViews: number;
    bounceRate: number;
    totalPageViews: number;
    visitsPerUniqueVisitor?: number;
    deduplicatedAudience?: number;
  } | null;
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
  keywords: {
    keyword: string;
    position: number;
    searchVolume: number;
    cpc: number;
    traffic: number;
  }[];
  pageSpeed: {
    performanceScore: number;
    metrics: Record<string, string>;
  } | null;
  globalRank: number | null;
  errors?: string[];
  // SimilarWebデータなしの場合にDataForSEO ETVから推定したトラフィック
  estimatedSessions?: number;
  estimatedUniqueVisitors?: number;
  isEstimated?: boolean;
}

function getKey(domain: string): string {
  return `${LIVE_DATA_PREFIX}${domain}`;
}

export async function getLiveData(domain: string): Promise<LiveSiteData | null> {
  try {
    const raw = await AsyncStorage.getItem(getKey(domain));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveLiveData(data: LiveSiteData): Promise<void> {
  await AsyncStorage.setItem(getKey(data.domain), JSON.stringify(data));
}

export async function removeLiveData(domain: string): Promise<void> {
  await AsyncStorage.removeItem(getKey(domain));
}

export async function getAllLiveData(): Promise<Record<string, LiveSiteData>> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const liveKeys = keys.filter((k) => k.startsWith(LIVE_DATA_PREFIX));
    if (liveKeys.length === 0) return {};
    const pairs = await AsyncStorage.multiGet(liveKeys);
    const result: Record<string, LiveSiteData> = {};
    for (const [key, value] of pairs) {
      if (value) {
        const data = JSON.parse(value) as LiveSiteData;
        result[data.domain] = data;
      }
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * APIレスポンスからLiveSiteDataに変換
 */
export function parseApiResponse(domain: string, apiData: any, updatedAt: string): LiveSiteData {
  const result: LiveSiteData = {
    domain,
    updatedAt,
    engagement: null,
    channels: null,
    keywords: [],
    pageSpeed: null,
    globalRank: null,
    errors: apiData.errors,
  };

  // Parse traffic sources -> channels
  if (apiData.trafficSources) {
    try {
      const sources = apiData.trafficSources;
      // SimilarWeb traffic sources format varies, extract what we can
      const visits = sources?.visits || {};
      result.channels = {
        total: 0,
        direct: visits?.direct || 0,
        organicSearch: visits?.search_organic || 0,
        paidSearch: visits?.search_paid || 0,
        referral: visits?.referral || 0,
        displayAds: visits?.display_ad || 0,
        social: visits?.social || 0,
        email: visits?.mail || 0,
      };
      result.channels.total = Object.values(result.channels).reduce(
        (sum, v) => sum + (typeof v === "number" ? v : 0),
        0
      ) - result.channels.total; // subtract the total itself
    } catch {}
  }

  // Parse total visits -> engagement sessions
  if (apiData.totalVisits || apiData.bounceRate || apiData.uniqueVisitors) {
    const sessions = apiData.totalVisits?.visits?.[0]?.value || 0;
    const bounceRate = apiData.bounceRate?.bounce_rate?.[0]?.value || 0;
    const uniqueVisitors = apiData.uniqueVisitors?.unique_visitors?.[0]?.value || 0;
    const avgDurationSec = Math.round(sessions > 0 ? 120 : 0); // default estimate
    const avgPV = sessions > 0 ? 2.5 : 0; // default estimate

    result.engagement = {
      monthlySessions: sessions,
      monthlyUniqueVisitors: uniqueVisitors,
      avgDurationSeconds: avgDurationSec,
      avgDuration: formatDuration(avgDurationSec),
      avgPageViews: avgPV,
      bounceRate,
      totalPageViews: Math.round(sessions * avgPV),
    };
  }

  // Parse global rank
  if (apiData.globalRank) {
    result.globalRank = apiData.globalRank?.global_rank?.[0]?.value || null;
  }

  // Parse keywords from DataForSEO
  if (apiData.keywords) {
    try {
      const tasks = apiData.keywords?.tasks || [];
      const items = tasks[0]?.result?.[0]?.items || [];
      result.keywords = items.map((item: any) => ({
        keyword: item.keyword_data?.keyword || "",
        position: item.ranked_serp_element?.serp_item?.rank_absolute || 0,
        searchVolume: item.keyword_data?.keyword_info?.search_volume || 0,
        cpc: item.keyword_data?.keyword_info?.cpc || 0,
        traffic: item.ranked_serp_element?.serp_item?.etv || 0,
      }));
    } catch {}
  }

  // SimilarWebデータがなく、DataForSEOのETVがある場合は推定トラフィックを計算
  if (!result.engagement && result.keywords.length > 0) {
    // ETV（推定トラフィック値）の合計をセッション数の推定値として使用
    // DataForSEOのETVはオーガニック検索からの月間推定トラフィック数
    // 全キーワードのETV合計は取得キーワードの一部のみなので、実際のセッション数はこれより大きい側面が多い
    // 係数は経験則で設定（取得キーワード数に応じて増幅）
    const totalEtv = result.keywords.reduce((sum, kw) => sum + (kw.traffic || 0), 0);
    if (totalEtv > 0) {
      // 取得キーワード数に応じた増幅係数（上位20キーワードのみの場合、全体の約20-30%をカバーする假定）
      const expansionFactor = 4.5;
      const estimatedSessions = Math.round(totalEtv * expansionFactor);
      const estimatedUniqueVisitors = Math.round(estimatedSessions * 0.78);
      result.estimatedSessions = estimatedSessions;
      result.estimatedUniqueVisitors = estimatedUniqueVisitors;
      result.isEstimated = true;
    }
  }

  // Parse PageSpeed
  if (apiData.pageSpeed) {
    result.pageSpeed = apiData.pageSpeed;
  }

  return result;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
