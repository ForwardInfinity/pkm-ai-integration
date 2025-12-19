// Admin feature type definitions

export type UserRole = "user" | "admin";

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}
