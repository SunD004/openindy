import Link from "next/link"
import {
  Home,
  Receipt,
  Upload,
  FileText,
  Settings,
  LogOut,
  Building2,
} from "lucide-react"
import { requireUser } from "@/lib/auth"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, organization } = await requireUser()

  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr]">
      <aside className="border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary grid place-items-center text-primary-foreground font-bold">
              O
            </div>
            <div>
              <div className="font-semibold text-sm">OpenIndy</div>
              <div className="text-xs text-muted-foreground">
                {organization.name}
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          <NavLink href="/" icon={<Home className="h-4 w-4" />}>
            Pilotage
          </NavLink>
          <NavLink href="/transactions" icon={<Receipt className="h-4 w-4" />}>
            Transactions
          </NavLink>
          <NavLink href="/import" icon={<Upload className="h-4 w-4" />}>
            Importer
          </NavLink>
          <NavLink href="/documents" icon={<FileText className="h-4 w-4" />}>
            Documents
          </NavLink>
          <NavLink
            href="/settings"
            icon={<Settings className="h-4 w-4" />}
          >
            Paramètres
          </NavLink>
        </nav>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 mb-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div className="truncate">
              <div className="font-medium truncate">{user.name || user.email}</div>
              <div className="text-xs text-muted-foreground truncate">
                {user.email}
              </div>
            </div>
          </div>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent transition text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </button>
          </form>
        </div>
      </aside>

      <main className="min-h-screen overflow-auto">{children}</main>
    </div>
  )
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-accent transition"
    >
      {icon}
      {children}
    </Link>
  )
}
