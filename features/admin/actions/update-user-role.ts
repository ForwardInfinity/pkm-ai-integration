"use server";

import type { UserRole } from "../types";
import { requireAdminClient } from "../utils/require-admin";

export interface UpdateUserRoleResult {
  success: boolean;
  error?: string;
}

/**
 * Update a user's role
 * RLS ensures only admins can update roles
 * @param userId - The ID of the user to update
 * @param role - The new role to assign
 */
export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<UpdateUserRoleResult> {
  try {
    const supabase = await requireAdminClient();

    const { data, error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId)
      .select("id");

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: "User not found or you do not have permission to update roles",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating user role:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
