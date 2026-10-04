"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { uploadDocumentAction } from "@/lib/actions/documents";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const result = await uploadDocumentAction(formData);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,image/png,image/jpeg,image/webp"
          onChange={handleChange}
          disabled={isPending}
          className="hidden"
          id="document-upload"
        />
        <Button type="button" disabled={isPending} onClick={() => inputRef.current?.click()}>
          {isPending ? "Subiendo y procesando…" : "Subir documento"}
        </Button>
      </div>

      <p className="text-muted-foreground text-xs">
        PDF, DOCX, PNG, JPEG o WEBP. Máximo 20MB. El archivo original se borra en cuanto se extrae
        el texto — solo se conserva el texto.
      </p>
    </div>
  );
}
