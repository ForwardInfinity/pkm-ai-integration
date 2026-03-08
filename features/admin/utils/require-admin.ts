import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const AUTHENTICATION_REQUIRED_ERROR = "Authentication required";
export const ADMIN_ACCESS_REQUIRED_ERROR = "Admin access required";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function requireAdminClient(): Promise<ServerSupabaseClient> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) {
    throw new Error(AUTHENTICATION_REQUIRED_ERROR);
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc(
    "is_current_user_admin",
  );

  if (adminError) {
    throw new Error(adminError.message);
  }

  if (!isAdmin) {
    throw new Error(ADMIN_ACCESS_REQUIRED_ERROR);
  }

  return supabase;
}

export async function redirectIfNotAdmin(): Promise<void> {
  try {
    await requireAdminClient();
  } catch {
    redirect("/admin/login");
  }
}
