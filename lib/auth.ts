import { cookies } from "next/headers"
import { getIronSession, SessionOptions } from "iron-session"
import { redirect } from "next/navigation"
import { prisma } from "./db"

export type SessionData = {
  userId?: string
  organizationId?: string
}

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ||
    "change-me-to-a-long-random-string-at-least-32-chars-for-dev",
  cookieName: "openindy_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
}

export async function getSession() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  return session
}

export async function requireUser() {
  const session = await getSession()
  if (!session.userId) redirect("/login")
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      memberships: {
        include: { organization: true },
      },
    },
  })
  if (!user) redirect("/login")
  // If no org in session, pick first membership
  let organizationId = session.organizationId
  if (!organizationId && user.memberships[0]) {
    organizationId = user.memberships[0].organizationId
    session.organizationId = organizationId
    await session.save()
  }
  if (!organizationId) redirect("/login")
  const org = user.memberships.find((m) => m.organizationId === organizationId)
    ?.organization
  if (!org) redirect("/login")
  return { user, organization: org }
}
