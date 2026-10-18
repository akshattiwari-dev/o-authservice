import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

/** Returns the session, or throws a Response-shaped error the caller returns directly. */
export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw NextResponse.json({ error: "unauthorized", message: "Sign in required." }, { status: 401 });
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw NextResponse.json({ error: "forbidden", message: "Admin access required." }, { status: 403 });
  }
  return session;
}
