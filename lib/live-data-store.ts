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
  if (apiData.totalVisits || apiData.bounceRate || apiData.uniqueVisitors || apiData.avgVisitDuration || apiData.pagesPerVisit) {
    // SimilarWeb visits: { visits: [{date, value}] } or { data: [{date, value}] }
    const visitsArr = apiData.totalVisits?.visits || apiData.totalVisits?.data || [];
    const sessions = visitsArr.length > 0
      ? visitsArr.reduce((sum: number, v: any) => sum + (v.value || 0), 0) / visitsArr.length
      : 0;

    // SimilarWeb bounce_rate: { bounce_rate: [{date, value}] } or { data: [{date, value}] }
    const bounceArr = apiData.bounceRate?.bounce_rate || apiData.bounceRate?.data || [];
    const bounceRate = bounceArr.length > 0
      ? bounceArr.reduce((sum: number, v: any) => sum + (v.value || 0), 0) / bounceArr.length
      : 0;

    // SimilarWeb unique_visitors: { unique_visitors: [{date, value}] } or { data: [{date, value}] }
    const uvArr = apiData.uniqueVisitors?.unique_visitors || apiData.uniqueVisitors?.data || [];
    const uniqueVisitors = uvArr.length > 0
      ? uvArr.reduce((sum: number, v: any) => sum + (v.value || 0), 0) / uvArr.length
      : 0;

    // SimilarWeb avg_visit_duration: { average_visit_duration: [{date, value}] } or { data: [{date, value}] }
    const durationArr = apiData.avgVisitDuration?.average_visit_duration
      || apiData.avgVisitDuration?.avg_visit_duration
      || apiData.avgVisitDuration?.data || [];
    const avgDurationSec = durationArr.length > 0
      ? Math.round(durationArr.reduce((sum: number, v: any) => sum + (v.value || 0), 0) / durationArr.length)
      : 0;

    // SimilarWeb pages_per_visit: { pages_per_visit: [{date, value}] } or { data: [{date, value}] }
    const ppvArr = apiData.pagesPerVisit?.pages_per_visit
      || apiData.pagesPerVisit?.data || [];
    const avgPV = ppvArr.length > 0
      ? ppvArr.reduce((sum: number, v: any) => sum + (v.value || 0), 0) / ppvArr.length
      : 0;

    const roundedSessions = Math.round(sessions);
    const roundedUV = Math.round(uniqueVisitors);
    const roundedPV = Math.round(avgPV * 10) / 10;

    // engagementはセッション数が0でも、直帰率・滞在時間・PVのどれかがあれば設定する
    const hasAnyData = roundedSessions > 0 || bounceRate > 0 || avgDurationSec > 0 || roundedPV > 0;
    if (hasAnyData) {
      result.engagement = {
        monthlySessions: roundedSessions,
        monthlyUniqueVisitors: roundedUV,
        avgDurationSeconds: avgDurationSec,
        avgDuration: formatDuration(avgDurationSec),
        avgPageViews: roundedPV,
        bounceRate,
        totalPageViews: Math.round(roundedSessions * (roundedPV || 1)),
      };
    }
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
