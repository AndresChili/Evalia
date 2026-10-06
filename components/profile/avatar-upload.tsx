"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { deleteAvatarAction, uploadAvatarAction } from "@/lib/actions/avatar";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function AvatarUpload({
  initialAvatarUrl,
  displayName,
}: {
  initialAvatarUrl: string | null;
  displayName: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const result = await uploadAvatarAction(formData);
      if (result.error) {
        setError(result.error);
      } else if (result.avatarUrl) {
        setAvatarUrl(result.avatarUrl);
        router.refresh();
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function handleDelete() {
    setError(null);
    startDeleteTransition(async () => {
      const result = await deleteAvatarAction();
      if (result.error) {
        setError(result.error);
      } else {
        setAvatarUrl(null);
        router.refresh();
      }
    });
  }

  const isBusy = isPending || isDeleting;

  return (
    <div className="flex items-center gap-4">
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={displayName}
          width={64}
          height={64}
          unoptimized
          className="size-16 rounded-full object-cover"
        />
      ) : (
        <div className="bg-primary text-primary-foreground flex size-16 items-center justify-center rounded-full text-xl font-semibold">
          {displayName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleChange}
          disabled={isBusy}
          className="hidden"
          id="avatar-upload"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={() => inputRef.current?.click()}
          >
            {isPending ? "Subiendo…" : "Cambiar foto"}
          </Button>
          {avatarUrl && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isBusy}
              onClick={handleDelete}
            >
              {isDeleting ? "Eliminando…" : "Eliminar"}
            </Button>
          )}
        </div>
        {error && (
          <Alert variant="destructive" className="py-1.5">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
