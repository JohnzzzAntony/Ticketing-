import type { DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      departmentId: string | null;
      departmentName: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    departmentId: string | null;
    departmentName: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    userId?: string;
    role?: Role;
    departmentId?: string | null;
    departmentName?: string | null;
  }
}
