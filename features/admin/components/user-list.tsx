"use client";

import { AlertTriangle, Loader2, Users, Shield, User } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
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
      <div className="flex h-full flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/10" />
            <div className="relative rounded-full bg-background p-4 shadow-sm ring-1 ring-border/50">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Loading users...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="rounded-2xl bg-background p-8 text-center shadow-sm ring-1 ring-destructive/20">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Unable to load users
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {error.message || "Please check your connection and try again"}
          </p>
        </div>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="rounded-2xl bg-muted/30 p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No users found</p>
        </div>
      </div>
    );
  }

  const adminCount = users.filter((u) => u.role === "admin").length;

  return (
    <ScrollArea className="h-full">
      <div className="min-h-full">
        <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-foreground">
                  User Management
                </h1>
                <p className="text-xs text-muted-foreground">
                  {users.length} {users.length === 1 ? "user" : "users"} ({adminCount} admin)
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="px-6 py-6">
          <div className="grid gap-3">
            {users.map((user, index) => (
              <div
                key={user.id}
                className="animate-in fade-in slide-in-from-bottom-1 duration-300"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <UserRow
                  user={user}
                  onRoleChange={handleRoleChange}
                  isUpdating={updateRoleMutation.isPending}
                />
              </div>
            ))}
          </div>
        </main>
      </div>
    </ScrollArea>
  );
}
