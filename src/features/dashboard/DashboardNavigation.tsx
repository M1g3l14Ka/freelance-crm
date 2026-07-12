"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Bot, FolderKanban, LayoutDashboard, Settings } from "lucide-react"

const items = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/assistant", label: "Assistant", icon: Bot },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export function isDashboardRouteActive(pathname: string, href: string) {
  return href === "/dashboard"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`)
}

export function DashboardNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname()

  return (
    <nav aria-label={mobile ? "Mobile dashboard navigation" : "Dashboard navigation"}>
      <ul className={mobile ? "flex min-w-max gap-1" : "space-y-1"}>
        {items.map((item) => {
          const active = isDashboardRouteActive(pathname, item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-orange-500 text-black"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                } ${mobile ? "whitespace-nowrap" : "w-full"}`}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
