import { useState, useMemo } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useSites } from "@/lib/sites-context";
import { trpc } from "@/lib/trpc";
import { BarChart, HorizontalBar, formatNumber, CHART_COLORS } from "@/components/charts";
import { IconSymbol } from "@/components/ui/icon-symbol";

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
          <Text className="text-sm font-medium text-foreground mb-2">
            比較するサイトを選択
          </Text>
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
  sites: { id: string; domain: string; name: string }[];
  colors: ReturnType<typeof useColors>;
}) {
  // Fetch data for all selected sites
  const queries = sites.map((site) => ({
    visits: trpc.analysis.getTotalVisits.useQuery({ domain: site.domain }),
    bounce: trpc.analysis.getBounceRate.useQuery({ domain: site.domain }),
    rank: trpc.analysis.getGlobalRank.useQuery({ domain: site.domain }),
    speed: trpc.analysis.getPageSpeed.useQuery({
      url: `https://${site.domain}`,
      strategy: "mobile",
    }),
    traffic: trpc.analysis.getTrafficSources.useQuery({ domain: site.domain }),
  }));

  const isLoading = queries.some(
    (q) => q.visits.isLoading || q.bounce.isLoading || q.rank.isLoading || q.speed.isLoading
  );

  if (isLoading) {
    return (
      <View className="items-center mt-12">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-sm text-muted mt-3">比較データを取得中...</Text>
      </View>
    );
  }

  // Parse comparison data
  const comparisonData = sites.map((site, i) => {
    const q = queries[i];
    const visitsData = q.visits.data;
    const bounceData = q.bounce.data;
    const rankData = q.rank.data;
    const speedData = q.speed.data;

    let latestVisits = 0;
    try {
      const raw = visitsData?.data as any;
      const arr = raw?.visits || raw?.data || raw;
      if (Array.isArray(arr) && arr.length > 0) {
        latestVisits = arr[arr.length - 1]?.visits || arr[arr.length - 1]?.value || 0;
      }
    } catch {}

    let bounceVal = 0;
    try {
      const raw = bounceData?.data as any;
      const arr = raw?.bounce_rate || raw?.data || raw;
      if (Array.isArray(arr) && arr.length > 0) {
        bounceVal = arr[arr.length - 1]?.bounce_rate || arr[arr.length - 1]?.value || 0;
      } else if (typeof arr === "number") {
        bounceVal = arr;
      }
    } catch {}

    let rankVal = 0;
    try {
      const raw = rankData?.data as any;
      const arr = raw?.global_rank || raw?.data || raw;
      if (Array.isArray(arr) && arr.length > 0) {
        rankVal = arr[arr.length - 1]?.global_rank || arr[arr.length - 1]?.value || 0;
      } else if (typeof arr === "number") {
        rankVal = arr;
      }
    } catch {}

    const speedScore = speedData?.success && speedData.data ? speedData.data.performanceScore : 0;

    return {
      name: site.name,
      domain: site.domain,
      visits: latestVisits,
      bounceRate: bounceVal,
      globalRank: rankVal,
      pageSpeed: speedScore,
      color: CHART_COLORS[i % CHART_COLORS.length],
    };
  });

  return (
    <View className="mt-6">
      {/* Visits Comparison */}
      <View className="mx-5 bg-surface rounded-xl p-4 border border-border mb-4">
        <Text className="text-base font-semibold text-foreground mb-4">月間訪問数比較</Text>
        <BarChart
          data={comparisonData.map((d) => ({
            label: d.name,
            value: d.visits,
            color: d.color,
          }))}
          height={180}
        />
      </View>

      {/* PageSpeed Comparison */}
      <View className="mx-5 bg-surface rounded-xl p-4 border border-border mb-4">
        <Text className="text-base font-semibold text-foreground mb-4">
          PageSpeed スコア比較
        </Text>
        <HorizontalBar
          data={comparisonData.map((d) => ({
            label: d.name,
            value: d.pageSpeed,
            maxValue: 100,
            color: d.color,
          }))}
        />
      </View>

      {/* Comparison Table */}
      <View className="mx-5 bg-surface rounded-xl p-4 border border-border mb-4">
        <Text className="text-base font-semibold text-foreground mb-4">指標一覧</Text>
        {/* Header */}
        <View className="flex-row border-b border-border pb-2 mb-2">
          <Text className="flex-1 text-xs font-medium text-muted">サイト</Text>
          <Text className="w-20 text-xs font-medium text-muted text-right">訪問数</Text>
          <Text className="w-16 text-xs font-medium text-muted text-right">直帰率</Text>
          <Text className="w-16 text-xs font-medium text-muted text-right">速度</Text>
        </View>
        {comparisonData.map((d, i) => (
          <View key={i} className="flex-row py-2 border-b border-border">
            <View className="flex-1 flex-row items-center gap-2">
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: d.color,
                }}
              />
              <Text className="text-xs text-foreground" numberOfLines={1}>
                {d.name}
              </Text>
            </View>
            <Text className="w-20 text-xs text-foreground text-right">
              {d.visits > 0 ? formatNumber(d.visits) : "N/A"}
            </Text>
            <Text className="w-16 text-xs text-foreground text-right">
              {d.bounceRate > 0 ? `${(d.bounceRate * 100).toFixed(1)}%` : "N/A"}
            </Text>
            <Text className="w-16 text-xs text-foreground text-right">
              {d.pageSpeed > 0 ? `${d.pageSpeed}` : "N/A"}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
