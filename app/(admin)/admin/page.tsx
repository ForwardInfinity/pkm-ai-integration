import { AdminDashboard } from "@/features/admin/components/admin-dashboard";
import { redirectIfNotAdmin } from "@/features/admin/utils/require-admin";

export default async function AdminPage() {
  await redirectIfNotAdmin();

  return <AdminDashboard />;
}
