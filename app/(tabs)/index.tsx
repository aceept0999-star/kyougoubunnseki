import { useState, useCallback, useMemo, useEffect } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSites } from "@/lib/sites-context";
import { getPresetData, formatLargeNumber, type PresetSiteData } from "@/lib/preset-data";
import { BarChart, PieChart, HorizontalBar, StackedBarChart, RatioBarChart, LineChart, formatNumber } from "@/components/charts";
import { getApiBaseUrl } from "@/constants/oauth";
import { exportCsv, exportHtmlReport } from "@/lib/export-utils";
import { exportDashboardHtml } from "@/lib/dashboard-html-export";
import {
  getLiveData,
  saveLiveData,
  getAllLiveData,
  parseApiResponse,
  type LiveSiteData,
} from "@/lib/live-data-store";

interface DiscoveredCompetitor {
  domain: string;
  avgPosition: number;
  intersections: number;
  organicTraffic: number;
  organicKeywords: number;
  paidTraffic: number;
  selected: boolean;
}

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const { sites, loading, addSite, removeSite, refreshSites, resetAllSites } = useSites();
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newName, setNewName] = useState("");
  const [isOwn, setIsOwn] = useState(false);
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 競合自動検出用の状態
  const [showCompetitorModal, setShowCompetitorModal] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoveredCompetitors, setDiscoveredCompetitors] = useState<DiscoveredCompetitor[]>([]);
  const [addingCompetitors, setAddingCompetitors] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ライブデータ更新用の状態
  const [liveDataMap, setLiveDataMap] = useState<Record<string, LiveSiteData>>({});
  const [updatingDomains, setUpdatingDomains] = useState<Set<string>>(new Set());
  const [updateProgress, setUpdateProgress] = useState<{ current: number; total: number; domain: string } | null>(null);

  // 起動時にキャッシュされたライブデータを読み込み
  useEffect(() => {
    getAllLiveData().then(setLiveDataMap);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshSites();
    const freshLive = await getAllLiveData();
    setLiveDataMap(freshLive);
    setRefreshing(false);
  }, [refreshSites]);

  // 単一サイトのデータ更新
  const refreshSingleSite = async (domain: string) => {
    setUpdatingDomains((prev) => new Set(prev).add(domain));
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/api/trpc/analysis.refreshSiteData`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ json: { domain } }),
      });
      const json = await res.json();
      const result = json?.result?.data?.json;
      if (result?.success) {
        const parsed = parseApiResponse(domain, result.data, result.updatedAt);
        await saveLiveData(parsed);
        setLiveDataMap((prev) => ({ ...prev, [domain]: parsed }));
        return parsed;
      } else {
        throw new Error("API returned unsuccessful response");
      }
    } catch (e: any) {
      console.error(`Failed to refresh ${domain}:`, e);
      throw e;
    } finally {
      setUpdatingDomains((prev) => {
        const next = new Set(prev);
        next.delete(domain);
        return next;
      });
    }
  };

  // 全サイトのデータを一括更新
  const refreshAllSites = async () => {
    if (sites.length === 0) {
      Alert.alert("サイト未登録", "先にサイトを登録してください");
      return;
    }
    const total = sites.length;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < sites.length; i++) {
      const site = sites[i];
      setUpdateProgress({ current: i + 1, total, domain: site.domain });
      try {
        await refreshSingleSite(site.domain);
        successCount++;
      } catch {
        errorCount++;
      }
    }
    setUpdateProgress(null);

    if (errorCount === 0) {
      Alert.alert("更新完了", `${successCount}サイトのデータを更新しました`);
    } else {
      Alert.alert(
        "更新完了",
        `${successCount}サイト成功、${errorCount}サイト失敗\n一部のAPIでデータが取得できなかった可能性があります`
      );
    }
  };

  const discoverCompetitors = async (domain: string, existingSites: { domain: string }[]) => {
    setDiscovering(true);
    setShowCompetitorModal(true);
    setDiscoveredCompetitors([]);
    try {
      const apiUrl = getApiBaseUrl();
      const inputParam = encodeURIComponent(JSON.stringify({ json: { domain, limit: 10 } }));
      const res = await fetch(`${apiUrl}/api/trpc/analysis.getCompetitors?input=${inputParam}`, {
        credentials: "include",
      });
      const json = await res.json();
      const result = json?.result?.data?.json;
      if (result?.success && result.data?.competitors) {
        const existingDomains = new Set(existingSites.map((s) => s.domain));
        existingDomains.add(domain);
        const filtered = result.data.competitors
          .filter((c: any) => c.domain && !existingDomains.has(c.domain))
          .slice(0, 5)
          .map((c: any) => ({ ...c, selected: true }));
        setDiscoveredCompetitors(filtered);
      }
    } catch (e) {
      console.error("Competitor discovery error:", e);
    }
    setDiscovering(false);
  };

  const handleAddSite = async () => {
    if (!newDomain.trim()) {
      Alert.alert("エラー", "ドメインを入力してください");
      return;
    }
    setAdding(true);
    try {
      let domain = newDomain.trim().toLowerCase();
      domain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
      await addSite({ domain, name: newName.trim() || domain, isOwn });
      setNewDomain("");
      setNewName("");
      setShowAddModal(false);

      if (isOwn) {
        const currentCompetitors = sites.filter((s) => !s.isOwn);
        if (currentCompetitors.length === 0) {
          discoverCompetitors(domain, sites);
        }
      }
      setIsOwn(false);
    } catch (e) {
      Alert.alert("エラー", "サイトの追加に失敗しました");
    }
    setAdding(false);
  };

  const toggleCompetitorSelection = (index: number) => {
    setDiscoveredCompetitors((prev) =>
      prev.map((c, i) => (i === index ? { ...c, selected: !c.selected } : c))
    );
  };

  const handleAddDiscoveredCompetitors = async () => {
    const selected = discoveredCompetitors.filter((c) => c.selected);
    if (selected.length === 0) {
      Alert.alert("選択してください", "少なくとも1つの競合サイトを選択してください");
      return;
    }
    setAddingCompetitors(true);
    try {
      for (const comp of selected) {
        await addSite({ domain: comp.domain, name: comp.domain, isOwn: false });
      }
      setShowCompetitorModal(false);
      setDiscoveredCompetitors([]);
    } catch (e) {
      Alert.alert("エラー", "競合サイトの追加に失敗しました");
    }
    setAddingCompetitors(false);
  };

  const handleManualDiscover = () => {
    const ownSite = sites.find((s) => s.isOwn);
    if (!ownSite) {
      Alert.alert("自社サイト未登録", "先に自社サイトを登録してください");
      return;
    }
    discoverCompetitors(ownSite.domain, sites);
  };

  const handleRemoveSite = (id: string, name: string) => {
    Alert.alert("確認", `「${name}」を削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      { text: "削除", style: "destructive", onPress: () => removeSite(id) },
    ]);
  };

  const ownSites = sites.filter((s) => s.isOwn);
  const competitorSites = sites.filter((s) => !s.isOwn);

  // プリセットデータとライブデータを統合
  const presetMap = useMemo(() => {
    const map: Record<string, PresetSiteData> = {};
    for (const site of sites) {
      const data = getPresetData(site.domain);
      if (data) map[site.domain] = data;
    }
    return map;
  }, [sites]);

  // 表示用のデータ: ライブデータがあればそちらを優先
  const displayData = useMemo(() => {
    const map: Record<string, {
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
      channels: { total: number; direct: number; organicSearch: number; paidSearch: number; referral: number; displayAds: number; social: number; email: number } | null;
      updatedAt: string | null;
      isLive: boolean;
      isEstimated: boolean;
    }> = {};

    for (const site of sites) {
      const live = liveDataMap[site.domain];
      const preset = presetMap[site.domain];

      if (live?.engagement) {
        map[site.domain] = {
          name: site.name,
          domain: site.domain,
          isOwn: site.isOwn,
          sessions: live.engagement.monthlySessions,
          uniqueVisitors: live.engagement.monthlyUniqueVisitors,
          duration: live.engagement.avgDuration,
          pageViews: live.engagement.avgPageViews,
          bounceRate: live.engagement.bounceRate,
          totalPageViews: live.engagement.totalPageViews,
          accessShare: 0,
          channels: live.channels,
          updatedAt: live.updatedAt,
          isLive: true,
          isEstimated: false,
        };
      } else if (live?.estimatedSessions) {
        // SimilarWebデータなし・DataForSEO ETVから推定
        map[site.domain] = {
          name: site.name,
          domain: site.domain,
          isOwn: site.isOwn,
          sessions: live.estimatedSessions,
          uniqueVisitors: live.estimatedUniqueVisitors ?? Math.round(live.estimatedSessions * 0.75),
          duration: "--:--",
          pageViews: 0,
          bounceRate: 0,
          totalPageViews: 0,
          accessShare: 0,
          channels: live.channels,
          updatedAt: live.updatedAt,
          isLive: true,
          isEstimated: true,
        };
      } else if (preset) {
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
          isEstimated: false,
        };
      } else {
        // プリセットもライブデータもない場合でも登録サイトとして表示
        map[site.domain] = {
          name: site.name,
          domain: site.domain,
          isOwn: site.isOwn,
          sessions: 0,
          uniqueVisitors: 0,
          duration: "--:--",
          pageViews: 0,
          bounceRate: 0,
          totalPageViews: 0,
          accessShare: 0,
          channels: null,
          updatedAt: null,
          isLive: false,
          isEstimated: false,
        };
      }
    }

    // ライブデータのアクセスシェアを計算
    const totalSessions = Object.values(map).reduce((sum, d) => sum + d.sessions, 0);
    if (totalSessions > 0) {
      for (const d of Object.values(map)) {
        if (d.isLive) {
          d.accessShare = Math.round((d.sessions / totalSessions) * 10000) / 100;
        }
      }
    }

    return map;
  }, [sites, presetMap, liveDataMap]);

  const hasDisplayData = Object.keys(displayData).length > 0;

  // アクセスシェアデータ
  const accessShareData = useMemo(() => {
    return Object.values(displayData)
      .filter((d) => d.accessShare > 0)
      .map((d) => ({ label: d.name, value: d.accessShare }));
  }, [displayData]);

  // エンゲージメントサマリー
  const engagementRows = useMemo(() => {
    return Object.values(displayData);
  }, [displayData]);

  const isAnyUpdating = updatingDomains.size > 0;

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-2xl font-bold text-foreground">競合分析</Text>
          <Text className="text-sm text-muted mt-1">
            ホームページの競合サイトを分析・比較
          </Text>
        </View>

        {/* Header Actions */}
        <View className="flex-row px-5 mt-2 gap-2 flex-wrap">
          <TouchableOpacity
            className="flex-row items-center bg-primary/10 border border-primary/30 rounded-lg px-3 py-2"
            onPress={() => setShowExportModal(true)}
            activeOpacity={0.7}
          >
            <IconSymbol name="square.and.arrow.up" size={16} color={colors.primary} />
            <Text className="text-xs font-medium text-primary ml-1.5">レポート出力</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center bg-success/10 border border-success/30 rounded-lg px-3 py-2"
            onPress={refreshAllSites}
            disabled={isAnyUpdating}
            activeOpacity={0.7}
          >
            {isAnyUpdating ? (
              <ActivityIndicator size={14} color={colors.success} />
            ) : (
              <IconSymbol name="arrow.clockwise" size={16} color={colors.success} />
            )}
            <Text className="text-xs font-medium text-success ml-1.5">
              {isAnyUpdating ? "更新中..." : "全サイト更新"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center bg-error/10 border border-error/30 rounded-lg px-3 py-2"
            onPress={() => setShowResetModal(true)}
            activeOpacity={0.7}
          >
            <IconSymbol name="trash.fill" size={16} color={colors.error} />
            <Text className="text-xs font-medium text-error ml-1.5">リセット</Text>
          </TouchableOpacity>
        </View>

        {/* Update Progress Banner */}
        {updateProgress && (
          <View className="mx-5 mt-3 bg-primary/5 border border-primary/20 rounded-xl p-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-semibold text-primary">データ更新中</Text>
              <Text className="text-xs text-primary">{updateProgress.current}/{updateProgress.total}</Text>
            </View>
            <Text className="text-xs text-muted mb-2" numberOfLines={1}>
              {updateProgress.domain} を取得中...
            </Text>
            {/* Progress Bar */}
            <View className="h-2 bg-border rounded-full overflow-hidden">
              <View
                style={{
                  height: "100%",
                  width: `${(updateProgress.current / updateProgress.total) * 100}%`,
                  backgroundColor: colors.primary,
                  borderRadius: 4,
                }}
              />
            </View>
          </View>
        )}

        {/* Quick Stats */}
        <View className="flex-row px-5 mt-4 gap-3">
          <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
            <Text className="text-xs text-muted">登録サイト</Text>
            <Text className="text-2xl font-bold text-foreground mt-1">{sites.length}</Text>
          </View>
          <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
            <Text className="text-xs text-muted">自社サイト</Text>
            <Text className="text-2xl font-bold text-primary mt-1">{ownSites.length}</Text>
          </View>
          <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
            <Text className="text-xs text-muted">競合サイト</Text>
            <Text className="text-2xl font-bold text-warning mt-1">{competitorSites.length}</Text>
          </View>
        </View>

        {/* Auto-discover button */}
        {ownSites.length > 0 && (
          <View className="px-5 mt-4">
            <TouchableOpacity
              className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex-row items-center"
              onPress={handleManualDiscover}
              activeOpacity={0.7}
            >
              <IconSymbol name="magnifyingglass" size={20} color={colors.primary} />
              <View className="flex-1 ml-3">
                <Text className="text-sm font-semibold text-primary">競合サイトを自動検出</Text>
                <Text className="text-xs text-muted mt-0.5">
                  DataForSEO APIで類似サイトを自動的に発見します
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Access Share Chart */}
        {accessShareData.length > 0 && (
          <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
            <Text className="text-base font-semibold text-foreground mb-4">アクセスシェア率</Text>
            <PieChart data={accessShareData} size={200} />
          </View>
        )}

        {/* Engagement Summary Table */}
        {engagementRows.length > 0 && (
          <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-semibold text-foreground">エンゲージメント サマリー</Text>
              {Object.values(displayData).some((d) => d.isLive) && (
                <View className="flex-row items-center gap-1 bg-success/10 px-2 py-0.5 rounded-full">
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success }} />
                  <Text className="text-[10px] text-success font-medium">LIVE</Text>
                </View>
              )}
            </View>
            <View className="flex-row border-b border-border pb-2 mb-1">
              <Text className="flex-1 text-[10px] font-medium text-muted">サイト</Text>
              <Text className="w-16 text-[10px] font-medium text-muted text-right">セッション</Text>
              <Text className="w-14 text-[10px] font-medium text-muted text-right">滞在</Text>
              <Text className="w-10 text-[10px] font-medium text-muted text-right">PV</Text>
              <Text className="w-14 text-[10px] font-medium text-muted text-right">直帰率</Text>
            </View>
            {engagementRows.map((row, i) => (
              <TouchableOpacity
                key={i}
                className="flex-row py-2.5 border-b border-border"
                onPress={() =>
                  router.push({ pathname: "/site-detail", params: { domain: row.domain, name: row.name } })
                }
                activeOpacity={0.7}
              >
                <View className="flex-1 flex-row items-center gap-1.5">
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: row.isOwn ? colors.primary : colors.warning,
                    }}
                  />
                  <Text className="text-xs text-foreground" numberOfLines={1}>
                    {row.name}
                  </Text>
                  {row.isLive && (
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.success, marginLeft: 2 }} />
                  )}
                </View>
                <View className="w-16 items-end">
                  <Text className="text-xs text-foreground text-right">
                    {row.sessions > 0 ? formatLargeNumber(row.sessions) : "-"}
                  </Text>
                  {row.isEstimated && row.sessions > 0 && (
                    <Text className="text-[8px] text-warning">推定</Text>
                  )}
                </View>
                <Text className="w-14 text-xs text-foreground text-right">
                  {row.duration === "--:--" && !row.isEstimated ? "-" : row.duration}
                </Text>
                <Text className="w-10 text-xs text-foreground text-right">
                  {row.pageViews > 0 ? row.pageViews.toFixed(1) : "-"}
                </Text>
                <Text className="w-14 text-xs text-foreground text-right">
                  {row.bounceRate > 0 ? (row.bounceRate * 100).toFixed(1) + "%" : "-"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Monthly Traffic Comparison */}
        {hasDisplayData && (
          <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
            <Text className="text-base font-semibold text-foreground mb-4">月間トラフィック比較</Text>
            <BarChart
              data={Object.values(displayData).map((d) => ({
                label: d.name,
                value: d.sessions,
              }))}
              height={180}
            />
          </View>
        )}

        {/* Channel Traffic Overview */}
        {hasDisplayData && (
          <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
            <Text className="text-base font-semibold text-foreground mb-4">チャネル別トラフィック概要</Text>
            {Object.values(displayData).map((d) => {
              if (!d.channels) return null;
              const channels = [
                { label: "オーガニック検索", value: d.channels.organicSearch, color: "#10B981" },
                { label: "ダイレクト", value: d.channels.direct, color: "#1E40AF" },
                { label: "リファラル", value: d.channels.referral, color: "#8B5CF6" },
                { label: "有料検索", value: d.channels.paidSearch, color: "#F59E0B" },
                { label: "ソーシャル", value: d.channels.social, color: "#EC4899" },
                { label: "ディスプレイ", value: d.channels.displayAds, color: "#06B6D4" },
              ].filter((c) => c.value > 0);
              if (channels.length === 0) return null;
              return (
                <View key={d.domain} className="mb-5">
                  <View className="flex-row items-center gap-2 mb-2">
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: d.isOwn ? colors.primary : colors.warning,
                      }}
                    />
                    <Text className="text-sm font-medium text-foreground">{d.name}</Text>
                    <Text className="text-xs text-muted">({formatLargeNumber(d.channels.total)} total)</Text>
                    {d.isLive && (
                      <View className="flex-row items-center gap-0.5 bg-success/10 px-1.5 py-0.5 rounded-full">
                        <Text className="text-[8px] text-success font-medium">LIVE</Text>
                      </View>
                    )}
                  </View>
                  <HorizontalBar data={channels} />
                </View>
              );
            })}
          </View>
        )}

        {/* Search Traffic Total - 検索トラフィック合計 横棒グラフ */}
        {hasDisplayData && (
          <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
            <Text className="text-base font-semibold text-foreground mb-1">検索トラフィック合計</Text>
            <Text className="text-xs text-muted mb-4">オーガニック + 有料検索の合計トラフィック</Text>
            <HorizontalBar
              data={Object.values(displayData)
                .filter((d) => {
                  const preset = presetMap[d.domain];
                  return preset?.searchTraffic;
                })
                .map((d) => {
                  const preset = presetMap[d.domain];
                  return {
                    label: d.name,
                    value: preset?.searchTraffic?.total || 0,
                    color: d.isOwn ? colors.primary : colors.warning,
                  };
                })}
            />
          </View>
        )}

        {/* Organic vs Paid Search - オーガニック vs 有料検索比率 */}
        {hasDisplayData && (
          <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
            <Text className="text-base font-semibold text-foreground mb-1">オーガニック vs 有料検索</Text>
            <Text className="text-xs text-muted mb-4">各サイトの検索トラフィック内訳</Text>
            <RatioBarChart
              data={Object.values(displayData)
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
                })}
            />
          </View>
        )}

        {/* Channel Traffic Share - チャネル別トラフィックシェア積み上げ棒グラフ */}
        {hasDisplayData && (
          <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
            <Text className="text-base font-semibold text-foreground mb-1">チャネル別トラフィックシェア</Text>
            <Text className="text-xs text-muted mb-4">各チャネルの割合を比較</Text>
            <StackedBarChart
              data={Object.values(displayData)
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
                })}
            />
          </View>
        )}

        {/* Display Ad Networks - ディスプレイ広告ネットワーク別シェア */}
        {Object.values(presetMap).some((p) => p.displayAdNetworks?.length > 0) && (
          <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
            <Text className="text-base font-semibold text-foreground mb-1">ディスプレイ広告ネットワーク</Text>
            <Text className="text-xs text-muted mb-4">各サイトの広告ネットワーク別シェア</Text>
            {Object.values(displayData).map((d) => {
              const preset = presetMap[d.domain];
              if (!preset?.displayAdNetworks?.length) return null;
              return (
                <View key={d.domain} className="mb-5">
                  <View className="flex-row items-center gap-2 mb-2">
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: d.isOwn ? colors.primary : colors.warning,
                      }}
                    />
                    <Text className="text-sm font-medium text-foreground">{d.name}</Text>
                  </View>
                  <HorizontalBar
                    data={preset.displayAdNetworks.map((n, i) => ({
                      label: n.name,
                      value: n.share,
                      maxValue: 100,
                      color: ["#1E40AF", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6"][i % 5],
                    }))}
                  />
                </View>
              );
            })}
          </View>
        )}

        {/* Monthly Sessions Trend - 月間セッション数推移 */}
        {Object.values(presetMap).some((p) => p.monthlySessionsTrend?.length > 0) && (
          <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
            <Text className="text-base font-semibold text-foreground mb-1">月間セッション数推移</Text>
            <Text className="text-xs text-muted mb-4">過去12ヶ月のトラフィック推移</Text>
            <LineChart
              labels={["2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月", "1月"]}
              datasets={Object.values(displayData)
                .filter((d) => presetMap[d.domain]?.monthlySessionsTrend?.length)
                .map((d, i) => ({
                  label: d.name,
                  data: presetMap[d.domain]!.monthlySessionsTrend,
                  color: d.isOwn ? colors.primary : ["#F59E0B", "#10B981", "#EF4444", "#8B5CF6"][i % 4],
                }))}
              height={220}
            />
          </View>
        )}

        {/* Social Traffic Breakdown - ソーシャルトラフィック内訳 */}
        {Object.values(presetMap).some((p) => p.socialBreakdown) && (
          <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
            <Text className="text-base font-semibold text-foreground mb-1">ソーシャルトラフィック内訳</Text>
            <Text className="text-xs text-muted mb-4">各サイトのSNS別トラフィックシェア</Text>
            <StackedBarChart
              data={Object.values(displayData)
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
                })}
            />
          </View>
        )}

        {/* Site List */}
        {ownSites.length > 0 && (
          <View className="mt-5 px-5">
            <Text className="text-base font-semibold text-foreground mb-3">自社サイト</Text>
            {ownSites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                presetData={presetMap[site.domain]}
                liveData={liveDataMap[site.domain]}
                isUpdating={updatingDomains.has(site.domain)}
                onPress={() =>
                  router.push({ pathname: "/site-detail", params: { domain: site.domain, name: site.name } })
                }
                onRemove={() => handleRemoveSite(site.id, site.name)}
                onRefresh={() => refreshSingleSite(site.domain).catch(() => Alert.alert("エラー", "データの更新に失敗しました"))}
                colors={colors}
              />
            ))}
          </View>
        )}

        {competitorSites.length > 0 && (
          <View className="mt-4 px-5">
            <Text className="text-base font-semibold text-foreground mb-3">競合サイト</Text>
            {competitorSites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                presetData={presetMap[site.domain]}
                liveData={liveDataMap[site.domain]}
                isUpdating={updatingDomains.has(site.domain)}
                onPress={() =>
                  router.push({ pathname: "/site-detail", params: { domain: site.domain, name: site.name } })
                }
                onRemove={() => handleRemoveSite(site.id, site.name)}
                onRefresh={() => refreshSingleSite(site.domain).catch(() => Alert.alert("エラー", "データの更新に失敗しました"))}
                colors={colors}
              />
            ))}
          </View>
        )}

        {/* Empty State */}
        {!loading && sites.length === 0 && (
          <View className="items-center justify-center mt-16 px-8">
            <IconSymbol name="globe" size={48} color={colors.muted} />
            <Text className="text-lg font-semibold text-foreground mt-4">
              サイトが登録されていません
            </Text>
            <Text className="text-sm text-muted text-center mt-2">
              「+」ボタンをタップして自社サイトを追加すると、競合サイトを自動検出します
            </Text>
          </View>
        )}

        {loading && (
          <View className="items-center mt-16">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <IconSymbol name="plus.circle.fill" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add Site Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View className="bg-background rounded-t-3xl p-6" style={styles.modalContent}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-foreground">サイトを追加</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <IconSymbol name="xmark" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <Text className="text-sm font-medium text-foreground mb-2">ドメイン</Text>
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 mb-4"
              placeholder="例: example.com"
              placeholderTextColor={colors.muted}
              value={newDomain}
              onChangeText={setNewDomain}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              style={{ color: colors.foreground }}
            />

            <Text className="text-sm font-medium text-foreground mb-2">サイト名（任意）</Text>
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 mb-4"
              placeholder="例: 補助金ポータル"
              placeholderTextColor={colors.muted}
              value={newName}
              onChangeText={setNewName}
              returnKeyType="done"
              style={{ color: colors.foreground }}
            />

            <View className="flex-row gap-3 mb-4">
              <TouchableOpacity
                className={`flex-1 py-3 rounded-xl border ${
                  !isOwn ? "bg-primary border-primary" : "bg-surface border-border"
                }`}
                onPress={() => setIsOwn(false)}
                activeOpacity={0.7}
              >
                <Text className={`text-center font-medium ${!isOwn ? "text-background" : "text-foreground"}`}>
                  競合サイト
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-3 rounded-xl border ${
                  isOwn ? "bg-primary border-primary" : "bg-surface border-border"
                }`}
                onPress={() => setIsOwn(true)}
                activeOpacity={0.7}
              >
                <Text className={`text-center font-medium ${isOwn ? "text-background" : "text-foreground"}`}>
                  自社サイト
                </Text>
              </TouchableOpacity>
            </View>

            {isOwn && (
              <View className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4">
                <Text className="text-xs text-primary">
                  自社サイトを追加すると、DataForSEO APIを使って競合サイトを自動的に5社検出します。
                </Text>
              </View>
            )}

            <TouchableOpacity
              className="bg-primary py-4 rounded-xl"
              onPress={handleAddSite}
              disabled={adding}
              activeOpacity={0.8}
            >
              {adding ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-background text-center font-semibold text-base">追加する</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Export Modal */}
      <Modal visible={showExportModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View className="bg-background rounded-t-3xl p-6" style={styles.modalContent}>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-foreground">レポート出力</Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <IconSymbol name="xmark" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <Text className="text-sm text-muted mb-4">
              分析データをCSVまたはHTMLレポートとして出力します。
            </Text>

            {exporting ? (
              <View className="items-center py-8">
                <ActivityIndicator size="large" color={colors.primary} />
                <Text className="text-sm text-muted mt-4">エクスポート中...</Text>
              </View>
            ) : (
              <View className="gap-3">
                <Text className="text-xs font-semibold text-muted uppercase tracking-wider">CSVエクスポート</Text>
                <ExportButton
                  icon="doc.text.fill"
                  title="エンゲージメントデータ"
                  subtitle="セッション数、滞在時間、直帰率など"
                  colors={colors}
                  onPress={async () => {
                    setExporting(true);
                    try {
                      await exportCsv(sites, "engagement");
                      Alert.alert("完了", "エンゲージメントデータをエクスポートしました");
                    } catch (e) {
                      Alert.alert("エラー", "エクスポートに失敗しました");
                    } finally {
                      setExporting(false);
                    }
                  }}
                />
                <ExportButton
                  icon="chart.bar.fill"
                  title="チャネル別トラフィック"
                  subtitle="Direct、Organic、Paid、Socialなど"
                  colors={colors}
                  onPress={async () => {
                    setExporting(true);
                    try {
                      await exportCsv(sites, "channel");
                      Alert.alert("完了", "チャネルデータをエクスポートしました");
                    } catch (e) {
                      Alert.alert("エラー", "エクスポートに失敗しました");
                    } finally {
                      setExporting(false);
                    }
                  }}
                />
                <ExportButton
                  icon="magnifyingglass"
                  title="キーワードデータ"
                  subtitle="各サイトの流入キーワード一覧"
                  colors={colors}
                  onPress={async () => {
                    setExporting(true);
                    try {
                      await exportCsv(sites, "keyword");
                      Alert.alert("完了", "キーワードデータをエクスポートしました");
                    } catch (e) {
                      Alert.alert("エラー", "エクスポートに失敗しました");
                    } finally {
                      setExporting(false);
                    }
                  }}
                />
                <ExportButton
                  icon="doc.on.doc.fill"
                  title="全データ統合CSV"
                  subtitle="エンゲージメント+チャネル+キーワード"
                  colors={colors}
                  onPress={async () => {
                    setExporting(true);
                    try {
                      await exportCsv(sites, "full");
                      Alert.alert("完了", "全データをエクスポートしました");
                    } catch (e) {
                      Alert.alert("エラー", "エクスポートに失敗しました");
                    } finally {
                      setExporting(false);
                    }
                  }}
                />

                <View className="mt-2">
                  <Text className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">HTMLレポート</Text>
                  <ExportButton
                    icon="doc.richtext.fill"
                    title="ダッシュボード全体レポート（HTML）"
                    subtitle="全チャート・グラフ・テーブルを含む包括的レポート"
                    colors={colors}
                    onPress={async () => {
                      setExporting(true);
                      try {
                        await exportDashboardHtml(sites, displayData, presetMap, liveDataMap);
                        Alert.alert("完了", "ダッシュボードHTMLレポートを生成しました");
                      } catch (e) {
                        Alert.alert("エラー", "レポート生成に失敗しました");
                      } finally {
                        setExporting(false);
                      }
                    }}
                  />
                  <View className="mt-3">
                    <ExportButton
                      icon="doc.text.fill"
                      title="競合分析レポート（HTML）"
                      subtitle="テーブル中心のシンプルなレポート"
                      colors={colors}
                      onPress={async () => {
                        setExporting(true);
                        try {
                          await exportHtmlReport(sites);
                          Alert.alert("完了", "HTMLレポートを生成しました");
                        } catch (e) {
                          Alert.alert("エラー", "レポート生成に失敗しました");
                        } finally {
                          setExporting(false);
                        }
                      }}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Reset Confirmation Modal */}
      <Modal visible={showResetModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View className="bg-background rounded-2xl p-6 mx-6">
            <View className="items-center mb-4">
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: colors.error + "20",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <IconSymbol name="trash.fill" size={28} color={colors.error} />
              </View>
              <Text className="text-xl font-bold text-foreground">登録サイトをリセット</Text>
              <Text className="text-sm text-muted text-center mt-2">
                登録された全サイトと取得データを削除します。{"\n"}新規顧客の分析を開始する際にご利用ください。{"\n"}
                この操作は元に戻せません。
              </Text>
            </View>
            <View className="flex-row gap-3 mt-2">
              <TouchableOpacity
                className="flex-1 bg-surface border border-border py-4 rounded-xl"
                onPress={() => setShowResetModal(false)}
                disabled={resetting}
                activeOpacity={0.7}
              >
                <Text className="text-foreground text-center font-medium">キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-error py-4 rounded-xl"
                onPress={async () => {
                  setResetting(true);
                  try {
                    await resetAllSites();
                    setShowResetModal(false);
                  } catch (e) {
                    Alert.alert("エラー", "リセットに失敗しました");
                  } finally {
                    setResetting(false);
                  }
                }}
                disabled={resetting}
                activeOpacity={0.8}
              >
                {resetting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white text-center font-semibold">リセットする</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Competitor Discovery Modal */}
      <Modal visible={showCompetitorModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View className="bg-background rounded-t-3xl p-6" style={styles.competitorModalContent}>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-foreground">競合サイト検出</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCompetitorModal(false);
                  setDiscoveredCompetitors([]);
                }}
              >
                <IconSymbol name="xmark" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {discovering ? (
              <View className="items-center py-12">
                <ActivityIndicator size="large" color={colors.primary} />
                <Text className="text-sm text-muted mt-4">DataForSEO APIで競合サイトを検索中...</Text>
                <Text className="text-xs text-muted mt-2">しばらくお待ちください</Text>
              </View>
            ) : discoveredCompetitors.length === 0 ? (
              <View className="items-center py-12">
                <IconSymbol name="magnifyingglass" size={40} color={colors.muted} />
                <Text className="text-sm text-muted mt-4 text-center">
                  競合サイトが見つかりませんでした。{"\n"}別のドメインでお試しください。
                </Text>
                <TouchableOpacity
                  className="mt-4 bg-surface border border-border rounded-xl px-6 py-3"
                  onPress={() => {
                    setShowCompetitorModal(false);
                    setDiscoveredCompetitors([]);
                  }}
                  activeOpacity={0.7}
                >
                  <Text className="text-foreground font-medium">閉じる</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text className="text-sm text-muted mb-4">
                  {discoveredCompetitors.length}件の競合サイトが見つかりました。追加するサイトを選択してください。
                </Text>

                <ScrollView style={{ maxHeight: 360 }}>
                  {discoveredCompetitors.map((comp, index) => (
                    <TouchableOpacity
                      key={comp.domain}
                      className={`rounded-xl p-4 mb-3 border ${
                        comp.selected ? "bg-primary/5 border-primary/30" : "bg-surface border-border"
                      }`}
                      onPress={() => toggleCompetitorSelection(index)}
                      activeOpacity={0.7}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-foreground">{comp.domain}</Text>
                          <View className="flex-row mt-2 gap-4">
                            <View>
                              <Text className="text-[10px] text-muted">共通KW</Text>
                              <Text className="text-xs font-medium text-foreground">
                                {formatNumber(comp.intersections)}
                              </Text>
                            </View>
                            <View>
                              <Text className="text-[10px] text-muted">平均順位</Text>
                              <Text className="text-xs font-medium text-foreground">
                                {comp.avgPosition.toFixed(1)}
                              </Text>
                            </View>
                            <View>
                              <Text className="text-[10px] text-muted">オーガニック</Text>
                              <Text className="text-xs font-medium text-foreground">
                                {formatLargeNumber(comp.organicTraffic)}
                              </Text>
                            </View>
                            <View>
                              <Text className="text-[10px] text-muted">KW数</Text>
                              <Text className="text-xs font-medium text-foreground">
                                {formatLargeNumber(comp.organicKeywords)}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            borderWidth: 2,
                            borderColor: comp.selected ? colors.primary : colors.border,
                            backgroundColor: comp.selected ? colors.primary : "transparent",
                            alignItems: "center",
                            justifyContent: "center",
                            marginLeft: 12,
                          }}
                        >
                          {comp.selected && (
                            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "bold" }}>✓</Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View className="flex-row gap-3 mt-4">
                  <TouchableOpacity
                    className="flex-1 bg-surface border border-border py-4 rounded-xl"
                    onPress={() => {
                      setShowCompetitorModal(false);
                      setDiscoveredCompetitors([]);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text className="text-foreground text-center font-medium">スキップ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 bg-primary py-4 rounded-xl"
                    onPress={handleAddDiscoveredCompetitors}
                    disabled={addingCompetitors}
                    activeOpacity={0.8}
                  >
                    {addingCompetitors ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text className="text-background text-center font-semibold">
                        {discoveredCompetitors.filter((c) => c.selected).length}件を追加
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function SiteCard({
  site,
  presetData,
  liveData,
  isUpdating,
  onPress,
  onRemove,
  onRefresh,
  colors,
}: {
  site: { id: string; domain: string; name: string; isOwn: boolean };
  presetData?: PresetSiteData;
  liveData?: LiveSiteData;
  isUpdating: boolean;
  onPress: () => void;
  onRemove: () => void;
  onRefresh: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const data = liveData?.engagement || presetData?.engagement;
  const isLive = !!liveData?.engagement;
  const isEstimated = !liveData?.engagement && !!liveData?.estimatedSessions;
  const accessShare = presetData?.accessShare;

  return (
    <TouchableOpacity
      className="bg-surface rounded-xl p-4 mb-3 border border-border"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: site.isOwn ? colors.primary : colors.warning,
              }}
            />
            <Text className="text-base font-semibold text-foreground">{site.name}</Text>
            {isLive && (
              <View className="flex-row items-center gap-0.5 bg-success/10 px-1.5 py-0.5 rounded-full">
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.success }} />
                <Text className="text-[8px] text-success font-medium">LIVE</Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center gap-2 mt-1">
            <Text className="text-xs text-muted">{site.domain}</Text>
            {liveData?.updatedAt && (
              <Text className="text-[10px] text-muted">
                更新: {new Date(liveData.updatedAt).toLocaleDateString("ja-JP")}
              </Text>
            )}
          </View>
        </View>
        <View className="flex-row items-center gap-1">
          <TouchableOpacity onPress={onRefresh} disabled={isUpdating} style={{ padding: 8 }}>
            {isUpdating ? (
              <ActivityIndicator size={16} color={colors.primary} />
            ) : (
              <IconSymbol name="arrow.clockwise" size={16} color={colors.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={onRemove} style={{ padding: 8 }}>
            <IconSymbol name="trash.fill" size={18} color={colors.error} />
          </TouchableOpacity>
          <IconSymbol name="chevron.right" size={16} color={colors.muted} />
        </View>
      </View>
      {data ? (
        <View className="flex-row mt-3 gap-4">
          <View>
            <Text className="text-[10px] text-muted">月間セッション</Text>
            <Text className="text-sm font-semibold text-foreground">
              {formatLargeNumber(data.monthlySessions)}
            </Text>
          </View>
          <View>
            <Text className="text-[10px] text-muted">直帰率</Text>
            <Text className="text-sm font-semibold text-foreground">
              {(data.bounceRate * 100).toFixed(1)}%
            </Text>
          </View>
          <View>
            <Text className="text-[10px] text-muted">平均PV</Text>
            <Text className="text-sm font-semibold text-foreground">
              {data.avgPageViews.toFixed(1)}
            </Text>
          </View>
          {accessShare != null && !isLive && (
            <View>
              <Text className="text-[10px] text-muted">シェア</Text>
              <Text className="text-sm font-semibold text-foreground">
                {accessShare}%
              </Text>
            </View>
          )}
        </View>
      ) : isEstimated && liveData?.estimatedSessions ? (
        <View className="flex-row mt-3 gap-4 items-center">
          <View>
            <Text className="text-[10px] text-muted">月間セッション（推定）</Text>
            <Text className="text-sm font-semibold text-foreground">
              {formatLargeNumber(liveData.estimatedSessions)}
            </Text>
          </View>
          <View className="bg-warning/10 px-2 py-0.5 rounded-full">
            <Text className="text-[9px] text-warning font-medium">SEOデータから推定</Text>
          </View>
        </View>
      ) : liveData ? (
        <View className="mt-3">
          <Text className="text-xs text-muted">「更新」ボタンでデータを取得してください</Text>
        </View>
      ) : (
        <View className="mt-3">
          <Text className="text-xs text-muted">「更新」ボタンでデータを取得してください</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function ExportButton({
  icon,
  title,
  subtitle,
  colors,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center bg-surface border border-border rounded-xl p-4"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: colors.primary + "15",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <IconSymbol name={icon as any} size={20} color={colors.primary} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-foreground">{title}</Text>
        <Text className="text-xs text-muted mt-0.5">{subtitle}</Text>
      </View>
      <IconSymbol name="chevron.right" size={16} color={colors.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    maxHeight: "80%",
  },
  competitorModalContent: {
    maxHeight: "85%",
  },
});
