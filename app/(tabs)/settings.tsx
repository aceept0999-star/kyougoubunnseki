import { Text, View, TouchableOpacity, Alert, ScrollView, Linking } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSites } from "@/lib/sites-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SettingsScreen() {
  const colors = useColors();
  const { sites, refreshSites } = useSites();

  const handleClearData = () => {
    Alert.alert(
      "データ消去",
      "すべてのサイトデータを削除しますか？この操作は取り消せません。",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "消去",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.clear();
            await refreshSites();
            Alert.alert("完了", "すべてのデータを消去しました");
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-5 pt-4 pb-2">
          <Text className="text-2xl font-bold text-foreground">設定</Text>
        </View>

        {/* API Info */}
        <View className="mx-5 mt-4 bg-surface rounded-xl border border-border">
          <Text className="text-sm font-semibold text-foreground px-4 pt-4 pb-2">
            API接続情報
          </Text>
          <SettingRow
            icon="checkmark.circle.fill"
            label="SimilarWeb Data API"
            value="接続済み"
            valueColor={colors.success}
            colors={colors}
          />
          <SettingRow
            icon="checkmark.circle.fill"
            label="DataForSEO API"
            value="接続済み"
            valueColor={colors.success}
            colors={colors}
          />
          <SettingRow
            icon="checkmark.circle.fill"
            label="Google PageSpeed API"
            value="接続済み"
            valueColor={colors.success}
            colors={colors}
            isLast
          />
        </View>

        {/* Data Stats */}
        <View className="mx-5 mt-4 bg-surface rounded-xl border border-border">
          <Text className="text-sm font-semibold text-foreground px-4 pt-4 pb-2">
            データ情報
          </Text>
          <SettingRow
            icon="globe"
            label="登録サイト数"
            value={`${sites.length}件`}
            colors={colors}
          />
          <SettingRow
            icon="info.circle.fill"
            label="自社サイト"
            value={`${sites.filter((s) => s.isOwn).length}件`}
            colors={colors}
          />
          <SettingRow
            icon="info.circle.fill"
            label="競合サイト"
            value={`${sites.filter((s) => !s.isOwn).length}件`}
            colors={colors}
            isLast
          />
        </View>

        {/* Links */}
        <View className="mx-5 mt-4 bg-surface rounded-xl border border-border">
          <Text className="text-sm font-semibold text-foreground px-4 pt-4 pb-2">
            外部リンク
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL("https://app.dataforseo.com/")}
            activeOpacity={0.7}
          >
            <SettingRow
              icon="globe"
              label="DataForSEO ダッシュボード"
              value="→"
              colors={colors}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              Linking.openURL(
                "https://developers.google.com/speed/docs/insights/v5/get-started"
              )
            }
            activeOpacity={0.7}
          >
            <SettingRow
              icon="globe"
              label="Google PageSpeed API"
              value="→"
              colors={colors}
              isLast
            />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View className="mx-5 mt-6">
          <TouchableOpacity
            className="bg-error/10 border border-error rounded-xl py-4 px-4"
            onPress={handleClearData}
            activeOpacity={0.7}
          >
            <Text className="text-error text-center font-semibold">
              すべてのデータを消去
            </Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <View className="items-center mt-8">
          <Text className="text-xs text-muted">競合分析 v1.0.0</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function SettingRow({
  icon,
  label,
  value,
  valueColor,
  colors,
  isLast,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
  colors: ReturnType<typeof useColors>;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between px-4 py-3 ${
        !isLast ? "border-b border-border" : ""
      }`}
    >
      <View className="flex-row items-center gap-3">
        <IconSymbol name={icon as any} size={18} color={colors.muted} />
        <Text className="text-sm text-foreground">{label}</Text>
      </View>
      <Text className="text-sm font-medium" style={{ color: valueColor || colors.muted }}>
        {value}
      </Text>
    </View>
  );
}
