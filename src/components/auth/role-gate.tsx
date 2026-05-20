"use client";

import { useRole } from "@/hooks/use-role";
import { Role } from "@prisma/client";
import { ReactNode } from "react";

interface RoleGateProps {
  children: ReactNode;
  allowedRoles: Role[];
  fallback?: ReactNode;
}

export const RoleGate = ({
  children,
  allowedRoles,
  fallback,
}: RoleGateProps) => {
  const { role } = useRole();

  if (!role || !allowedRoles.includes(role)) {
    return fallback || null;
  }

  return <>{children}</>;
};
