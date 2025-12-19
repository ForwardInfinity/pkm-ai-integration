"use client";

import { AlertTriangle, Loader2, Users, Shield, User, MoreHorizontal, Crown } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUsers } from "../hooks/use-users";
import { useUpdateUserRole } from "../hooks/use-update-user-role";
import type { AdminUser, UserRole } from "../types";

function UserRow({
  user,
  onRoleChange,
  isUpdating,
  index,
}: {
  user: AdminUser;
  onRoleChange: (userId: string, role: UserRole) => void;
  isUpdating: boolean;
  index: number;
}) {
  const isAdmin = user.role === "admin";
  const newRole: UserRole = isAdmin ? "user" : "admin";

  // Generate initials from email
  const initials = user.email
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        "group flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-200",
        "hover:bg-muted/50",
        "animate-in fade-in slide-in-from-left-1 duration-300 fill-mode-both"
      )}
      style={{ animationDelay: `${300 + index * 50}ms` }}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className={cn(
            "relative flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold",
            isAdmin
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground"
          )}
        >
          {initials}
          {isAdmin && (
            <div className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500">
              <Crown className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {user.email}
          </p>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider",
                isAdmin ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
              )}
            >
              {isAdmin ? (
                <>
                  <Shield className="h-3 w-3" />
                  Admin
                </>
              ) : (
                <>
                  <User className="h-3 w-3" />
                  User
                </>
              )}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-[10px] text-muted-foreground">
              Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 opacity-0 transition-opacity",
              "group-hover:opacity-100",
              "data-[state=open]:opacity-100"
            )}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => onRoleChange(user.id, newRole)}>
            {isAdmin ? (
              <>
                <User className="mr-2 h-4 w-4" />
                Demote to User
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Promote to Admin
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function UserList() {
  const { data: users, isLoading, error } = useUsers();
  const updateRoleMutation = useUpdateUserRole();

  const handleRoleChange = async (userId: string, role: UserRole) => {
    try {
      await updateRoleMutation.mutateAsync({ userId, role });
      toast.success(`User ${role === "admin" ? "promoted to admin" : "demoted to user"}`);
    } catch {
      toast.error("Failed to update user role");
    }
  };

  if (isLoading) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-border/50 bg-card",
          "animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
        )}
        style={{ animationDelay: "250ms" }}
      >
        <div className="flex items-center justify-center gap-3 px-6 py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-rose-500/20 bg-rose-500/5",
          "animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
        )}
        style={{ animationDelay: "250ms" }}
      >
        <div className="flex items-center gap-3 px-6 py-4">
          <AlertTriangle className="h-5 w-5 text-rose-500" />
          <div>
            <p className="text-sm font-medium text-foreground">Unable to load users</p>
            <p className="text-xs text-muted-foreground">
              {error.message || "Please check your connection and try again"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-border/50 bg-card",
          "animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
        )}
        style={{ animationDelay: "250ms" }}
      >
        <div className="flex flex-col items-center justify-center px-6 py-12">
          <Users className="h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No users found</p>
        </div>
      </div>
    );
  }

  const adminCount = users.filter((u) => u.role === "admin").length;
  const adminUsers = users.filter((u) => u.role === "admin");
  const regularUsers = users.filter((u) => u.role === "user");

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/50 bg-card",
        "animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
      )}
      style={{ animationDelay: "250ms" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50">
            <Users className="h-5 w-5 text-foreground/50" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">User Management</h3>
            <p className="text-xs text-muted-foreground">
              {users.length} {users.length === 1 ? "user" : "users"} · {adminCount}{" "}
              {adminCount === 1 ? "admin" : "admins"}
            </p>
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="divide-y divide-border/30">
        {/* Admins Section */}
        {adminUsers.length > 0 && (
          <div className="py-2">
            <div className="px-6 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Administrators
              </span>
            </div>
            {adminUsers.map((user, index) => (
              <UserRow
                key={user.id}
                user={user}
                onRoleChange={handleRoleChange}
                isUpdating={updateRoleMutation.isPending}
                index={index}
              />
            ))}
          </div>
        )}

        {/* Regular Users Section */}
        {regularUsers.length > 0 && (
          <div className="py-2">
            <div className="px-6 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Users
              </span>
            </div>
            {regularUsers.map((user, index) => (
              <UserRow
                key={user.id}
                user={user}
                onRoleChange={handleRoleChange}
                isUpdating={updateRoleMutation.isPending}
                index={adminUsers.length + index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
