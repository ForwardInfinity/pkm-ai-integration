import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: isAdmin } = await supabase.rpc("is_current_user_admin");

  if (!isAdmin) {
    redirect("/admin/login");
  }

  return <>{children}</>;
}
