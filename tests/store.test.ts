import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => mockStorage[key] || null),
    setItem: vi.fn(async (key: string, value: string) => {
      mockStorage[key] = value;
    }),
    removeItem: vi.fn(async (key: string) => {
      delete mockStorage[key];
    }),
    clear: vi.fn(async () => {
      Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    }),
  },
}));

import { getSites, saveSites, addSite, removeSite, updateSite, clearAllSites } from "@/lib/store";

describe("Store - Site Management", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  it("should return empty array when no sites exist", async () => {
    const sites = await getSites();
    expect(sites).toEqual([]);
  });

  it("should save and retrieve sites", async () => {
    const testSites = [
      {
        id: "1",
        domain: "example.com",
        name: "Example",
        isOwn: true,
        addedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    await saveSites(testSites);
    const sites = await getSites();
    expect(sites).toEqual(testSites);
  });

  it("should add a new site with generated id and timestamp", async () => {
    const newSite = await addSite({
      domain: "test.com",
      name: "Test Site",
      isOwn: false,
    });

    expect(newSite.domain).toBe("test.com");
    expect(newSite.name).toBe("Test Site");
    expect(newSite.isOwn).toBe(false);
    expect(newSite.id).toBeDefined();
    expect(newSite.addedAt).toBeDefined();

    const sites = await getSites();
    expect(sites).toHaveLength(1);
    expect(sites[0].domain).toBe("test.com");
  });

  it("should add multiple sites", async () => {
    await addSite({ domain: "site1.com", name: "Site 1", isOwn: true });
    await addSite({ domain: "site2.com", name: "Site 2", isOwn: false });
    await addSite({ domain: "site3.com", name: "Site 3", isOwn: false });

    const sites = await getSites();
    expect(sites).toHaveLength(3);
  });

  it("should remove a site by id", async () => {
    // Add sites sequentially with unique timestamps
    const site1 = await addSite({ domain: "site1.com", name: "Site 1", isOwn: true });
    // Small delay to ensure different IDs
    await new Promise((r) => setTimeout(r, 5));
    const site2 = await addSite({ domain: "site2.com", name: "Site 2", isOwn: false });

    // Verify both were added
    const beforeRemove = await getSites();
    expect(beforeRemove).toHaveLength(2);

    await removeSite(site1.id);

    const sites = await getSites();
    expect(sites).toHaveLength(1);
    expect(sites[0].domain).toBe("site2.com");
  });

  it("should update a site", async () => {
    const site = await addSite({ domain: "old.com", name: "Old Name", isOwn: false });

    await updateSite(site.id, { name: "New Name", isOwn: true });

    const sites = await getSites();
    expect(sites[0].name).toBe("New Name");
    expect(sites[0].isOwn).toBe(true);
    expect(sites[0].domain).toBe("old.com");
  });

  it("should clear all sites with clearAllSites", async () => {
    await addSite({ domain: "site1.com", name: "Site 1", isOwn: true });
    await addSite({ domain: "site2.com", name: "Site 2", isOwn: false });
    await addSite({ domain: "site3.com", name: "Site 3", isOwn: false });

    const before = await getSites();
    expect(before).toHaveLength(3);

    await clearAllSites();

    const after = await getSites();
    expect(after).toHaveLength(0);
  });
});
