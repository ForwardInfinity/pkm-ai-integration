"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUserRole } from "../actions/update-user-role";
import { adminUserKeys } from "./use-users";
import type { AdminUser, UserRole } from "../types";

interface UpdateUserRoleParams {
  userId: string;
  role: UserRole;
}

/**
 * Hook to update a user's role with optimistic updates
 */
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: UpdateUserRoleParams) => {
      const result = await updateUserRole(userId, role);
      if (!result.success) {
        throw new Error(result.error || "Failed to update user role");
      }
      return { userId, role };
    },
    onMutate: async ({ userId, role }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: adminUserKeys.all });

      // Snapshot previous value for rollback
      const previousUsers = queryClient.getQueryData<AdminUser[]>(
        adminUserKeys.list()
      );

      // Optimistically update the user's role
      queryClient.setQueryData<AdminUser[]>(adminUserKeys.list(), (old) =>
        old?.map((user) => (user.id === userId ? { ...user, role } : user))
      );

      return { previousUsers };
    },
    onError: (_err, _params, context) => {
      // Rollback on error
      if (context?.previousUsers !== undefined) {
        queryClient.setQueryData(adminUserKeys.list(), context.previousUsers);
      }
    },
    onSettled: () => {
      // Invalidate to ensure consistency with server
      queryClient.invalidateQueries({ queryKey: adminUserKeys.all });
    },
  });
}
