"use client";

import { LogOut, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";

import { logoutAction } from "@/lib/actions/auth";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const initial = name.charAt(0).toUpperCase();
  const [, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none" aria-label={`Menú de ${name}`}>
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={name}
            width={32}
            height={32}
            unoptimized
            className="size-8 rounded-full object-cover"
          />
        ) : (
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full text-sm font-semibold">
            {initial}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-sm font-medium">{name}</div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/profile" />}>
          <Settings className="size-4" />
          Perfil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => startTransition(() => logoutAction())}
        >
          <LogOut className="size-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
