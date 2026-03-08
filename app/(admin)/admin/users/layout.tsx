import { redirectIfNotAdmin } from "@/features/admin/utils/require-admin";

export default async function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectIfNotAdmin();

  return <>{children}</>;
}
