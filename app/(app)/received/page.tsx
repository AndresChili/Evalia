import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ReceivedTestList } from "@/components/tests/received-test-list";

export const metadata: Metadata = { title: "Tests recibidos" };

export default async function ReceivedTestsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const shared = await db.sharedTest.findMany({
    where: { toUserId: session.user.id },
    orderBy: { sharedAt: "desc" },
    include: { test: { select: { title: true } }, fromUser: { include: { profile: true } } },
  });

  const pending = shared
    .filter((s) => s.status === "PENDING")
    .map((s) => ({
      id: s.id,
      testTitle: s.test.title,
      fromDisplayName: s.fromUser.profile?.displayName ?? s.fromUser.email,
    }));

  const responded = shared.filter((s) => s.status !== "PENDING");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tests recibidos</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Tests que tus amigos te han enviado. Al aceptar uno, se añade a tus tests guardados como
          copia propia.
        </p>
      </div>

      <ReceivedTestList pending={pending} />

      {responded.length > 0 && (
        <div>
          <h2 className="text-muted-foreground mb-2 text-sm font-medium">Respondidos</h2>
          <ul className="flex flex-col gap-1">
            {responded.map((s) => (
              <li key={s.id} className="text-muted-foreground text-sm">
                {s.test.title} — {s.status === "ACCEPTED" ? "aceptado" : "rechazado"}
                {s.status === "ACCEPTED" && (
                  <>
                    {" · "}
                    <Link href="/saved" className="hover:underline">
                      ver en guardados
                    </Link>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
