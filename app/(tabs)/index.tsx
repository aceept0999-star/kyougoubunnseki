import { useState, useCallback } from "react";
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

        {/* Own Sites */}
        {ownSites.length > 0 && (
          <View className="mt-6 px-5">
            <Text className="text-base font-semibold text-foreground mb-3">自社サイト</Text>
            {ownSites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                onPress={() =>
                  router.push({ pathname: "/site-detail", params: { domain: site.domain, name: site.name } })
                }
                onRemove={() => handleRemoveSite(site.id, site.name)}
                colors={colors}
              />
            ))}
          </View>
        )}

        {/* Competitor Sites */}
        {competitorSites.length > 0 && (
          <View className="mt-6 px-5">
            <Text className="text-base font-semibold text-foreground mb-3">競合サイト</Text>
            {competitorSites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
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
  onPress,
  onRemove,
  colors,
}: {
  site: { id: string; domain: string; name: string; isOwn: boolean };
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
