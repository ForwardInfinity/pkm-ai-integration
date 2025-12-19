"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminStats, getEmbeddingDetails } from "../actions/get-admin-stats";
import type { AdminStats, EmbeddingDetails } from "../types";

/** Query key factory for admin stats */
export const adminStatsKeys = {
  all: ["admin-stats"] as const,
  dashboard: () => [...adminStatsKeys.all, "dashboard"] as const,
  embeddings: () => [...adminStatsKeys.all, "embeddings"] as const,
};

async function fetchAdminStats(): Promise<AdminStats> {
  const result = await getAdminStats();

  if (!result.success) {
    throw new Error(result.error || "Failed to fetch admin stats");
  }

  return result.data!;
}

async function fetchEmbeddingDetails(): Promise<EmbeddingDetails> {
  const result = await getEmbeddingDetails();

  if (!result.success) {
    throw new Error(result.error || "Failed to fetch embedding details");
  }

  return result.data!;
}

/**
 * Hook to fetch dashboard statistics for admin
 */
export function useAdminStats() {
  return useQuery({
    queryKey: adminStatsKeys.dashboard(),
    queryFn: fetchAdminStats,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

/**
 * Hook to fetch detailed embedding statistics
 */
export function useEmbeddingDetails() {
  return useQuery({
    queryKey: adminStatsKeys.embeddings(),
    queryFn: fetchEmbeddingDetails,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
