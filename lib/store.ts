import AsyncStorage from "@react-native-async-storage/async-storage";
import { CompetitorSite } from "@/shared/types";

const SITES_KEY = "competitor_sites";

export async function getSites(): Promise<CompetitorSite[]> {
  try {
    const data = await AsyncStorage.getItem(SITES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveSites(sites: CompetitorSite[]): Promise<void> {
  await AsyncStorage.setItem(SITES_KEY, JSON.stringify(sites));
}

export async function addSite(site: Omit<CompetitorSite, "id" | "addedAt">): Promise<CompetitorSite> {
  const sites = await getSites();
  const newSite: CompetitorSite = {
    ...site,
    id: Date.now().toString(),
    addedAt: new Date().toISOString(),
  };
  sites.push(newSite);
  await saveSites(sites);
  return newSite;
}

export async function removeSite(id: string): Promise<void> {
  const sites = await getSites();
  const filtered = sites.filter((s) => s.id !== id);
  await saveSites(filtered);
}

export async function updateSite(id: string, updates: Partial<CompetitorSite>): Promise<void> {
  const sites = await getSites();
  const index = sites.findIndex((s) => s.id === id);
  if (index >= 0) {
    sites[index] = { ...sites[index], ...updates };
    await saveSites(sites);
  }
}
