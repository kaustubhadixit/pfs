"use client";
// Admin MFA login. Centered card with email + password + 6-digit OTP.
// In dev, fetches /api/admin/dev-otp so the panel is testable without an
// authenticator app. The current valid code is shown below the form, clearly
// labeled "DEV ONLY". Refreshes every 25s (TOTP rotates every 30s).
import * as React from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";
import { Loader2, LockKeyhole, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ADMIN_EMAIL } from "@/lib/auth";

interface DevOtpResponse {
  otp?: string;
  error?: string;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = React.useState(ADMIN_EMAIL);
  const [password, setPassword] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [devOtp, setDevOtp] = React.useState<string | null>(null);

  // Redirect if already authenticated.
  React.useEffect(() => {
    if (status === "authenticated" && session?.user) {
      router.replace("/admin");
    }
  }, [status, session, router]);

  // DEV ONLY: fetch the current valid TOTP for the seeded admin.
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/admin/dev-otp");
        if (!res.ok) return;
        const data: DevOtpResponse = await res.json();
        if (active && data.otp) setDevOtp(data.otp);
      } catch {
        /* ignore */
      }
    }
    load();
    const timer = setInterval(load, 25_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!email.trim() || !password.trim() || otp.length !== 6) {
      toast.error("Email, password, and 6-digit code are required");
      return;
    }
    setSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        otp,
        redirect: false,
      });
      if (!result || result.error) {
        toast.error("Invalid credentials or code. Please try again.");
        return;
      }
      toast.success("Signed in");
      router.replace("/admin");
      router.refresh();
    } catch (e) {
      console.error("login error:", e);
      toast.error("Sign-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <Sparkles className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Patent<span className="text-primary">Sale</span> Admin
            </h1>
            <p className="text-sm text-muted-foreground">
              Authorized personnel only. MFA required.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LockKeyhole className="size-4 text-muted-foreground" />
              Sign in
            </CardTitle>
            <CardDescription>
              Enter your admin email, password, and current authenticator code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-email">Admin email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@patentforsale.in"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-otp">Authenticator code (6 digits)</Label>
                <InputOTP
                  id="admin-otp"
                  maxLength={6}
                  value={otp}
                  onChange={(v) => setOtp(v)}
                  autoComplete="one-time-code"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button type="submit" disabled={submitting} className="w-full gap-2">
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {devOtp ? (
          <div className="rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/40 p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="size-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-200">
                  DEV ONLY — current valid code
                </p>
                <p className="text-2xl font-mono font-bold tracking-widest text-amber-900 dark:text-amber-200">
                  {devOtp}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Rotates every 30 seconds. This is shown ONLY because NODE_ENV ≠ production.
                  In production you must use a real TOTP authenticator app.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
