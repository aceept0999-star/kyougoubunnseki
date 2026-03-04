import { useState, useEffect } from "react";
import {
  ScrollView,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { BarChart, LineChart, PieChart, HorizontalBar, formatNumber } from "@/components/charts";

export default function SiteDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ domain: string; name: string }>();
  const domain = params.domain || "";
  const siteName = params.name || domain;

  // API queries
  const trafficSources = trpc.analysis.getTrafficSources.useQuery(
    { domain },
    { enabled: !!domain }
  );
  const totalVisits = trpc.analysis.getTotalVisits.useQuery(
    { domain },
    { enabled: !!domain }
  );
  const bounceRate = trpc.analysis.getBounceRate.useQuery(
    { domain },
    { enabled: !!domain }
  );
  const globalRank = trpc.analysis.getGlobalRank.useQuery(
    { domain },
    { enabled: !!domain }
  );
  const pageSpeed = trpc.analysis.getPageSpeed.useQuery(
    { url: `https://${domain}`, strategy: "mobile" },
    { enabled: !!domain }
  );

  const isLoading =
    trafficSources.isLoading ||
    totalVisits.isLoading ||
    bounceRate.isLoading ||
    globalRank.isLoading ||
    pageSpeed.isLoading;

  // Parse traffic data
  const trafficData = parseTrafficData(totalVisits.data);
  const channelData = parseChannelData(trafficSources.data);
  const bounceRateValue = parseBounceRate(bounceRate.data);
  const rankValue = parseGlobalRank(globalRank.data);
  const pageSpeedData = pageSpeed.data?.success ? pageSpeed.data.data : null;

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-3 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <IconSymbol name="chevron.right" size={24} color={colors.foreground} style={{ transform: [{ scaleX: -1 }] }} />
        </TouchableOpacity>
        <View className="flex-1 ml-3">
          <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
            {siteName}
          </Text>
          <Text className="text-xs text-muted">{domain}</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            trafficSources.refetch();
            totalVisits.refetch();
            bounceRate.refetch();
            globalRank.refetch();
            pageSpeed.refetch();
          }}
          style={{ padding: 8 }}
        >
          <IconSymbol name="arrow.clockwise" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {isLoading && (
          <View className="items-center mt-12">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text className="text-sm text-muted mt-3">データを取得中...</Text>
          </View>
        )}

        {!isLoading && (
          <>
            {/* Overview Cards */}
            <View className="flex-row flex-wrap px-5 mt-4 gap-3">
              <MetricCard
                label="月間訪問数"
                value={trafficData.latestVisits ? formatNumber(trafficData.latestVisits) : "N/A"}
                colors={colors}
              />
              <MetricCard
                label="直帰率"
                value={bounceRateValue !== null ? `${(bounceRateValue * 100).toFixed(1)}%` : "N/A"}
                colors={colors}
              />
              <MetricCard
                label="グローバルランク"
                value={rankValue ? `#${formatNumber(rankValue)}` : "N/A"}
                colors={colors}
              />
              <MetricCard
                label="PageSpeed"
                value={pageSpeedData ? `${pageSpeedData.performanceScore}` : "N/A"}
                suffix="/100"
                colors={colors}
                valueColor={
                  pageSpeedData
                    ? pageSpeedData.performanceScore >= 90
                      ? colors.success
                      : pageSpeedData.performanceScore >= 50
                      ? colors.warning
                      : colors.error
                    : undefined
                }
              />
            </View>

            {/* Traffic Trend */}
            {trafficData.history.length > 0 && (
              <SectionCard title="トラフィック推移" colors={colors}>
                <LineChart
                  datasets={[
                    {
                      label: "月間訪問数",
                      data: trafficData.history.map((d) => d.visits),
                      color: "#1E40AF",
                    },
                  ]}
                  labels={trafficData.history.map((d) => d.date)}
                  height={180}
                />
              </SectionCard>
            )}

            {/* Channel Breakdown */}
            {channelData.length > 0 && (
              <SectionCard title="チャネル別トラフィック" colors={colors}>
                <HorizontalBar data={channelData} />
              </SectionCard>
            )}

            {/* Channel Pie Chart */}
            {channelData.length > 0 && (
              <SectionCard title="チャネル構成比" colors={colors}>
                <PieChart
                  data={channelData.map((c) => ({
                    label: c.label,
                    value: c.value,
                    color: c.color,
                  }))}
                  size={200}
                />
              </SectionCard>
            )}

            {/* PageSpeed Details */}
            {pageSpeedData && (
              <SectionCard title="PageSpeed Insights (モバイル)" colors={colors}>
                <View style={{ gap: 8 }}>
                  <MetricRow label="First Contentful Paint" value={pageSpeedData.metrics.fcp} colors={colors} />
                  <MetricRow label="Largest Contentful Paint" value={pageSpeedData.metrics.lcp} colors={colors} />
                  <MetricRow label="Total Blocking Time" value={pageSpeedData.metrics.tbt} colors={colors} />
                  <MetricRow label="Cumulative Layout Shift" value={pageSpeedData.metrics.cls} colors={colors} />
                  <MetricRow label="Speed Index" value={pageSpeedData.metrics.si} colors={colors} />
                </View>
              </SectionCard>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

// Helper Components
function MetricCard({
  label,
  value,
  suffix,
  colors,
  valueColor,
}: {
  label: string;
  value: string;
  suffix?: string;
  colors: ReturnType<typeof useColors>;
  valueColor?: string;
}) {
  return (
    <View
      className="bg-surface rounded-xl p-4 border border-border"
      style={{ width: "47%", minWidth: 140 }}
    >
      <Text className="text-xs text-muted">{label}</Text>
      <View className="flex-row items-baseline mt-1">
        <Text
          className="text-xl font-bold"
          style={{ color: valueColor || colors.foreground }}
        >
          {value}
        </Text>
        {suffix && <Text className="text-xs text-muted ml-1">{suffix}</Text>}
      </View>
    </View>
  );
}

function SectionCard({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
      <Text className="text-base font-semibold text-foreground mb-4">{title}</Text>
      {children}
    </View>
  );
}

function MetricRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View className="flex-row justify-between items-center py-2 border-b border-border">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="text-sm font-medium text-foreground">{value}</Text>
    </View>
  );
}

// Data parsers
function parseTrafficData(data: any): { history: { date: string; visits: number }[]; latestVisits: number | null } {
  try {
    if (!data?.success || !data?.data) return { history: [], latestVisits: null };
    const rawData = data.data as any;
    const visits = rawData?.visits || rawData?.data || [];
    if (Array.isArray(visits)) {
      const history = visits.map((v: any) => ({
        date: v.date?.substring(0, 7) || "",
        visits: v.visits || v.value || 0,
      }));
      return {
        history,
        latestVisits: history.length > 0 ? history[history.length - 1].visits : null,
      };
    }
    return { history: [], latestVisits: null };
  } catch {
    return { history: [], latestVisits: null };
  }
}

function parseChannelData(data: any): { label: string; value: number; color: string }[] {
  try {
    if (!data?.success || !data?.data) return [];
    const rawData = data.data as any;
    const overview = rawData?.overview || rawData?.visits || rawData;
    const channels: { label: string; value: number; color: string }[] = [];

    const channelMap: Record<string, { label: string; color: string }> = {
      "Organic Search": { label: "オーガニック検索", color: "#10B981" },
      "Paid Search": { label: "有料検索", color: "#F59E0B" },
      Direct: { label: "ダイレクト", color: "#1E40AF" },
      Referrals: { label: "リファラル", color: "#8B5CF6" },
      Social: { label: "ソーシャル", color: "#EC4899" },
      "Display Ads": { label: "ディスプレイ広告", color: "#06B6D4" },
      Mail: { label: "メール", color: "#84CC16" },
    };

    if (Array.isArray(overview)) {
      for (const item of overview) {
        const source = item.source_type || item.channel || item.name || "";
        const mapping = channelMap[source] || { label: source, color: "#64748B" };
        const value = item.visits || item.value || item.share || 0;
        if (value > 0) channels.push({ ...mapping, value });
      }
    } else if (typeof overview === "object") {
      for (const [key, val] of Object.entries(overview)) {
        if (typeof val === "number" && val > 0) {
          const mapping = channelMap[key] || { label: key, color: "#64748B" };
          channels.push({ ...mapping, value: val });
        }
      }
    }

    return channels.sort((a, b) => b.value - a.value);
  } catch {
    return [];
  }
}

function parseBounceRate(data: any): number | null {
  try {
    if (!data?.success || !data?.data) return null;
    const rawData = data.data as any;
    const values = rawData?.bounce_rate || rawData?.data || rawData;
    if (Array.isArray(values) && values.length > 0) {
      return values[values.length - 1]?.bounce_rate || values[values.length - 1]?.value || null;
    }
    if (typeof values === "number") return values;
    return null;
  } catch {
    return null;
  }
}

function parseGlobalRank(data: any): number | null {
  try {
    if (!data?.success || !data?.data) return null;
    const rawData = data.data as any;
    const ranks = rawData?.global_rank || rawData?.data || rawData;
    if (Array.isArray(ranks) && ranks.length > 0) {
      return ranks[ranks.length - 1]?.global_rank || ranks[ranks.length - 1]?.value || null;
    }
    if (typeof ranks === "number") return ranks;
    return null;
  } catch {
    return null;
  }
}
