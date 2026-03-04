import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { CompetitorSite } from "@/shared/types";
import * as store from "./store";

interface SitesContextType {
  sites: CompetitorSite[];
  loading: boolean;
  addSite: (site: Omit<CompetitorSite, "id" | "addedAt">) => Promise<CompetitorSite>;
  removeSite: (id: string) => Promise<void>;
  refreshSites: () => Promise<void>;
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

  useEffect(() => {
    refreshSites();
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

  return (
    <SitesContext.Provider value={{ sites, loading, addSite, removeSite, refreshSites }}>
      {children}
    </SitesContext.Provider>
  );
}

export function useSites() {
  const ctx = useContext(SitesContext);
  if (!ctx) throw new Error("useSites must be used within SitesProvider");
  return ctx;
}
