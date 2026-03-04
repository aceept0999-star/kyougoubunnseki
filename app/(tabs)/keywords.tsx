import { useState, useMemo, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useSites } from "@/lib/sites-context";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BarChart, formatNumber, CHART_COLORS } from "@/components/charts";

type TabType = "ranking" | "gap";
type GapCategory = "shared" | "ownOnly" | "competitorOnly";
import {
  filterKeywords,
  sortKeywords,
  type PositionFilter,
  type VolumeFilter,
  type SortField,
  type SortDirection,
} from "@/lib/keyword-filters";

// ===== Shared Filter/Search Components =====

function SearchBar({
  value,
  onChangeText,
  colors,
}: {
  value: string;
  onChangeText: (t: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View
      style={[
        styles.searchBar,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="キーワードを検索..."
        placeholderTextColor={colors.muted}
        style={[styles.searchInput, { color: colors.foreground }]}
        returnKeyType="done"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText("")} style={{ padding: 4 }}>
          <IconSymbol name="xmark" size={14} color={colors.muted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: active ? colors.primary : colors.surface,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
      activeOpacity={0.7}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: "600",
          color: active ? "#FFFFFF" : colors.foreground,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SortButton({
  label,
  field,
  currentField,
  currentDirection,
  onPress,
  colors,
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  currentDirection: SortDirection;
  onPress: (field: SortField) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const isActive = currentField === field;
  return (
    <TouchableOpacity
      onPress={() => onPress(field)}
      style={[styles.sortButton]}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.thNum,
          {
            color: isActive ? colors.primary : colors.muted,
            fontWeight: isActive ? "700" : "600",
          },
        ]}
      >
        {label}
        {isActive && (currentDirection === "asc" ? " \u2191" : " \u2193")}
      </Text>
    </TouchableOpacity>
  );
}

function FilterBar({
  searchQuery,
  onSearchChange,
  positionFilter,
  onPositionFilterChange,
  volumeFilter,
  onVolumeFilterChange,
  resultCount,
  totalCount,
  colors,
}: {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  positionFilter: PositionFilter;
  onPositionFilterChange: (f: PositionFilter) => void;
  volumeFilter: VolumeFilter;
  onVolumeFilterChange: (f: VolumeFilter) => void;
  resultCount: number;
  totalCount: number;
  colors: ReturnType<typeof useColors>;
}) {
  const [showFilters, setShowFilters] = useState(false);
  const hasActiveFilters = positionFilter !== "all" || volumeFilter !== "all" || searchQuery.length > 0;

  return (
    <View className="px-5 mt-4">
      {/* Search + Filter Toggle */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <SearchBar value={searchQuery} onChangeText={onSearchChange} colors={colors} />
        </View>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={[
            styles.filterToggle,
            {
              backgroundColor: hasActiveFilters ? colors.primary : colors.surface,
              borderColor: hasActiveFilters ? colors.primary : colors.border,
            },
          ]}
          activeOpacity={0.7}
        >
          <IconSymbol
            name="line.3.horizontal.decrease"
            size={18}
            color={hasActiveFilters ? "#FFFFFF" : colors.foreground}
          />
        </TouchableOpacity>
      </View>

      {/* Filter Panels */}
      {showFilters && (
        <View className="mt-3 bg-surface rounded-xl p-3 border border-border">
          {/* Position Filter */}
          <Text style={{ fontSize: 11, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>
            順位フィルター
          </Text>
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
            <FilterChip label="全て" active={positionFilter === "all"} onPress={() => onPositionFilterChange("all")} colors={colors} />
            <FilterChip label="Top 3" active={positionFilter === "top3"} onPress={() => onPositionFilterChange("top3")} colors={colors} />
            <FilterChip label="Top 10" active={positionFilter === "top10"} onPress={() => onPositionFilterChange("top10")} colors={colors} />
            <FilterChip label="Top 20" active={positionFilter === "top20"} onPress={() => onPositionFilterChange("top20")} colors={colors} />
          </View>

          {/* Volume Filter */}
          <Text style={{ fontSize: 11, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>
            検索ボリューム
          </Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <FilterChip label="全て" active={volumeFilter === "all"} onPress={() => onVolumeFilterChange("all")} colors={colors} />
            <FilterChip label="高 (1000+)" active={volumeFilter === "high"} onPress={() => onVolumeFilterChange("high")} colors={colors} />
            <FilterChip label="中 (100-999)" active={volumeFilter === "medium"} onPress={() => onVolumeFilterChange("medium")} colors={colors} />
            <FilterChip label="低 (<100)" active={volumeFilter === "low"} onPress={() => onVolumeFilterChange("low")} colors={colors} />
          </View>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <TouchableOpacity
              onPress={() => {
                onSearchChange("");
                onPositionFilterChange("all");
                onVolumeFilterChange("all");
              }}
              style={{ marginTop: 10, alignSelf: "flex-end" }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>
                フィルターをクリア
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Result Count */}
      {hasActiveFilters && (
        <Text style={{ fontSize: 11, color: colors.muted, marginTop: 6 }}>
          {totalCount}件中 {resultCount}件を表示
        </Text>
      )}
    </View>
  );
}

// ===== Main Screen =====

export default function KeywordsScreen() {
  const colors = useColors();
  const { sites } = useSites();
  const [activeTab, setActiveTab] = useState<TabType>("ranking");
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [ownDomain, setOwnDomain] = useState<string>("");
  const [compDomain, setCompDomain] = useState<string>("");
  const [gapCategory, setGapCategory] = useState<GapCategory>("shared");

  const ownSites = useMemo(() => sites.filter((s) => s.isOwn), [sites]);
  const competitorSites = useMemo(() => sites.filter((s) => !s.isOwn), [sites]);

  const effectiveDomain = selectedDomain || sites[0]?.domain || "";
  const effectiveOwn = ownDomain || ownSites[0]?.domain || "";
  const effectiveComp = compDomain || competitorSites[0]?.domain || "";

  return (
    <ScreenContainer>
      <View className="px-5 pt-4 pb-2">
        <Text className="text-2xl font-bold text-foreground">キーワード分析</Text>
        <Text className="text-sm text-muted mt-1">
          SEOキーワードランキングと差分分析
        </Text>
      </View>

      {/* Tab Switcher */}
      <View className="flex-row mx-5 mt-3 bg-surface rounded-xl p-1 border border-border">
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "ranking" && { backgroundColor: colors.primary }]}
          onPress={() => setActiveTab("ranking")}
          activeOpacity={0.7}
        >
          <IconSymbol
            name="text.magnifyingglass"
            size={16}
            color={activeTab === "ranking" ? "#FFFFFF" : colors.muted}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "ranking" ? "#FFFFFF" : colors.foreground },
            ]}
          >
            ランキング
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "gap" && { backgroundColor: colors.primary }]}
          onPress={() => setActiveTab("gap")}
          activeOpacity={0.7}
        >
          <IconSymbol
            name="arrow.left.arrow.right"
            size={16}
            color={activeTab === "gap" ? "#FFFFFF" : colors.muted}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "gap" ? "#FFFFFF" : colors.foreground },
            ]}
          >
            キーワードギャップ
          </Text>
        </TouchableOpacity>
      </View>

      {sites.length === 0 ? (
        <View className="items-center mt-16 px-8">
          <IconSymbol name="key.fill" size={48} color={colors.muted} />
          <Text className="text-lg font-semibold text-foreground mt-4">
            サイトが登録されていません
          </Text>
          <Text className="text-sm text-muted text-center mt-2">
            ダッシュボードからサイトを追加してください
          </Text>
        </View>
      ) : activeTab === "ranking" ? (
        <KeywordRankingTab
          sites={sites}
          selectedDomain={effectiveDomain}
          onSelectDomain={setSelectedDomain}
          colors={colors}
        />
      ) : (
        <KeywordGapTab
          ownSites={ownSites}
          competitorSites={competitorSites}
          allSites={sites}
          ownDomain={effectiveOwn}
          compDomain={effectiveComp}
          onSelectOwn={setOwnDomain}
          onSelectComp={setCompDomain}
          gapCategory={gapCategory}
          onSetGapCategory={setGapCategory}
          colors={colors}
        />
      )}
    </ScreenContainer>
  );
}

// ===== Keyword Ranking Tab =====
function KeywordRankingTab({
  sites,
  selectedDomain,
  onSelectDomain,
  colors,
}: {
  sites: { id: string; domain: string; name: string; isOwn: boolean }[];
  selectedDomain: string;
  onSelectDomain: (d: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("all");
  const [volumeFilter, setVolumeFilter] = useState<VolumeFilter>("all");
  const [sortField, setSortField] = useState<SortField>("position");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const keywords = trpc.analysis.getDomainKeywords.useQuery(
    { domain: selectedDomain, limit: 30 },
    { enabled: !!selectedDomain }
  );

  const parsedKeywords = useMemo(() => {
    if (!keywords.data?.success || !keywords.data?.data) return [];
    const tasks = (keywords.data.data as any)?.tasks || [];
    const items = tasks[0]?.result?.[0]?.items || [];
    return items.map((item: any) => ({
      keyword: item.keyword_data?.keyword || "",
      position: item.ranked_serp_element?.serp_item?.rank_absolute || 0,
      searchVolume: item.keyword_data?.keyword_info?.search_volume || 0,
      cpc: item.keyword_data?.keyword_info?.cpc || 0,
      competition: item.keyword_data?.keyword_info?.competition || 0,
      etv: item.ranked_serp_element?.serp_item?.etv || 0,
    }));
  }, [keywords.data]);

  const filteredKeywords = useMemo(() => {
    const filtered = filterKeywords(parsedKeywords, searchQuery, positionFilter, volumeFilter, "position");
    return sortKeywords(filtered, sortField, sortDirection, "position");
  }, [parsedKeywords, searchQuery, positionFilter, volumeFilter, sortField, sortDirection]);

  const handleSortPress = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDirection(field === "position" ? "asc" : "desc");
      return field;
    });
  }, []);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Domain Selector */}
      <View className="px-5 mt-4">
        <Text className="text-sm font-medium text-foreground mb-2">分析対象サイト</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {sites.map((site) => (
              <TouchableOpacity
                key={site.id}
                onPress={() => onSelectDomain(site.domain)}
                style={[
                  styles.chipButton,
                  {
                    backgroundColor: selectedDomain === site.domain ? colors.primary : colors.surface,
                    borderColor: selectedDomain === site.domain ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: site.isOwn ? colors.primary : colors.warning,
                    marginRight: 4,
                  }}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "500",
                    color: selectedDomain === site.domain ? "#FFFFFF" : colors.foreground,
                  }}
                >
                  {site.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {keywords.isLoading && (
        <View className="items-center mt-12">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-sm text-muted mt-3">キーワードデータを取得中...</Text>
        </View>
      )}

      {keywords.isError && (
        <View className="items-center mt-12 px-5">
          <IconSymbol name="info.circle.fill" size={32} color={colors.error} />
          <Text className="text-sm text-error mt-3 text-center">
            データの取得に失敗しました
          </Text>
          <TouchableOpacity
            onPress={() => keywords.refetch()}
            style={[styles.retryButton, { borderColor: colors.primary }]}
          >
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>再試行</Text>
          </TouchableOpacity>
        </View>
      )}

      {!keywords.isLoading && !keywords.isError && parsedKeywords.length > 0 && (
        <>
          {/* Filter Bar */}
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            positionFilter={positionFilter}
            onPositionFilterChange={setPositionFilter}
            volumeFilter={volumeFilter}
            onVolumeFilterChange={setVolumeFilter}
            resultCount={filteredKeywords.length}
            totalCount={parsedKeywords.length}
            colors={colors}
          />

          {/* Summary */}
          <View className="flex-row px-5 mt-4 gap-3">
            <View className="flex-1 bg-surface rounded-xl p-3 border border-border">
              <Text className="text-xs text-muted">表示件数</Text>
              <Text className="text-xl font-bold text-foreground mt-1">
                {filteredKeywords.length}
              </Text>
            </View>
            <View className="flex-1 bg-surface rounded-xl p-3 border border-border">
              <Text className="text-xs text-muted">平均順位</Text>
              <Text className="text-xl font-bold text-primary mt-1">
                {filteredKeywords.length > 0
                  ? (filteredKeywords.reduce((s: number, k: any) => s + k.position, 0) / filteredKeywords.length).toFixed(1)
                  : "-"}
              </Text>
            </View>
            <View className="flex-1 bg-surface rounded-xl p-3 border border-border">
              <Text className="text-xs text-muted">合計ETV</Text>
              <Text className="text-xl font-bold text-foreground mt-1">
                {formatNumber(filteredKeywords.reduce((s: number, k: any) => s + k.etv, 0))}
              </Text>
            </View>
          </View>

          {/* Top Keywords Bar Chart */}
          {filteredKeywords.length > 0 && (
            <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
              <Text className="text-base font-semibold text-foreground mb-4">
                検索ボリューム上位キーワード
              </Text>
              <BarChart
                data={[...filteredKeywords]
                  .sort((a: any, b: any) => b.searchVolume - a.searchVolume)
                  .slice(0, 8)
                  .map((k: any, i: number) => ({
                    label: k.keyword.length > 8 ? k.keyword.slice(0, 8) + "\u2026" : k.keyword,
                    value: k.searchVolume,
                    color: CHART_COLORS[i % CHART_COLORS.length],
                  }))}
                height={180}
              />
            </View>
          )}

          {/* Keyword Table */}
          <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
            <Text className="text-base font-semibold text-foreground mb-4">
              キーワードランキング一覧
            </Text>
            {/* Sortable Header */}
            <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.thKeyword, { color: colors.muted }]}>キーワード</Text>
              <SortButton label="順位" field="position" currentField={sortField} currentDirection={sortDirection} onPress={handleSortPress} colors={colors} />
              <SortButton label="検索量" field="searchVolume" currentField={sortField} currentDirection={sortDirection} onPress={handleSortPress} colors={colors} />
              <SortButton label="CPC" field="cpc" currentField={sortField} currentDirection={sortDirection} onPress={handleSortPress} colors={colors} />
              <SortButton label="競合度" field="competition" currentField={sortField} currentDirection={sortDirection} onPress={handleSortPress} colors={colors} />
            </View>
            {filteredKeywords.length === 0 ? (
              <View style={{ paddingVertical: 20, alignItems: "center" }}>
                <Text style={{ fontSize: 13, color: colors.muted }}>
                  条件に一致するキーワードがありません
                </Text>
              </View>
            ) : (
              filteredKeywords.map((kw: any, i: number) => (
                <View
                  key={i}
                  style={[styles.tableRow, { borderBottomColor: colors.border }]}
                >
                  <Text style={[styles.tdKeyword, { color: colors.foreground }]} numberOfLines={1}>
                    {kw.keyword}
                  </Text>
                  <View style={styles.tdNumWrap}>
                    <PositionBadge position={kw.position} colors={colors} />
                  </View>
                  <Text style={[styles.tdNum, { color: colors.foreground }]}>
                    {formatNumber(kw.searchVolume)}
                  </Text>
                  <Text style={[styles.tdNum, { color: colors.foreground }]}>
                    {kw.cpc > 0 ? `$${kw.cpc.toFixed(2)}` : "-"}
                  </Text>
                  <Text style={[styles.tdNum, { color: colors.foreground }]}>
                    {(kw.competition * 100).toFixed(0)}%
                  </Text>
                </View>
              ))
            )}
          </View>
        </>
      )}

      {!keywords.isLoading && !keywords.isError && parsedKeywords.length === 0 && selectedDomain && (
        <View className="items-center mt-12 px-5">
          <Text className="text-sm text-muted text-center">
            このドメインのキーワードデータが見つかりませんでした
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// ===== Keyword Gap Tab =====
function KeywordGapTab({
  ownSites,
  competitorSites,
  allSites,
  ownDomain,
  compDomain,
  onSelectOwn,
  onSelectComp,
  gapCategory,
  onSetGapCategory,
  colors,
}: {
  ownSites: { id: string; domain: string; name: string }[];
  competitorSites: { id: string; domain: string; name: string }[];
  allSites: { id: string; domain: string; name: string; isOwn: boolean }[];
  ownDomain: string;
  compDomain: string;
  onSelectOwn: (d: string) => void;
  onSelectComp: (d: string) => void;
  gapCategory: GapCategory;
  onSetGapCategory: (c: GapCategory) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("all");
  const [volumeFilter, setVolumeFilter] = useState<VolumeFilter>("all");
  const [sortField, setSortField] = useState<SortField>("searchVolume");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const canAnalyze = !!ownDomain && !!compDomain && ownDomain !== compDomain;

  const gapData = trpc.analysis.getKeywordGap.useQuery(
    { ownDomain, competitorDomain: compDomain },
    { enabled: canAnalyze }
  );

  const gapResult = gapData.data?.success ? gapData.data.data : null;

  const currentKeywords = useMemo(() => {
    if (!gapResult) return [];
    switch (gapCategory) {
      case "shared":
        return gapResult.shared.keywords;
      case "ownOnly":
        return gapResult.ownOnly.keywords;
      case "competitorOnly":
        return gapResult.competitorOnly.keywords;
    }
  }, [gapResult, gapCategory]);

  const filteredKeywords = useMemo(() => {
    const filtered = filterKeywords(currentKeywords, searchQuery, positionFilter, volumeFilter, "position1");
    return sortKeywords(filtered, sortField, sortDirection, "position1");
  }, [currentKeywords, searchQuery, positionFilter, volumeFilter, sortField, sortDirection]);

  const handleSortPress = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDirection(field === "position" ? "asc" : "desc");
      return field;
    });
  }, []);

  const ownName = allSites.find((s) => s.domain === ownDomain)?.name || ownDomain;
  const compName = allSites.find((s) => s.domain === compDomain)?.name || compDomain;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Domain Selectors */}
      <View className="px-5 mt-4">
        <Text className="text-sm font-medium text-foreground mb-2">自社サイト</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(ownSites.length > 0 ? ownSites : allSites).map((site) => (
              <TouchableOpacity
                key={site.id}
                onPress={() => onSelectOwn(site.domain)}
                style={[
                  styles.chipButton,
                  {
                    backgroundColor: ownDomain === site.domain ? colors.primary : colors.surface,
                    borderColor: ownDomain === site.domain ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "500",
                    color: ownDomain === site.domain ? "#FFFFFF" : colors.foreground,
                  }}
                >
                  {site.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View className="px-5 mt-3">
        <Text className="text-sm font-medium text-foreground mb-2">競合サイト</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(competitorSites.length > 0 ? competitorSites : allSites).map((site) => (
              <TouchableOpacity
                key={site.id}
                onPress={() => onSelectComp(site.domain)}
                style={[
                  styles.chipButton,
                  {
                    backgroundColor: compDomain === site.domain ? colors.warning : colors.surface,
                    borderColor: compDomain === site.domain ? colors.warning : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "500",
                    color: compDomain === site.domain ? "#FFFFFF" : colors.foreground,
                  }}
                >
                  {site.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {!canAnalyze && (
        <View className="items-center mt-12 px-5">
          <IconSymbol name="arrow.left.arrow.right" size={40} color={colors.muted} />
          <Text className="text-sm text-muted text-center mt-3">
            自社サイトと競合サイトをそれぞれ選択してください
          </Text>
        </View>
      )}

      {canAnalyze && gapData.isLoading && (
        <View className="items-center mt-12">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-sm text-muted mt-3">キーワードギャップを分析中...</Text>
        </View>
      )}

      {canAnalyze && gapData.isError && (
        <View className="items-center mt-12 px-5">
          <IconSymbol name="info.circle.fill" size={32} color={colors.error} />
          <Text className="text-sm text-error mt-3 text-center">分析に失敗しました</Text>
          <TouchableOpacity
            onPress={() => gapData.refetch()}
            style={[styles.retryButton, { borderColor: colors.primary }]}
          >
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>再試行</Text>
          </TouchableOpacity>
        </View>
      )}

      {canAnalyze && gapResult && (
        <>
          {/* Gap Overview */}
          <View className="mx-5 mt-5 bg-surface rounded-xl p-4 border border-border">
            <Text className="text-base font-semibold text-foreground mb-4">
              キーワードギャップ概要
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
              <GapStatCard
                label="共通"
                count={gapResult.shared.totalCount}
                color={colors.primary}
                icon="checkmark.circle.fill"
                colors={colors}
              />
              <GapStatCard
                label={`${ownName}のみ`}
                count={gapResult.ownOnly.totalCount}
                color={colors.success}
                icon="arrow.up.circle.fill"
                colors={colors}
              />
              <GapStatCard
                label={`${compName}のみ`}
                count={gapResult.competitorOnly.totalCount}
                color={colors.error}
                icon="arrow.down.circle.fill"
                colors={colors}
              />
            </View>

            <GapBar
              shared={gapResult.shared.totalCount}
              ownOnly={gapResult.ownOnly.totalCount}
              compOnly={gapResult.competitorOnly.totalCount}
              colors={colors}
              ownName={ownName}
              compName={compName}
            />
          </View>

          {/* Category Tabs */}
          <View className="flex-row mx-5 mt-4 gap-2">
            <CategoryChip
              label={`共通 (${gapResult.shared.totalCount})`}
              active={gapCategory === "shared"}
              onPress={() => onSetGapCategory("shared")}
              activeColor={colors.primary}
              colors={colors}
            />
            <CategoryChip
              label={`自社のみ (${gapResult.ownOnly.totalCount})`}
              active={gapCategory === "ownOnly"}
              onPress={() => onSetGapCategory("ownOnly")}
              activeColor={colors.success}
              colors={colors}
            />
            <CategoryChip
              label={`競合のみ (${gapResult.competitorOnly.totalCount})`}
              active={gapCategory === "competitorOnly"}
              onPress={() => onSetGapCategory("competitorOnly")}
              activeColor={colors.error}
              colors={colors}
            />
          </View>

          {/* Filter Bar for Gap Keywords */}
          {currentKeywords.length > 0 && (
            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              positionFilter={positionFilter}
              onPositionFilterChange={setPositionFilter}
              volumeFilter={volumeFilter}
              onVolumeFilterChange={setVolumeFilter}
              resultCount={filteredKeywords.length}
              totalCount={currentKeywords.length}
              colors={colors}
            />
          )}

          {/* Keywords List */}
          {currentKeywords.length > 0 && (
            <View className="mx-5 mt-4 bg-surface rounded-xl p-4 border border-border">
              <Text className="text-base font-semibold text-foreground mb-4">
                {gapCategory === "shared"
                  ? "共通キーワード"
                  : gapCategory === "ownOnly"
                  ? `${ownName}のみのキーワード`
                  : `${compName}のみのキーワード`}
              </Text>

              {/* Search Volume Chart */}
              {filteredKeywords.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <BarChart
                    data={[...filteredKeywords]
                      .sort((a: any, b: any) => b.searchVolume - a.searchVolume)
                      .slice(0, 8)
                      .map((kw: any, i: number) => ({
                        label: kw.keyword.length > 6 ? kw.keyword.slice(0, 6) + "\u2026" : kw.keyword,
                        value: kw.searchVolume,
                        color: CHART_COLORS[i % CHART_COLORS.length],
                      }))}
                    height={160}
                  />
                </View>
              )}

              {/* Sortable Table Header */}
              <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.thKeyword, { color: colors.muted }]}>キーワード</Text>
                <SortButton label="検索量" field="searchVolume" currentField={sortField} currentDirection={sortDirection} onPress={handleSortPress} colors={colors} />
                {gapCategory === "shared" ? (
                  <>
                    <SortButton label="自社" field="position" currentField={sortField} currentDirection={sortDirection} onPress={handleSortPress} colors={colors} />
                    <Text style={[styles.thNum, { color: colors.muted }]}>競合</Text>
                  </>
                ) : (
                  <>
                    <SortButton label="順位" field="position" currentField={sortField} currentDirection={sortDirection} onPress={handleSortPress} colors={colors} />
                    <SortButton label="CPC" field="cpc" currentField={sortField} currentDirection={sortDirection} onPress={handleSortPress} colors={colors} />
                  </>
                )}
              </View>

              {filteredKeywords.length === 0 ? (
                <View style={{ paddingVertical: 20, alignItems: "center" }}>
                  <Text style={{ fontSize: 13, color: colors.muted }}>
                    条件に一致するキーワードがありません
                  </Text>
                </View>
              ) : (
                filteredKeywords.map((kw: any, i: number) => (
                  <View
                    key={i}
                    style={[styles.tableRow, { borderBottomColor: colors.border }]}
                  >
                    <Text style={[styles.tdKeyword, { color: colors.foreground }]} numberOfLines={1}>
                      {kw.keyword}
                    </Text>
                    <Text style={[styles.tdNum, { color: colors.foreground }]}>
                      {formatNumber(kw.searchVolume)}
                    </Text>
                    {gapCategory === "shared" ? (
                      <>
                        <View style={styles.tdNumWrap}>
                          <PositionBadge position={kw.position1} colors={colors} />
                        </View>
                        <View style={styles.tdNumWrap}>
                          <PositionBadge position={kw.position2} colors={colors} />
                        </View>
                      </>
                    ) : (
                      <>
                        <View style={styles.tdNumWrap}>
                          <PositionBadge position={kw.position1} colors={colors} />
                        </View>
                        <Text style={[styles.tdNum, { color: colors.foreground }]}>
                          {kw.cpc > 0 ? `$${kw.cpc.toFixed(2)}` : "-"}
                        </Text>
                      </>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

          {currentKeywords.length === 0 && (
            <View className="items-center mt-8 px-5">
              <Text className="text-sm text-muted text-center">
                このカテゴリのキーワードが見つかりませんでした
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

// ===== Sub Components =====

function GapStatCard({
  label,
  count,
  color,
  icon,
  colors,
}: {
  label: string;
  count: number;
  color: string;
  icon: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <IconSymbol name={icon as any} size={24} color={color} />
      <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground, marginTop: 4 }}>
        {formatNumber(count)}
      </Text>
      <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2, textAlign: "center" }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function GapBar({
  shared,
  ownOnly,
  compOnly,
  colors,
  ownName,
  compName,
}: {
  shared: number;
  ownOnly: number;
  compOnly: number;
  colors: ReturnType<typeof useColors>;
  ownName: string;
  compName: string;
}) {
  const total = shared + ownOnly + compOnly || 1;
  const sharedPct = (shared / total) * 100;
  const ownPct = (ownOnly / total) * 100;
  const compPct = (compOnly / total) * 100;

  return (
    <View>
      <View style={{ flexDirection: "row", height: 24, borderRadius: 12, overflow: "hidden" }}>
        {ownPct > 0 && (
          <View style={{ width: `${ownPct}%`, backgroundColor: colors.success }} />
        )}
        {sharedPct > 0 && (
          <View style={{ width: `${sharedPct}%`, backgroundColor: colors.primary }} />
        )}
        {compPct > 0 && (
          <View style={{ width: `${compPct}%`, backgroundColor: colors.error }} />
        )}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
          <Text style={{ fontSize: 10, color: colors.muted }}>{ownName}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />
          <Text style={{ fontSize: 10, color: colors.muted }}>共通</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error }} />
          <Text style={{ fontSize: 10, color: colors.muted }}>{compName}</Text>
        </View>
      </View>
    </View>
  );
}

function CategoryChip({
  label,
  active,
  onPress,
  activeColor,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  activeColor: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.categoryChip,
        {
          backgroundColor: active ? activeColor : colors.surface,
          borderColor: active ? activeColor : colors.border,
        },
      ]}
      activeOpacity={0.7}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: "600",
          color: active ? "#FFFFFF" : colors.foreground,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PositionBadge({
  position,
  colors,
}: {
  position: number | null;
  colors: ReturnType<typeof useColors>;
}) {
  if (!position) return <Text style={{ fontSize: 12, color: colors.muted }}>-</Text>;
  const bgColor =
    position <= 3
      ? colors.success
      : position <= 10
      ? colors.primary
      : position <= 20
      ? colors.warning
      : colors.muted;
  return (
    <Text
      style={[styles.positionBadge, { backgroundColor: bgColor, color: "#FFFFFF" }]}
    >
      {position}
    </Text>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  chipButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "web" ? 10 : 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
    margin: 0,
  },
  filterToggle: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  sortButton: {
    width: 52,
  },
  tableHeader: {
    flexDirection: "row",
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginBottom: 4,
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  thKeyword: {
    flex: 1,
    fontSize: 10,
    fontWeight: "600",
  },
  thNum: {
    width: 52,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "right",
  },
  tdKeyword: {
    flex: 1,
    fontSize: 12,
  },
  tdNum: {
    width: 52,
    fontSize: 12,
    textAlign: "right",
  },
  tdNumWrap: {
    width: 52,
    alignItems: "flex-end",
  },
  positionBadge: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
    textAlign: "center",
    minWidth: 28,
  },
});
