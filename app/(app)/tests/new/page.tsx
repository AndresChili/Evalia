import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CreateTestForm } from "@/components/tests/create-test-form";

export const metadata: Metadata = { title: "Crear test" };

export default async function NewTestPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const documents = await db.document.findMany({
    where: { userId: session.user.id, status: "READY" },
    orderBy: { createdAt: "desc" },
    select: { id: true, originalFilename: true, charCount: true },
  });

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Crear test</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configura el test. La IA generará las preguntas exclusivamente a partir del documento
          elegido, y descartará las que no superen la validación.
        </p>
      </div>
      <CreateTestForm documents={documents} />
    </div>
  );
}
