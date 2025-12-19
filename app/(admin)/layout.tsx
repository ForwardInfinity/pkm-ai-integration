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

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 w-full flex flex-col items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="font-semibold">Admin Dashboard</div>
          </div>
        </nav>
        <div className="flex-1 w-full max-w-5xl p-5">
          {children}
        </div>
      </div>
    </main>
  );
}
