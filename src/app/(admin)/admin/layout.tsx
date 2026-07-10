// Admin layout — applies the authenticated AdminShell to every admin route.
// The login page (`/admin/login`) is bypassed by AdminShell (it checks pathname),
// so the login screen renders standalone without the sidebar/auth guard.
import * as React from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AuthSessionProvider } from "@/components/admin/auth-session-provider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthSessionProvider>
      <AdminShell>{children}</AdminShell>
    </AuthSessionProvider>
  );
}
