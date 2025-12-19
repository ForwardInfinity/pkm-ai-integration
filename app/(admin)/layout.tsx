import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user has admin role using RPC to bypass RLS
  const { data: isAdmin, error: adminError } = await supabase.rpc(
    "is_current_user_admin"
  );

  if (adminError || !isAdmin) {
    redirect("/notes");
  }

  return <div className="h-screen w-full">{children}</div>;
}
