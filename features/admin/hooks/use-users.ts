"use client";

import { useQuery } from "@tanstack/react-query";
import { getUsers } from "../actions/get-users";
import type { AdminUser } from "../types";

/** Query key factory for admin users */
export const adminUserKeys = {
  all: ["admin-users"] as const,
  list: () => [...adminUserKeys.all, "list"] as const,
};

async function fetchUsers(): Promise<AdminUser[]> {
  const result = await getUsers();

  if (!result.success) {
    throw new Error(result.error || "Failed to fetch users");
  }

  return result.data ?? [];
}

/**
 * Hook to fetch all users for admin management
 */
export function useUsers() {
  return useQuery({
    queryKey: adminUserKeys.list(),
    queryFn: fetchUsers,
    staleTime: 30 * 1000,
  });
}
