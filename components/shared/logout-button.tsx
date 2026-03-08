"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { signOutClient } from "@/lib/local-db/auth";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    await signOutClient();
    router.push("/login");
  };

  return <Button onClick={logout}>Logout</Button>;
}
