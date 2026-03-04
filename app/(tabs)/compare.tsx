import { useState, useMemo } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useSites } from "@/lib/sites-context";
import { BarChart, HorizontalBar, PieChart, formatNumber, CHART_COLORS } from "@/components/charts";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getPresetData, formatLargeNumber, type PresetSiteData } from "@/lib/preset-data";

export default function CompareScreen() {
  const colors = useColors();
  const { sites } = useSites();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedSites = useMemo(
    () => sites.filter((s) => selectedIds.includes(s.id)),
    [sites, selectedIds]
  );

  const toggleSite = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(sites.map((s) => s.id));
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-2xl font-bold text-foreground">競合比較</Text>
          <Text className="text-sm text-muted mt-1">
            サイトを選択して指標を比較
          </Text>
        </View>

        {/* Site Selection */}
        <View className="px-5 mt-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm font-medium text-foreground">
              比較するサイトを選択
            </Text>
            {sites.length > 0 && (
              <TouchableOpacity onPress={selectAll} activeOpacity={0.7}>
                <Text className="text-xs text-primary font-medium">全て選択</Text>
              </TouchableOpacity>
            )}
          </View>
          <View className="flex-row flex-wrap gap-2">
            {sites.map((site) => {
              const isSelected = selectedIds.includes(site.id);
              return (
                <TouchableOpacity
                  key={site.id}
                  onPress={() => toggleSite(site.id)}
                  className={`px-3 py-2 rounded-full border ${
                    isSelected ? "bg-primary border-primary" : "bg-surface border-border"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-xs font-medium ${
                      isSelected ? "text-background" : "text-foreground"
                    }`}
                  >
                    {site.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {sites.length === 0 && (
            <View className="items-center mt-8">
              <IconSymbol name="globe" size={40} color={colors.muted} />
              <Text className="text-sm text-muted mt-3 text-center">
                ダッシュボードからサイトを追加してください
              </Text>
            </View>
          )}
        </View>

        {/* Comparison Results */}
        {selectedSites.length >= 2 && (
          <ComparisonResults sites={selectedSites} colors={colors} />
        )}

        {selectedSites.length === 1 && (
          <View className="items-center mt-8 px-5">
            <Text className="text-sm text-muted text-center">
              比較するにはもう1つ以上のサイトを選択してください
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function ComparisonResults({
  sites,
  colors,
}: {
  sites: { id: string; domain: string; name: string; isOwn: boolean }[];
  colors: ReturnType<typeof useColors>;
}) {
  // プリセットデータを取得
  const comparisonData = useMemo(() => {
    return sites.map((site, i) => {
      const preset = getPresetData(site.domain);
      return {
        name: site.name,
        domain: site.domain,
        isOwn: site.isOwn,
        preset,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
  }, [sites]);

  const hasPreset = comparisonData.some((d) => d.preset !== null);

  if (!hasPreset) {
    return (
      <View className="items-center mt-8 px-5">
        <Text className="text-sm text-muted text-center">
          選択されたサイトにプリセットデータがありません
        </Text>
      </View>
    );
  }

  return (
    <View className="mt-6">
      {/* Engagement Summary Table (like PDF P3) */}
      <View className="mx-5 bg-surface rounded-xl p-4 border border-border mb-4">
        <Text className="text-base font-semibold text-foreground mb-4">エンゲージメント比較</Text>
        {/* Header */}
        <View className="flex-row border-b border-border pb-2 mb-1">
          <Text className="flex-1 text-[10px] font-medium text-muted">サイト</Text>
          <Text className="w-16 text-[10px] font-medium text-muted text-right">セッション</Text>
          <Text className="w-14 text-[10px] font-medium text-muted text-right">UV</Text>
          <Text className="w-12 text-[10px] font-medium text-muted text-right">滞在</Text>
          <Text className="w-10 text-[10px] font-medium text-muted text-right">PV</Text>
          <Text className="w-14 text-[10px] font-medium text-muted text-right">直帰率</Text>
        </View>
        {comparisonData.map((d, i) => {
          const eng = d.preset?.engagement;
          return (
            <View key={i} className="flex-row py-2 border-b border-border items-center">
              <View className="flex-1 flex-row items-center gap-1.5">
                <View
                  style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: d.color }}
                />
                <Text className="text-[10px] text-foreground" numberOfLines={1}>
                  {d.name}
                </Text>
              </View>
              <Text className="w-16 text-[10px] text-foreground text-right">
                {eng ? formatLargeNumber(eng.monthlySessions) : "N/A"}
              </Text>
              <Text className="w-14 text-[10px] text-foreground text-right">
                {eng ? formatLargeNumber(eng.monthlyUniqueVisitors) : "N/A"}
              </Text>
              <Text className="w-12 text-[10px] text-foreground text-right">
                {eng ? eng.avgDuration : "N/A"}
              </Text>
              <Text className="w-10 text-[10px] text-foreground text-right">
                {eng ? eng.avgPageViews.toFixed(1) : "N/A"}
              </Text>
              <Text className="w-14 text-[10px] text-foreground text-right">
                {eng ? `${(eng.bounceRate * 100).toFixed(1)}%` : "N/A"}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Access Share */}
      <View className="mx-5 bg-surface rounded-xl p-4 border border-border mb-4">
        <Text className="text-base font-semibold text-foreground mb-4">アクセスシェア率</Text>
        <PieChart
          data={comparisonData
            .filter((d) => d.preset)
            .map((d) => ({
              label: d.name,
              value: d.preset!.accessShare,
              color: d.color,
            }))}
          size={200}
        />
      </View>

      {/* Monthly Sessions Comparison */}
      <View className="mx-5 bg-surface rounded-xl p-4 border border-border mb-4">
        <Text className="text-base font-semibold text-foreground mb-4">月間セッション数比較</Text>
        <BarChart
          data={comparisonData
            .filter((d) => d.preset)
            .map((d) => ({
              label: d.name,
              value: d.preset!.engagement.monthlySessions,
              color: d.color,
            }))}
          height={180}
        />
      </View>

      {/* Bounce Rate Comparison */}
      <View className="mx-5 bg-surface rounded-xl p-4 border border-border mb-4">
        <Text className="text-base font-semibold text-foreground mb-4">直帰率比較</Text>
        <HorizontalBar
          data={comparisonData
            .filter((d) => d.preset)
            .map((d) => ({
              label: d.name,
              value: Math.round(d.preset!.engagement.bounceRate * 100),
              maxValue: 100,
              color: d.color,
            }))}
        />
      </View>

      {/* Channel Traffic Comparison */}
      <View className="mx-5 bg-surface rounded-xl p-4 border border-border mb-4">
        <Text className="text-base font-semibold text-foreground mb-4">総トラフィック比較</Text>
        <BarChart
          data={comparisonData
            .filter((d) => d.preset)
            .map((d) => ({
              label: d.name,
              value: d.preset!.channels.total,
              color: d.color,
            }))}
          height={180}
        />
      </View>

      {/* Search Traffic */}
      <View className="mx-5 bg-surface rounded-xl p-4 border border-border mb-4">
        <Text className="text-base font-semibold text-foreground mb-4">検索トラフィック比較</Text>
        {/* Header */}
        <View className="flex-row border-b border-border pb-2 mb-1">
          <Text className="flex-1 text-[10px] font-medium text-muted">サイト</Text>
          <Text className="w-16 text-[10px] font-medium text-muted text-right">検索合計</Text>
          <Text className="w-16 text-[10px] font-medium text-muted text-right">オーガニック</Text>
          <Text className="w-12 text-[10px] font-medium text-muted text-right">有料</Text>
        </View>
        {comparisonData.map((d, i) => {
          const st = d.preset?.searchTraffic;
          return (
            <View key={i} className="flex-row py-2 border-b border-border items-center">
              <View className="flex-1 flex-row items-center gap-1.5">
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: d.color }} />
                <Text className="text-[10px] text-foreground" numberOfLines={1}>{d.name}</Text>
              </View>
              <Text className="w-16 text-[10px] text-foreground text-right">
                {st ? formatLargeNumber(st.total) : "N/A"}
              </Text>
              <Text className="w-16 text-[10px] text-foreground text-right">
                {st ? `${st.organicPercent}%` : "N/A"}
              </Text>
              <Text className="w-12 text-[10px] text-foreground text-right">
                {st ? `${st.paidPercent}%` : "N/A"}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Social & Display */}
      <View className="mx-5 bg-surface rounded-xl p-4 border border-border mb-4">
        <Text className="text-base font-semibold text-foreground mb-4">ソーシャル & ディスプレイ広告</Text>
        <View className="flex-row border-b border-border pb-2 mb-1">
          <Text className="flex-1 text-[10px] font-medium text-muted">サイト</Text>
          <Text className="w-20 text-[10px] font-medium text-muted text-right">ソーシャル</Text>
          <Text className="w-20 text-[10px] font-medium text-muted text-right">ディスプレイ</Text>
        </View>
        {comparisonData.map((d, i) => (
          <View key={i} className="flex-row py-2 border-b border-border items-center">
            <View className="flex-1 flex-row items-center gap-1.5">
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: d.color }} />
              <Text className="text-[10px] text-foreground" numberOfLines={1}>{d.name}</Text>
            </View>
            <Text className="w-20 text-[10px] text-foreground text-right">
              {d.preset ? d.preset.socialTraffic.toLocaleString() : "N/A"}
            </Text>
            <Text className="w-20 text-[10px] text-foreground text-right">
              {d.preset ? d.preset.displayAds.toLocaleString() : "N/A"}
            </Text>
          </View>
        ))}
      </View>

      {/* Keywords Count */}
      <View className="mx-5 bg-surface rounded-xl p-4 border border-border mb-4">
        <Text className="text-base font-semibold text-foreground mb-4">流入キーワード数比較</Text>
        <BarChart
          data={comparisonData
            .filter((d) => d.preset)
            .map((d) => ({
              label: d.name,
              value: d.preset!.totalKeywords,
              color: d.color,
            }))}
          height={180}
        />
      </View>
    </View>
  );
}
