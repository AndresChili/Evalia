"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { DocumentModel as Document } from "@/lib/generated/prisma/models";
import { deleteDocumentAction } from "@/lib/actions/documents";

import { Button } from "@/components/ui/button";

const STATUS_LABEL: Record<Document["status"], string> = {
  PENDING: "Pendiente",
  EXTRACTING: "Procesando…",
  READY: "Listo",
  FAILED: "Error",
};

const STATUS_CLASS: Record<Document["status"], string> = {
  PENDING: "text-muted-foreground",
  EXTRACTING: "text-amber-600 dark:text-amber-400",
  READY: "text-emerald-600 dark:text-emerald-400",
  FAILED: "text-destructive",
};

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({ documents }: { documents: Document[] }) {
  if (documents.length === 0) {
    return (
      <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        Aún no has subido ningún documento. Sube tus apuntes para poder generar un test a partir de
        ellos.
      </div>
    );
  }

  return (
    <ul className="divide-border border-border divide-y rounded-lg border">
      {documents.map((doc) => (
        <DocumentRow key={doc.id} document={doc} />
      ))}
    </ul>
  );
}

function DocumentRow({ document }: { document: Document }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteDocumentAction(document.id);
      router.refresh();
    });
  }

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{document.originalFilename}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          <span className={STATUS_CLASS[document.status]}>{STATUS_LABEL[document.status]}</span>
          {" · "}
          {formatSize(document.sizeBytes)}
          {document.charCount ? ` · ${document.charCount.toLocaleString("es-ES")} caracteres` : ""}
        </p>
        {document.status === "FAILED" && document.errorMessage && (
          <p className="text-destructive mt-1 text-xs">{document.errorMessage}</p>
        )}
      </div>

      {confirming ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-muted-foreground text-xs">¿Borrar?</span>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isPending}
            onClick={handleDelete}
          >
            Sí
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            No
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={() => setConfirming(true)}
        >
          Borrar
        </Button>
      )}
    </li>
  );
}
