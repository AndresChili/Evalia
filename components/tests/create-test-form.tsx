"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";

import { createTestAction } from "@/lib/actions/tests";
import { createTestConfigSchema, MAX_QUESTION_COUNT } from "@/lib/validation/tests";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormValues = z.infer<typeof createTestConfigSchema>;

type DocumentOption = { id: string; originalFilename: string; charCount: number | null };

function titleFromFilename(filename: string): string {
  return filename.replace(/\.[^./]+$/, "");
}

function documentLabel(doc: DocumentOption): string {
  return doc.charCount
    ? `${doc.originalFilename} (${doc.charCount.toLocaleString("es-ES")} car.)`
    : doc.originalFilename;
}

const QUESTION_TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: "Alternativa múltiple",
  TRUE_FALSE: "Verdadero/Falso",
};

const DIFFICULTY_LABEL: Record<string, string> = { LOW: "Bajo", MEDIUM: "Medio", HIGH: "Alto" };

const SCORING_TYPE_LABEL: Record<string, string> = {
  NO_PENALTY: "Sin penalización",
  CUSTOM_PENALTY: "Penalización personalizada por fallo",
  GROUPED_PENALTY: "Cada X fallos resta 1 punto",
};

export function CreateTestForm({ documents }: { documents: DocumentOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [titleTouched, setTitleTouched] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createTestConfigSchema),
    defaultValues: {
      documentId: documents[0]?.id ?? "",
      title: documents[0] ? titleFromFilename(documents[0].originalFilename) : "",
      questionType: "MULTIPLE_CHOICE",
      optionsCount: 4,
      questionCount: 10,
      difficulty: "MEDIUM",
      scoringType: "NO_PENALTY",
    },
  });

  const questionType = watch("questionType");
  const scoringType = watch("scoringType");
  const documentId = watch("documentId");
  const titleField = register("title");

  useEffect(() => {
    if (titleTouched) return;
    const doc = documents.find((d) => d.id === documentId);
    if (doc) setValue("title", titleFromFilename(doc.originalFilename));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        const result = await createTestAction(values);
        if (result.error) {
          setError("root", { message: result.error });
          return;
        }
        router.push(`/tests/${result.testId}`);
      } catch {
        setError("root", {
          message: "Algo falló al generar el test. Inténtalo de nuevo.",
        });
      }
    });
  }

  if (documents.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No tienes ningún documento listo todavía. Sube uno en{" "}
          <a href="/documents" className="font-medium underline">
            Documentos
          </a>{" "}
          antes de crear un test.
        </AlertDescription>
      </Alert>
    );
  }

  if (isPending) {
    return (
      <div className="border-border flex flex-col items-center gap-3 rounded-lg border p-10 text-center">
        <div className="border-muted-foreground/30 border-t-foreground size-6 animate-spin rounded-full border-2" />
        <p className="text-sm font-medium">Generando y validando preguntas con IA…</p>
        <p className="text-muted-foreground max-w-sm text-xs">
          Puede tardar uno o dos minutos según el número de preguntas — cada una pasa por una
          comprobación de que está respaldada por el documento y una segunda revisión antes de
          aceptarse.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      {errors.root && (
        <Alert variant="destructive">
          <AlertDescription>{errors.root.message}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="documentId">Documento</Label>
        <Controller
          control={control}
          name="documentId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="documentId" className="w-full">
                <SelectValue placeholder="Selecciona un documento">
                  {(value: string) => {
                    const doc = documents.find((d) => d.id === value);
                    return doc ? documentLabel(doc) : "Selecciona un documento";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {documents.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id} label={documentLabel(doc)}>
                    {documentLabel(doc)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.documentId && (
          <p className="text-destructive text-sm">{errors.documentId.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Título del test</Label>
        <Input
          id="title"
          placeholder="Ej. Tema 3 — Fotosíntesis"
          {...titleField}
          onChange={(e) => {
            setTitleTouched(true);
            titleField.onChange(e);
          }}
        />
        {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="questionType">Tipo de pregunta</Label>
          <Controller
            control={control}
            name="questionType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="questionType" className="w-full">
                  <SelectValue>{(value: string) => QUESTION_TYPE_LABEL[value]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MULTIPLE_CHOICE" label="Alternativa múltiple">
                    Alternativa múltiple
                  </SelectItem>
                  <SelectItem value="TRUE_FALSE" label="Verdadero/Falso">
                    Verdadero/Falso
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {questionType === "MULTIPLE_CHOICE" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="optionsCount">Nº de opciones</Label>
            <Controller
              control={control}
              name="optionsCount"
              render={({ field }) => (
                <Select
                  value={String(field.value ?? 4)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger id="optionsCount" className="w-full">
                    <SelectValue>{(value: string) => `${value} opciones`}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6].map((n) => (
                      <SelectItem key={n} value={String(n)} label={`${n} opciones`}>
                        {n} opciones
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="questionCount">Nº de preguntas</Label>
          <Input
            id="questionCount"
            type="number"
            min={1}
            max={MAX_QUESTION_COUNT}
            {...register("questionCount", { valueAsNumber: true })}
          />
          {errors.questionCount && (
            <p className="text-destructive text-sm">{errors.questionCount.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="difficulty">Dificultad</Label>
          <Controller
            control={control}
            name="difficulty"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="difficulty" className="w-full">
                  <SelectValue>{(value: string) => DIFFICULTY_LABEL[value]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW" label="Bajo">
                    Bajo
                  </SelectItem>
                  <SelectItem value="MEDIUM" label="Medio">
                    Medio
                  </SelectItem>
                  <SelectItem value="HIGH" label="Alto">
                    Alto
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="scoringType">Sistema de puntuación</Label>
        <Controller
          control={control}
          name="scoringType"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="scoringType" className="w-full">
                <SelectValue>{(value: string) => SCORING_TYPE_LABEL[value]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NO_PENALTY" label={SCORING_TYPE_LABEL.NO_PENALTY}>
                  Sin penalización
                </SelectItem>
                <SelectItem value="CUSTOM_PENALTY" label={SCORING_TYPE_LABEL.CUSTOM_PENALTY}>
                  Penalización personalizada por fallo
                </SelectItem>
                <SelectItem value="GROUPED_PENALTY" label={SCORING_TYPE_LABEL.GROUPED_PENALTY}>
                  Cada X fallos resta 1 punto
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {scoringType === "CUSTOM_PENALTY" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="penaltyValue">Puntos que resta cada fallo (0–1)</Label>
          <Input
            id="penaltyValue"
            type="number"
            min={0}
            max={1}
            step={0.01}
            placeholder="Ej. 0.33"
            {...register("penaltyValue", { valueAsNumber: true })}
          />
          {errors.penaltyValue && (
            <p className="text-destructive text-sm">{errors.penaltyValue.message}</p>
          )}
        </div>
      )}

      {scoringType === "GROUPED_PENALTY" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="penaltyGroupSize">Cada cuántos fallos se resta 1 punto</Label>
          <Input
            id="penaltyGroupSize"
            type="number"
            min={2}
            max={10}
            placeholder="Ej. 3"
            {...register("penaltyGroupSize", { valueAsNumber: true })}
          />
          {errors.penaltyGroupSize && (
            <p className="text-destructive text-sm">{errors.penaltyGroupSize.message}</p>
          )}
        </div>
      )}

      <Button type="submit" disabled={isPending} className="mt-2">
        Generar test
      </Button>
    </form>
  );
}
