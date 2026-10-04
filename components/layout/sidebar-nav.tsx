"use client";

import {
  Bell,
  Bookmark,
  FilePlus2,
  FileText,
  History,
  Inbox,
  LayoutDashboard,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
};

type NavGroup = { items: NavItem[] };

function buildGroups(unreadCount: number): NavGroup[] {
  return [
    {
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/tests/new", label: "Crear test", icon: FilePlus2 },
        { href: "/documents", label: "Documentos", icon: FileText },
      ],
    },
    {
      items: [
        { href: "/saved", label: "Guardados", icon: Bookmark },
        { href: "/history", label: "Historial", icon: History },
      ],
    },
    {
      items: [
        { href: "/friends", label: "Amigos", icon: Users },
        { href: "/received", label: "Recibidos", icon: Inbox },
        { href: "/notifications", label: "Notificaciones", icon: Bell, badge: unreadCount },
      ],
    },
  ];
}

export function SidebarNav({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();
  const groups = buildGroups(unreadCount);

  return (
    <nav className="flex flex-col gap-6">
      {groups.map((group, i) => (
        <ul key={i} className="flex flex-col gap-0.5">
          {group.items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {!!item.badge && (
                    <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs font-semibold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      ))}
    </nav>
  );
}
