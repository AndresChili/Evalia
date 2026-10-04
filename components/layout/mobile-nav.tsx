"use client";

import {
  Bell,
  Bookmark,
  FilePlus2,
  FileText,
  History,
  Inbox,
  LayoutDashboard,
  Menu,
  Users,
} from "lucide-react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tests/new", label: "Crear test", icon: FilePlus2 },
  { href: "/documents", label: "Documentos", icon: FileText },
  { href: "/saved", label: "Guardados", icon: Bookmark },
  { href: "/history", label: "Historial", icon: History },
  { href: "/friends", label: "Amigos", icon: Users },
  { href: "/received", label: "Recibidos", icon: Inbox },
  { href: "/notifications", label: "Notificaciones", icon: Bell },
];

export function MobileNav() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="hover:bg-muted flex size-8 items-center justify-center rounded-lg outline-none"
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {ITEMS.map((item) => (
          <DropdownMenuItem key={item.href} render={<Link href={item.href} />}>
            <item.icon className="size-4" />
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
