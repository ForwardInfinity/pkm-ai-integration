import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  // TODO: Add role check for admin access
  // const isAdmin = data.claims.user_role === 'admin';
  // if (!isAdmin) {
  //   redirect("/notes");
  // }

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
