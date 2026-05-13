'use client';

import { useState } from "react";
import { useAppStore } from "./store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Headphones, Loader2, AlertCircle } from "lucide-react";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid credentials");
        setLoading(false);
        return;
      }

      // Fetch session after successful login
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      
      if (session?.user) {
        useAppStore.getState().setUser({
          id: (session.user as any).id,
          email: session.user.email!,
          name: session.user.name!,
          role: (session.user as any).role,
          departmentId: (session.user as any).departmentId,
          departmentName: (session.user as any).departmentName,
        });
        useAppStore.getState().setIsAuthenticated(true);
      } else {
        setError("Session failed to initialize");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed");
    }
    setLoading(false);
  };

  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-emerald-50 dark:to-emerald-950/20 p-4">
      {/* Logo and Branding */}
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-emerald-600 text-white mb-4 shadow-lg shadow-emerald-600/20">
          <Headphones className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">HelpDesk</h1>
        <p className="text-sm text-muted-foreground mt-1">Sign in to your workspace</p>
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Welcome back</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-10"
                autoComplete="email"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="h-10"
                autoComplete="current-password"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col">
          <Separator className="mb-4" />
          <div className="w-full space-y-2">
            <p className="text-xs font-medium text-muted-foreground text-center mb-3">Demo Accounts</p>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => fillDemo("admin@company.com", "password123")}
                className="flex items-center justify-between rounded-md border border-border/50 bg-muted/40 px-3 py-2 text-xs hover:bg-muted transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                    A
                  </span>
                  <span className="font-medium text-foreground">Admin</span>
                </span>
                <span className="text-muted-foreground">admin@company.com</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("agent@company.com", "password123")}
                className="flex items-center justify-between rounded-md border border-border/50 bg-muted/40 px-3 py-2 text-xs hover:bg-muted transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-[10px] font-bold">
                    G
                  </span>
                  <span className="font-medium text-foreground">Agent</span>
                </span>
                <span className="text-muted-foreground">agent@company.com</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("john@company.com", "password123")}
                className="flex items-center justify-between rounded-md border border-border/50 bg-muted/40 px-3 py-2 text-xs hover:bg-muted transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 text-[10px] font-bold">
                    E
                  </span>
                  <span className="font-medium text-foreground">Employee</span>
                </span>
                <span className="text-muted-foreground">john@company.com</span>
              </button>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Footer */}
      <p className="mt-8 text-xs text-muted-foreground">
        HelpDesk Ticketing System &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
}
