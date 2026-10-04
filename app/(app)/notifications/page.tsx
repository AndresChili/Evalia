import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Notificaciones" };

function describe(notification: { type: string; payload: unknown }): {
  text: string;
  href: string;
} {
  const payload = notification.payload as Record<string, unknown>;
  switch (notification.type) {
    case "FRIEND_REQUEST_RECEIVED":
      return { text: "Tienes una nueva solicitud de amistad.", href: "/friends" };
    case "FRIEND_REQUEST_ACCEPTED":
      return { text: "Han aceptado tu solicitud de amistad.", href: "/friends" };
    case "TEST_SHARED":
      return {
        text: `Te han compartido el test "${String(payload.testTitle ?? "")}".`,
        href: "/received",
      };
    case "TEST_GENERATION_READY":
      return { text: "Tu test ya está listo.", href: `/tests/${String(payload.testId ?? "")}` };
    case "TEST_GENERATION_FAILED":
      return { text: "Hubo un problema generando tu test.", href: "/tests/new" };
    default:
      return { text: "Notificación.", href: "/dashboard" };
  }
}

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const notifications = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  await db.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  });

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Notificaciones</h1>

      {notifications.length === 0 ? (
        <p className="text-muted-foreground text-sm">No tienes notificaciones.</p>
      ) : (
        <ul className="divide-border border-border divide-y rounded-lg border">
          {notifications.map((n) => {
            const { text, href } = describe(n);
            return (
              <li key={n.id} className={`px-4 py-3 ${n.read ? "" : "bg-muted/40"}`}>
                <Link href={href} className="text-sm hover:underline">
                  {text}
                </Link>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {n.createdAt.toLocaleString("es-ES")}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
