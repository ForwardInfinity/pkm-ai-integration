"use server";

import type { AdminUser } from "../types";
import { requireAdminClient } from "../utils/require-admin";

export interface GetUsersResult {
  success: boolean;
  data?: AdminUser[];
  error?: string;
}

/**
 * Fetch all users for admin management
 * Requires admin role - enforced by RPC function
 */
export async function getUsers(): Promise<GetUsersResult> {
  try {
    const supabase = await requireAdminClient();

    const { data, error } = await supabase.rpc("get_admin_users");

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as AdminUser[] };
  } catch (error) {
    console.error("Error fetching users:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
