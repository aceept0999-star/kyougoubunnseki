import { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { BarChart, LineChart, PieChart, HorizontalBar, formatNumber } from "@/components/charts";
import { getPresetData, formatLargeNumber, type PresetSiteData } from "@/lib/preset-data";
import { exportCsv, exportHtmlReport } from "@/lib/export-utils";

type TabId = "overview" | "channels" | "keywords" | "speed";

export default function SiteDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ domain: string; name: string }>();
  const domain = params.domain || "";
  const siteName = params.name || domain;
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // プリセットデータ
  const preset = getPresetData(domain);

  // API queries (only when no preset data or for live data)
  const pageSpeed = trpc.analysis.getPageSpeed.useQuery(
    { url: `https://${domain}`, strategy: "mobile" },
    { enabled: !!domain && activeTab === "speed" }
  );

  const pageSpeedData = pageSpeed.data?.success ? pageSpeed.data.data : null;

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "概要" },
    { id: "channels", label: "チャネル" },
    { id: "keywords", label: "キーワード" },
    { id: "speed", label: "速度" },
  ];

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
          onPress={async () => {
            try {
              const siteData = [{ domain, name: siteName, isOwn: false }];
              await exportCsv(siteData, "full");
              Alert.alert("完了", `${siteName}のデータをエクスポートしました`);
            } catch (e) {
              Alert.alert("エラー", "エクスポートに失敗しました");
            }
          }}
          style={{ padding: 8 }}
        >
          <IconSymbol name="square.and.arrow.up" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View className="flex-row px-5 pt-3 pb-1 border-b border-border">
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[
              styles.tab,
              activeTab === tab.id && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            activeOpacity={0.7}
          >
            <Text
              className={`text-sm font-medium ${activeTab === tab.id ? "text-primary" : "text-muted"}`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {activeTab === "overview" && <OverviewTab preset={preset} colors={colors} />}
        {activeTab === "channels" && <ChannelsTab preset={preset} colors={colors} />}
        {activeTab === "keywords" && <KeywordsTab preset={preset} colors={colors} />}
        {activeTab === "speed" && (
          <SpeedTab
            pageSpeedData={pageSpeedData}
            isLoading={pageSpeed.isLoading}
            onRefetch={pageSpeed.refetch}
            colors={colors}
          />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

// ===== Overview Tab =====
function OverviewTab({ preset, colors }: { preset: PresetSiteData | null; colors: ReturnType<typeof useColors> }) {
  if (!preset) {
    return (
      <View className="items-center mt-12 px-8">
        <IconSymbol name="chart.bar.fill" size={40} color={colors.muted} />
        <Text className="text-sm text-muted text-center mt-3">
          このサイトのプリセットデータはありません。{"\n"}APIからデータを取得するには「速度」タブをご利用ください。
        </Text>
      </View>
    );
  }

  const eng = preset.engagement;

  return (
    <>
      {/* Engagement Metrics */}
      <View className="flex-row flex-wrap px-5 mt-4 gap-3">
        <MetricCard label="月間セッション数" value={formatLargeNumber(eng.monthlySessions)} colors={colors} />
        <MetricCard label="月間ユニーク訪問者" value={formatLargeNumber(eng.monthlyUniqueVisitors)} colors={colors} />
        <MetricCard label="滞在時間" value={eng.avgDuration} colors={colors} />
        <MetricCard label="平均ページビュー" value={eng.avgPageViews.toFixed(2)} colors={colors} />
        <MetricCard
          label="直帰率"
          value={`${(eng.bounceRate * 100).toFixed(2)}%`}
          colors={colors}
          valueColor={eng.bounceRate > 0.7 ? colors.error : eng.bounceRate > 0.5 ? colors.warning : colors.success}
        />
        <MetricCard label="総ページビュー" value={formatLargeNumber(eng.totalPageViews)} colors={colors} />
        <MetricCard label="訪問/ユニーク比" value={eng.visitsPerUniqueVisitor.toFixed(2)} colors={colors} />
        <MetricCard label="アクセスシェア" value={`${preset.accessShare}%`} colors={colors} />
      </View>

      {/* Detailed Engagement Table */}
      <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
        <Text className="text-base font-semibold text-foreground mb-4">エンゲージメント詳細</Text>
        <DetailRow label="月間セッション数" value={eng.monthlySessions.toLocaleString()} colors={colors} />
        <DetailRow label="月間ユニーク訪問者数" value={eng.monthlyUniqueVisitors.toLocaleString()} colors={colors} />
        <DetailRow label="訪問数/ユニーク訪問者数" value={eng.visitsPerUniqueVisitor.toFixed(2)} colors={colors} />
        <DetailRow label="重複排除オーディエンス" value={eng.deduplicatedAudience.toLocaleString()} colors={colors} />
        <DetailRow label="平均滞在時間" value={eng.avgDuration} colors={colors} />
        <DetailRow label="平均ページビュー数" value={eng.avgPageViews.toFixed(2)} colors={colors} />
        <DetailRow label="直帰率" value={`${(eng.bounceRate * 100).toFixed(2)}%`} colors={colors} />
        <DetailRow label="ページビュー数" value={eng.totalPageViews.toLocaleString()} colors={colors} last />
      </View>

      {/* Search Traffic */}
      <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
        <Text className="text-base font-semibold text-foreground mb-4">検索トラフィック</Text>
        <DetailRow label="検索トラフィック合計" value={formatLargeNumber(preset.searchTraffic.total)} colors={colors} />
        <DetailRow label="オーガニック検索" value={`${preset.searchTraffic.organicPercent}%`} colors={colors} />
        <DetailRow label="有料検索" value={`${preset.searchTraffic.paidPercent}%`} colors={colors} />
        <DetailRow label="ディスプレイ広告訪問" value={preset.displayAds.toLocaleString()} colors={colors} />
        <DetailRow label="ソーシャルトラフィック" value={preset.socialTraffic.toLocaleString()} colors={colors} last />
      </View>
    </>
  );
}

// ===== Channels Tab =====
function ChannelsTab({ preset, colors }: { preset: PresetSiteData | null; colors: ReturnType<typeof useColors> }) {
  if (!preset) {
    return (
      <View className="items-center mt-12 px-8">
        <Text className="text-sm text-muted text-center">プリセットデータがありません</Text>
      </View>
    );
  }

  const ch = preset.channels;
  const channelData = [
    { label: "オーガニック検索", value: ch.organicSearch, color: "#10B981" },
    { label: "ダイレクト", value: ch.direct, color: "#1E40AF" },
    { label: "リファラル", value: ch.referral, color: "#8B5CF6" },
    { label: "有料検索", value: ch.paidSearch, color: "#F59E0B" },
    { label: "ディスプレイ広告", value: ch.displayAds, color: "#06B6D4" },
    { label: "ソーシャル", value: ch.social, color: "#EC4899" },
    { label: "メール", value: ch.email, color: "#84CC16" },
  ].filter((c) => c.value > 0);

  return (
    <>
      {/* Total Traffic */}
      <View className="mx-5 mt-4 bg-surface rounded-xl p-4 border border-border">
        <Text className="text-base font-semibold text-foreground mb-2">総トラフィック</Text>
        <Text className="text-3xl font-bold text-primary">{formatLargeNumber(ch.total)}</Text>
        <Text className="text-xs text-muted mt-1">年間累計（Feb 2024 - Jan 2025）</Text>
      </View>

      {/* Channel Breakdown Bar */}
      <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
        <Text className="text-base font-semibold text-foreground mb-4">チャネル別トラフィック</Text>
        <HorizontalBar data={channelData} />
      </View>

      {/* Channel Pie */}
      <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
        <Text className="text-base font-semibold text-foreground mb-4">チャネル構成比</Text>
        <PieChart data={channelData} size={200} />
      </View>

      {/* Channel Detail Table */}
      <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
        <Text className="text-base font-semibold text-foreground mb-4">チャネル詳細</Text>
        {channelData.map((c, i) => (
          <DetailRow
            key={i}
            label={c.label}
            value={`${c.value.toLocaleString()} (${((c.value / ch.total) * 100).toFixed(1)}%)`}
            colors={colors}
            last={i === channelData.length - 1}
            dotColor={c.color}
          />
        ))}
      </View>
    </>
  );
}

// ===== Keywords Tab =====
function KeywordsTab({ preset, colors }: { preset: PresetSiteData | null; colors: ReturnType<typeof useColors> }) {
  if (!preset) {
    return (
      <View className="items-center mt-12 px-8">
        <Text className="text-sm text-muted text-center">プリセットデータがありません</Text>
      </View>
    );
  }

  return (
    <>
      {/* Summary */}
      <View className="mx-5 mt-4 bg-surface rounded-xl p-4 border border-border">
        <Text className="text-base font-semibold text-foreground mb-2">流入キーワード</Text>
        <Text className="text-3xl font-bold text-primary">{preset.totalKeywords.toLocaleString()}</Text>
        <Text className="text-xs text-muted mt-1">キーワード総数</Text>
      </View>

      {/* Top Keywords Chart */}
      <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
        <Text className="text-base font-semibold text-foreground mb-4">Top10 キーワード（クリック数）</Text>
        <BarChart
          data={preset.keywords.slice(0, 10).map((kw) => ({
            label: kw.keyword.length > 8 ? kw.keyword.slice(0, 8) + "…" : kw.keyword,
            value: kw.clicks,
          }))}
          height={200}
        />
      </View>

      {/* Keywords Table */}
      <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
        <Text className="text-base font-semibold text-foreground mb-4">キーワード一覧</Text>
        {/* Header */}
        <View className="flex-row border-b border-border pb-2 mb-1">
          <Text className="w-6 text-[10px] font-medium text-muted">#</Text>
          <Text className="flex-1 text-[10px] font-medium text-muted">キーワード</Text>
          <Text className="w-14 text-[10px] font-medium text-muted text-right">クリック</Text>
          <Text className="w-12 text-[10px] font-medium text-muted text-right">シェア</Text>
          <Text className="w-14 text-[10px] font-medium text-muted text-right">検索回数</Text>
        </View>
        {preset.keywords.map((kw, i) => (
          <View key={i} className="flex-row py-2 border-b border-border items-center">
            <Text className="w-6 text-xs text-muted">{kw.rank}</Text>
            <Text className="flex-1 text-xs text-foreground" numberOfLines={1}>
              {kw.keyword}
            </Text>
            <Text className="w-14 text-xs text-foreground text-right">
              {formatLargeNumber(kw.clicks)}
            </Text>
            <Text className="w-12 text-xs text-muted text-right">{kw.sharePercent}%</Text>
            <Text className="w-14 text-xs text-foreground text-right">
              {typeof kw.searchVolume === "number" ? formatLargeNumber(kw.searchVolume) : kw.searchVolume}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

// ===== Speed Tab =====
function SpeedTab({
  pageSpeedData,
  isLoading,
  onRefetch,
  colors,
}: {
  pageSpeedData: { performanceScore: number; metrics: Record<string, string> } | null;
  isLoading: boolean;
  onRefetch: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  if (isLoading) {
    return (
      <View className="items-center mt-12">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-sm text-muted mt-3">PageSpeed データを取得中...</Text>
      </View>
    );
  }

  if (!pageSpeedData) {
    return (
      <View className="items-center mt-12 px-8">
        <IconSymbol name="arrow.clockwise" size={40} color={colors.muted} />
        <Text className="text-sm text-muted text-center mt-3">
          PageSpeed Insights のデータを取得するには下のボタンをタップしてください
        </Text>
        <TouchableOpacity
          className="bg-primary px-6 py-3 rounded-xl mt-4"
          onPress={onRefetch}
          activeOpacity={0.8}
        >
          <Text className="text-background font-semibold">データを取得</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const score = pageSpeedData.performanceScore;
  const scoreColor = score >= 90 ? colors.success : score >= 50 ? colors.warning : colors.error;

  return (
    <>
      {/* Score */}
      <View className="mx-5 mt-4 bg-surface rounded-xl p-6 border border-border items-center">
        <Text className="text-sm text-muted mb-2">パフォーマンススコア</Text>
        <View
          style={[
            styles.scoreCircle,
            { borderColor: scoreColor },
          ]}
        >
          <Text style={[styles.scoreText, { color: scoreColor }]}>{score}</Text>
        </View>
        <Text className="text-xs text-muted mt-2">/100</Text>
      </View>

      {/* Metrics */}
      <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
        <Text className="text-base font-semibold text-foreground mb-4">Core Web Vitals</Text>
        <DetailRow label="First Contentful Paint" value={pageSpeedData.metrics.fcp} colors={colors} />
        <DetailRow label="Largest Contentful Paint" value={pageSpeedData.metrics.lcp} colors={colors} />
        <DetailRow label="Total Blocking Time" value={pageSpeedData.metrics.tbt} colors={colors} />
        <DetailRow label="Cumulative Layout Shift" value={pageSpeedData.metrics.cls} colors={colors} />
        <DetailRow label="Speed Index" value={pageSpeedData.metrics.si} colors={colors} last />
      </View>

      {/* Refresh */}
      <View className="items-center mt-5">
        <TouchableOpacity
          className="bg-surface border border-border px-5 py-2.5 rounded-xl"
          onPress={onRefetch}
          activeOpacity={0.7}
        >
          <Text className="text-sm text-primary font-medium">再取得</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

// ===== Shared Components =====
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
        <Text className="text-xl font-bold" style={{ color: valueColor || colors.foreground }}>
          {value}
        </Text>
        {suffix && <Text className="text-xs text-muted ml-1">{suffix}</Text>}
      </View>
    </View>
  );
}

function DetailRow({
  label,
  value,
  colors,
  last,
  dotColor,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  last?: boolean;
  dotColor?: string;
}) {
  return (
    <View className={`flex-row justify-between items-center py-2.5 ${last ? "" : "border-b border-border"}`}>
      <View className="flex-row items-center gap-2 flex-1">
        {dotColor && (
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }} />
        )}
        <Text className="text-sm text-muted">{label}</Text>
      </View>
      <Text className="text-sm font-medium text-foreground">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tab: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 8,
    marginHorizontal: 2,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    fontSize: 36,
    fontWeight: "bold",
  },
});
