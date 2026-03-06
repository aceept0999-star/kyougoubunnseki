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
  // SimilarWeb totalVisits: { visits: [{date, visits}] }
  // SimilarWeb bounceRate: { bounce_rate: [{date, bounce_rate}] }
  // SimilarWeb uniqueVisitors: { data: [{date, dedup_data: {total_deduplicated_audience}}] }
  if (apiData.totalVisits || apiData.bounceRate || apiData.uniqueVisitors) {
    // totalVisits: visits配列の各要素は {date, visits} 形式
    const visitsArr: any[] = apiData.totalVisits?.visits || [];
    const sessions = visitsArr.length > 0
      ? visitsArr.reduce((sum: number, v: any) => sum + (v.visits || v.value || 0), 0) / visitsArr.length
      : 0;

    // bounceRate: bounce_rate配列の各要素は {date, bounce_rate} 形式
    const bounceArr: any[] = apiData.bounceRate?.bounce_rate || [];
    const bounceRate = bounceArr.length > 0
      ? bounceArr.reduce((sum: number, v: any) => sum + (v.bounce_rate ?? v.value ?? 0), 0) / bounceArr.length
      : 0;

    // uniqueVisitors: data配列の各要素は {date, dedup_data: {total_deduplicated_audience}} 形式
    const uvArr: any[] = apiData.uniqueVisitors?.data || [];
    const uniqueVisitors = uvArr.length > 0
      ? uvArr.reduce((sum: number, v: any) => {
          const val = v.dedup_data?.total_deduplicated_audience ?? v.unique_visitors ?? v.value ?? 0;
          return sum + val;
        }, 0) / uvArr.length
      : 0;

    // trafficSourcesからページ別訪問数（PV）を推定
    // SimilarWeb trafficSources: { visits: { domain: [{source_type, visits: [{date, organic, paid}]}] } }
    let avgPV = 0;
    let avgDurationSec = 0;
    if (apiData.trafficSources?.visits) {
      try {
        const domainData = Object.values(apiData.trafficSources.visits as Record<string, any[]>)[0] || [];
        let totalVisitsBySource = 0;
        let dateCount = 0;
        for (const source of domainData) {
          for (const dateEntry of (source.visits || [])) {
            totalVisitsBySource += (dateEntry.organic || 0) + (dateEntry.paid || 0);
            dateCount++;
          }
        }
        // PVは直接取得できないため、セッション数から推定（業界平均2-3PV/セッション）
        // 直帰率が高い場合はPVが低くなる傾向
        if (sessions > 0 && bounceRate > 0) {
          // 直帰率から推定: 直帰=1PV、非直帰=3PV平均
          avgPV = Math.round(((1 - bounceRate) * 3 + bounceRate * 1) * 10) / 10;
        } else if (sessions > 0) {
          avgPV = 2.5; // デフォルト推定
        }
        // 滞在時間も直帰率から推定（直帰率が高いほど短い）
        if (bounceRate > 0) {
          // 直帰率0%=5分、直帰率100%=30秒の線形補間
          avgDurationSec = Math.round((1 - bounceRate) * 300 + bounceRate * 30);
        }
      } catch {}
    }

    const roundedSessions = Math.round(sessions);
    const roundedUV = Math.round(uniqueVisitors);
    const roundedPV = avgPV;

    // engagementはセッション数または直帰率のどちらかがあれば設定する
    const hasAnyData = roundedSessions > 0 || bounceRate > 0;
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
