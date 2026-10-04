import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DocumentList } from "@/components/documents/document-list";
import { UploadForm } from "@/components/documents/upload-form";

export const metadata: Metadata = { title: "Documentos" };

export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const documents = await db.document.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Sube tus apuntes aquí. A partir de este material podrás generar tests en la siguiente
          fase.
        </p>
      </div>

      <UploadForm />

      <DocumentList documents={documents} />
    </div>
  );
}
