import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { CompetitorSite } from "@/shared/types";
import * as store from "./store";
import { PRESET_SITES } from "./preset-data";

const INIT_KEY = "preset_initialized";

interface SitesContextType {
  sites: CompetitorSite[];
  loading: boolean;
  addSite: (site: Omit<CompetitorSite, "id" | "addedAt">) => Promise<CompetitorSite>;
  removeSite: (id: string) => Promise<void>;
  refreshSites: () => Promise<void>;
  resetAllSites: () => Promise<void>;
}

const SitesContext = createContext<SitesContextType | null>(null);

export function SitesProvider({ children }: { children: React.ReactNode }) {
  const [sites, setSites] = useState<CompetitorSite[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshSites = useCallback(async () => {
    setLoading(true);
    const data = await store.getSites();
    setSites(data);
    setLoading(false);
  }, []);

  // 初回起動時にプリセットデータを自動登録
  useEffect(() => {
    (async () => {
      try {
        const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
        const initialized = await AsyncStorage.getItem(INIT_KEY);
        if (!initialized) {
          const existingSites = await store.getSites();
          if (existingSites.length === 0) {
            for (const preset of PRESET_SITES) {
              await store.addSite({
                domain: preset.domain,
                name: preset.name,
                isOwn: preset.isOwn,
              });
            }
            await AsyncStorage.setItem(INIT_KEY, "true");
          }
        }
      } catch (e) {
        // ignore initialization errors
      }
      await refreshSites();
    })();
  }, [refreshSites]);

  const addSite = useCallback(
    async (site: Omit<CompetitorSite, "id" | "addedAt">) => {
      const newSite = await store.addSite(site);
      setSites((prev) => [...prev, newSite]);
      return newSite;
    },
    []
  );

  const removeSite = useCallback(async (id: string) => {
    await store.removeSite(id);
    setSites((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const resetAllSites = useCallback(async () => {
    // 全サイトとライブデータを削除し、初期化フラグもリセット
    await store.clearAllSites();
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.removeItem(INIT_KEY);
    // ライブデータキーを全削除
    const allKeys = await AsyncStorage.getAllKeys();
    const liveKeys = allKeys.filter((k) => k.startsWith("live_data_"));
    if (liveKeys.length > 0) {
      await AsyncStorage.multiRemove(liveKeys);
    }
    setSites([]);
  }, []);

  return (
    <SitesContext.Provider value={{ sites, loading, addSite, removeSite, refreshSites, resetAllSites }}>
      {children}
    </SitesContext.Provider>
  );
}

export function useSites() {
  const ctx = useContext(SitesContext);
  if (!ctx) throw new Error("useSites must be used within SitesProvider");
  return ctx;
}
