import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Request-scoped only: role revocation and disabled accounts remain fresh on
// every navigation and mutation. Auth.js and page authorization share this read.
export const getAuthorizationUser = cache((id: string) =>
  prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, isActive: true },
  }),
);
