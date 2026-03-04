export type PositionFilter = "all" | "top3" | "top10" | "top20";
export type VolumeFilter = "all" | "high" | "medium" | "low";
export type SortField = "position" | "searchVolume" | "cpc" | "competition";
export type SortDirection = "asc" | "desc";

export function filterKeywords(
  keywords: any[],
  searchQuery: string,
  positionFilter: PositionFilter,
  volumeFilter: VolumeFilter,
  positionKey: string = "position",
): any[] {
  return keywords.filter((kw) => {
    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      if (!kw.keyword.toLowerCase().includes(q)) return false;
    }
    // Position filter
    const pos = kw[positionKey] || kw.position1 || 0;
    if (positionFilter === "top3" && pos > 3) return false;
    if (positionFilter === "top10" && pos > 10) return false;
    if (positionFilter === "top20" && pos > 20) return false;
    // Volume filter
    const vol = kw.searchVolume || 0;
    if (volumeFilter === "high" && vol < 1000) return false;
    if (volumeFilter === "medium" && (vol < 100 || vol >= 1000)) return false;
    if (volumeFilter === "low" && vol >= 100) return false;
    return true;
  });
}

export function sortKeywords(
  keywords: any[],
  sortField: SortField,
  sortDirection: SortDirection,
  positionKey: string = "position",
): any[] {
  return [...keywords].sort((a, b) => {
    let aVal: number, bVal: number;
    switch (sortField) {
      case "position":
        aVal = a[positionKey] || a.position1 || 999;
        bVal = b[positionKey] || b.position1 || 999;
        break;
      case "searchVolume":
        aVal = a.searchVolume || 0;
        bVal = b.searchVolume || 0;
        break;
      case "cpc":
        aVal = a.cpc || 0;
        bVal = b.cpc || 0;
        break;
      case "competition":
        aVal = a.competition || 0;
        bVal = b.competition || 0;
        break;
      default:
        return 0;
    }
    return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
  });
}
