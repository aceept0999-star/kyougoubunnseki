import { useState, useCallback, useMemo } from "react";
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
import { BarChart, PieChart, HorizontalBar, formatNumber } from "@/components/charts";

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const { sites, loading, addSite, removeSite, refreshSites } = useSites();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newName, setNewName] = useState("");
  const [isOwn, setIsOwn] = useState(false);
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshSites();
    setRefreshing(false);
  }, [refreshSites]);

  const handleAddSite = async () => {
    if (!newDomain.trim()) {
      Alert.alert("エラー", "ドメインを入力してください");
      return;
    }
    setAdding(true);
    try {
      let domain = newDomain.trim().toLowerCase();
      domain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      await addSite({ domain, name: newName.trim() || domain, isOwn });
      setNewDomain("");
      setNewName("");
      setIsOwn(false);
      setShowAddModal(false);
    } catch (e) {
      Alert.alert("エラー", "サイトの追加に失敗しました");
    }
    setAdding(false);
  };

  const handleRemoveSite = (id: string, name: string) => {
    Alert.alert("確認", `「${name}」を削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      { text: "削除", style: "destructive", onPress: () => removeSite(id) },
    ]);
  };

  const ownSites = sites.filter((s) => s.isOwn);
  const competitorSites = sites.filter((s) => !s.isOwn);

  // プリセットデータを取得
  const presetMap = useMemo(() => {
    const map: Record<string, PresetSiteData> = {};
    for (const site of sites) {
      const data = getPresetData(site.domain);
      if (data) map[site.domain] = data;
    }
    return map;
  }, [sites]);

  const hasPresetData = Object.keys(presetMap).length > 0;

  // アクセスシェアデータ
  const accessShareData = useMemo(() => {
    return sites
      .map((s) => {
        const d = presetMap[s.domain];
        return d ? { label: d.site.name, value: d.accessShare, color: undefined as string | undefined } : null;
      })
      .filter(Boolean) as { label: string; value: number; color?: string }[];
  }, [sites, presetMap]);

  // エンゲージメントサマリーテーブル
  const engagementRows = useMemo(() => {
    return sites
      .map((s) => {
        const d = presetMap[s.domain];
        if (!d) return null;
        return {
          name: d.site.name,
          domain: s.domain,
          sessions: d.engagement.monthlySessions,
          uniqueVisitors: d.engagement.monthlyUniqueVisitors,
          duration: d.engagement.avgDuration,
          pageViews: d.engagement.avgPageViews,
          bounceRate: d.engagement.bounceRate,
          totalPageViews: d.engagement.totalPageViews,
          isOwn: s.isOwn,
        };
      })
      .filter(Boolean) as {
      name: string;
      domain: string;
      sessions: number;
      uniqueVisitors: number;
      duration: string;
      pageViews: number;
      bounceRate: number;
      totalPageViews: number;
      isOwn: boolean;
    }[];
  }, [sites, presetMap]);

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

        {/* Access Share Chart */}
        {accessShareData.length > 0 && (
          <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
            <Text className="text-base font-semibold text-foreground mb-4">アクセスシェア率</Text>
            <PieChart
              data={accessShareData.map((d, i) => ({
                label: d.label,
                value: d.value,
              }))}
              size={200}
            />
          </View>
        )}

        {/* Engagement Summary Table */}
        {engagementRows.length > 0 && (
          <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
            <Text className="text-base font-semibold text-foreground mb-4">エンゲージメント サマリー</Text>
            {/* Table Header */}
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
                </View>
                <Text className="w-16 text-xs text-foreground text-right">
                  {formatLargeNumber(row.sessions)}
                </Text>
                <Text className="w-14 text-xs text-foreground text-right">{row.duration}</Text>
                <Text className="w-10 text-xs text-foreground text-right">{row.pageViews.toFixed(1)}</Text>
                <Text className="w-14 text-xs text-foreground text-right">
                  {(row.bounceRate * 100).toFixed(1)}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Monthly Traffic Comparison */}
        {hasPresetData && (
          <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
            <Text className="text-base font-semibold text-foreground mb-4">月間トラフィック比較</Text>
            <BarChart
              data={sites
                .map((s) => {
                  const d = presetMap[s.domain];
                  return d
                    ? { label: d.site.name, value: d.engagement.monthlySessions }
                    : null;
                })
                .filter(Boolean) as { label: string; value: number }[]}
              height={180}
            />
          </View>
        )}

        {/* Channel Traffic Overview */}
        {hasPresetData && (
          <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
            <Text className="text-base font-semibold text-foreground mb-4">チャネル別トラフィック概要</Text>
            {sites.map((s) => {
              const d = presetMap[s.domain];
              if (!d) return null;
              const channels = [
                { label: "オーガニック検索", value: d.channels.organicSearch, color: "#10B981" },
                { label: "ダイレクト", value: d.channels.direct, color: "#1E40AF" },
                { label: "リファラル", value: d.channels.referral, color: "#8B5CF6" },
                { label: "有料検索", value: d.channels.paidSearch, color: "#F59E0B" },
                { label: "ソーシャル", value: d.channels.social, color: "#EC4899" },
                { label: "ディスプレイ", value: d.channels.displayAds, color: "#06B6D4" },
              ].filter((c) => c.value > 0);
              return (
                <View key={s.id} className="mb-5">
                  <View className="flex-row items-center gap-2 mb-2">
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: s.isOwn ? colors.primary : colors.warning,
                      }}
                    />
                    <Text className="text-sm font-medium text-foreground">{d.site.name}</Text>
                    <Text className="text-xs text-muted">({formatLargeNumber(d.channels.total)} total)</Text>
                  </View>
                  <HorizontalBar data={channels} />
                </View>
              );
            })}
          </View>
        )}

        {/* Site List */}
        {ownSites.length > 0 && (
          <View className="mt-6 px-5">
            <Text className="text-base font-semibold text-foreground mb-3">自社サイト</Text>
            {ownSites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                presetData={presetMap[site.domain]}
                onPress={() =>
                  router.push({ pathname: "/site-detail", params: { domain: site.domain, name: site.name } })
                }
                onRemove={() => handleRemoveSite(site.id, site.name)}
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
                onPress={() =>
                  router.push({ pathname: "/site-detail", params: { domain: site.domain, name: site.name } })
                }
                onRemove={() => handleRemoveSite(site.id, site.name)}
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
              「+」ボタンをタップして分析したいサイトを追加してください
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

            <View className="flex-row gap-3 mb-6">
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
    </ScreenContainer>
  );
}

function SiteCard({
  site,
  presetData,
  onPress,
  onRemove,
  colors,
}: {
  site: { id: string; domain: string; name: string; isOwn: boolean };
  presetData?: PresetSiteData;
  onPress: () => void;
  onRemove: () => void;
  colors: ReturnType<typeof useColors>;
}) {
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
          </View>
          <Text className="text-xs text-muted mt-1">{site.domain}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={onRemove} style={{ padding: 8 }}>
            <IconSymbol name="trash.fill" size={18} color={colors.error} />
          </TouchableOpacity>
          <IconSymbol name="chevron.right" size={16} color={colors.muted} />
        </View>
      </View>
      {/* Preset data mini summary */}
      {presetData && (
        <View className="flex-row mt-3 gap-4">
          <View>
            <Text className="text-[10px] text-muted">月間セッション</Text>
            <Text className="text-sm font-semibold text-foreground">
              {formatLargeNumber(presetData.engagement.monthlySessions)}
            </Text>
          </View>
          <View>
            <Text className="text-[10px] text-muted">直帰率</Text>
            <Text className="text-sm font-semibold text-foreground">
              {(presetData.engagement.bounceRate * 100).toFixed(1)}%
            </Text>
          </View>
          <View>
            <Text className="text-[10px] text-muted">平均PV</Text>
            <Text className="text-sm font-semibold text-foreground">
              {presetData.engagement.avgPageViews.toFixed(1)}
            </Text>
          </View>
          <View>
            <Text className="text-[10px] text-muted">シェア</Text>
            <Text className="text-sm font-semibold text-foreground">
              {presetData.accessShare}%
            </Text>
          </View>
        </View>
      )}
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
});
