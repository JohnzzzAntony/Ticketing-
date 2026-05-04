'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/components/ticketing/store';
import { LoginForm } from '@/components/ticketing/login-form';
import { AppLayout } from '@/components/ticketing/app-layout';
import { CreateTicketDialog } from '@/components/ticketing/create-ticket-dialog';

export default function Home() {
  const { isAuthenticated, user, setUser, setIsAuthenticated } = useAppStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/session');
        const session = await res.json();
        if (session?.user) {
          setUser({
            id: (session.user as Record<string, unknown>).id as string,
            email: session.user.email!,
            name: session.user.name!,
            role: (session.user as Record<string, unknown>).role as string,
            departmentId: (session.user as Record<string, unknown>).departmentId as string | null,
            departmentName: (session.user as Record<string, unknown>).departmentName as string | null,
          });
          setIsAuthenticated(true);
        }
      } catch {
        // Not authenticated
      } finally {
        setIsChecking(false);
      }
    }
    checkSession();
  }, [setUser, setIsAuthenticated]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-emerald-500" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginForm />;
  }

  return (
    <>
      <AppLayout />
      <CreateTicketDialog />
    </>
  );
}
