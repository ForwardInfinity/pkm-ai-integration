import { Shield } from "lucide-react";

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground">
            <Shield className="h-6 w-6 text-background" />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-lg font-semibold tracking-tight">Admin</span>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Control Panel
            </span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
