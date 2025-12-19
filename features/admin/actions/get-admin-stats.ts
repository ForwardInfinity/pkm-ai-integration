"use server";

import { createClient } from "@/lib/supabase/server";
import type { AdminStats, EmbeddingDetails, EmbeddingFailure } from "../types";

export interface GetAdminStatsResult {
  success: boolean;
  data?: AdminStats;
  error?: string;
}

export interface GetEmbeddingDetailsResult {
  success: boolean;
  data?: EmbeddingDetails;
  error?: string;
}

/**
 * Fetch dashboard statistics for admin
 * Requires admin role - enforced by RPC function
 */
export async function getAdminStats(): Promise<GetAdminStatsResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_admin_dashboard_stats");

    if (error) {
      return { success: false, error: error.message };
    }

    // RPC returns an array, we want the first (and only) row
    const stats = data?.[0];
    if (!stats) {
      return { success: false, error: "No stats returned" };
    }

    return { success: true, data: stats as AdminStats };
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetch detailed embedding statistics including recent failures
 * Requires admin role - enforced by RPC function
 */
export async function getEmbeddingDetails(): Promise<GetEmbeddingDetailsResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_admin_embedding_details");

    if (error) {
      return { success: false, error: error.message };
    }

    const details = data?.[0];
    if (!details) {
      return { success: false, error: "No embedding details returned" };
    }

    // Parse the recent_failures from JSON
    const recentFailures = (details.recent_failures as EmbeddingFailure[]) || [];

    return {
      success: true,
      data: {
        pending_count: details.pending_count,
        processing_count: details.processing_count,
        completed_count: details.completed_count,
        failed_count: details.failed_count,
        total_chunks: details.total_chunks,
        recent_failures: recentFailures,
      },
    };
  } catch (error) {
    console.error("Error fetching embedding details:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
