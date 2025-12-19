"use client";

import { AlertTriangle, Loader2, Users, Shield, User } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUsers } from "../hooks/use-users";
import { useUpdateUserRole } from "../hooks/use-update-user-role";
import type { AdminUser, UserRole } from "../types";

function UserRow({
  user,
  onRoleChange,
  isUpdating,
}: {
  user: AdminUser;
  onRoleChange: (userId: string, role: UserRole) => void;
  isUpdating: boolean;
}) {
  const isAdmin = user.role === "admin";
  const newRole: UserRole = isAdmin ? "user" : "admin";

  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            isAdmin ? "bg-destructive/10" : "bg-muted"
          }`}
        >
          {isAdmin ? (
            <Shield className="h-5 w-5 text-destructive" />
          ) : (
            <User className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium">{user.email}</p>
          <p className="text-xs text-muted-foreground">
            Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant={isAdmin ? "destructive" : "secondary"}>
          {user.role}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          disabled={isUpdating}
          onClick={() => onRoleChange(user.id, newRole)}
        >
          {isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isAdmin ? (
            "Demote"
          ) : (
            "Promote"
          )}
        </Button>
      </div>
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
          "rounded-xl border bg-card/50 p-8 transition-all duration-200",
          "animate-in fade-in slide-in-from-bottom-1 duration-300"
        )}
        style={{ animationDelay: "150ms" }}
      >
        <div className="flex items-center justify-center gap-3">
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
          "rounded-xl border border-destructive/20 bg-destructive/5 p-6",
          "animate-in fade-in slide-in-from-bottom-1 duration-300"
        )}
        style={{ animationDelay: "150ms" }}
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Unable to load users
            </p>
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
          "rounded-xl border bg-muted/30 p-8 text-center",
          "animate-in fade-in slide-in-from-bottom-1 duration-300"
        )}
        style={{ animationDelay: "150ms" }}
      >
        <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          No users found
        </p>
      </div>
    );
  }

  const adminCount = users.filter((u) => u.role === "admin").length;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card/50 p-5 transition-all duration-200",
        "hover:bg-card hover:shadow-md hover:shadow-black/[0.03]",
        "animate-in fade-in slide-in-from-bottom-1 duration-300"
      )}
      style={{ animationDelay: "150ms" }}
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
          <Users className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            User Management
          </h3>
          <p className="text-xs text-muted-foreground">
            {users.length} {users.length === 1 ? "user" : "users"} ({adminCount}{" "}
            {adminCount === 1 ? "admin" : "admins"})
          </p>
        </div>
      </div>

      {/* User Grid */}
      <div className="grid gap-2">
        {users.map((user, index) => (
          <div
            key={user.id}
            className="animate-in fade-in duration-200"
            style={{ animationDelay: `${180 + index * 20}ms` }}
          >
            <UserRow
              user={user}
              onRoleChange={handleRoleChange}
              isUpdating={updateRoleMutation.isPending}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
