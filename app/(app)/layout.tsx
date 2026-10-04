import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [unreadCount, profile] = await Promise.all([
    db.notification.count({ where: { userId: session.user.id, read: false } }),
    db.profile.findUnique({
      where: { userId: session.user.id },
      select: { avatarPathname: true },
    }),
  ]);

  const name = session.user.name ?? session.user.email ?? "Usuario";
  const avatarUrl = profile?.avatarPathname ? `/api/avatars/${session.user.id}` : null;

  return (
    <div className="flex min-h-screen">
      <aside className="border-border hidden w-60 shrink-0 flex-col border-r px-4 py-6 md:flex">
        <Link href="/dashboard" className="mb-8 flex items-center gap-2 px-2">
          <Image src="/icon.png" alt="Evalia" width={28} height={28} className="rounded-lg" />
          <span className="font-semibold tracking-tight">Evalia</span>
        </Link>
        <SidebarNav unreadCount={unreadCount} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border flex items-center justify-between border-b px-4 py-3 md:justify-end md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <MobileNav />
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image src="/icon.png" alt="Evalia" width={24} height={24} className="rounded-lg" />
              <span className="text-sm font-semibold tracking-tight">Evalia</span>
            </Link>
          </div>
          <UserMenu name={name} avatarUrl={avatarUrl} />
        </header>
        <main className="flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
