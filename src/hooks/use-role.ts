import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";

export const useRole = () => {
  const { data: session, status } = useSession();

  const role = session?.user?.role as Role | undefined;

  return {
    role,
    isAdmin: role === "ADMIN",
    isAgent: role === "AGENT" || role === "ADMIN",
    isCustomer: role === "EMPLOYEE",
    isLoading: !session && status === "loading",
  };
};
