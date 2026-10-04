import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const STEPS = [
  {
    title: "Sube tus apuntes",
    description: "PDF, DOCX o imágenes con texto. Se procesan y el archivo original se borra.",
  },
  {
    title: "Configura el test",
    description: "Tipo de pregunta, nº de opciones, dificultad, puntuación — tú decides.",
  },
  {
    title: "La IA genera y valida",
    description:
      "Cada pregunta pasa por una comprobación de que está respaldada por tu documento antes de aceptarse.",
  },
  {
    title: "Estudia o examínate",
    description: "Feedback inmediato en modo estudio, corrección al final en modo examen.",
  },
];

const FEATURES = [
  {
    title: "Fiabilidad, no magia",
    description:
      "Pipeline de varias etapas — grounding, deduplicación, segunda revisión por otro modelo — en vez de un único prompt. Limitaciones documentadas, no prometidas al 100%.",
  },
  {
    title: "Puntuación a tu medida",
    description:
      'Sin penalización, penalización personalizada por fallo, o "cada X fallos resta 1 punto" — cálculo exacto, sin errores de redondeo.',
  },
  {
    title: "Estudia con amigos",
    description:
      "Comparte tests con tus amigos; cada uno recibe su propia copia para repetir cuando quiera.",
  },
  {
    title: "Gratis de verdad",
    description:
      "Construido sobre proveedores de IA con tier gratuito — sin coste oculto ni sorpresas.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/icon.png" alt="Evalia" width={28} height={28} className="rounded-lg" />
          <span className="font-semibold tracking-tight">Evalia</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Button render={<Link href="/login" />} variant="ghost">
            Entrar
          </Button>
          <Button render={<Link href="/register" />}>Crear cuenta</Button>
        </nav>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div
            aria-hidden
            className="bg-primary/10 pointer-events-none absolute top-0 left-1/2 -z-10 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full blur-3xl"
          />
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Convierte tus apuntes en tests de estudio
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg text-balance">
              Sube tu material, configura el test que necesites, y deja que la IA genere y valide
              las preguntas — basadas exclusivamente en lo que tú has escrito.
            </p>
            <div className="mt-2 flex gap-3">
              <Button render={<Link href="/register" />} size="lg">
                Empieza gratis
              </Button>
              <Button render={<Link href="/login" />} variant="outline" size="lg">
                Ya tengo cuenta
              </Button>
            </div>
          </div>
        </section>

        <section className="border-border border-y px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-sm font-medium tracking-wide uppercase">
              Cómo funciona
            </h2>
            <ol className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex flex-col gap-2">
                  <span className="text-primary text-sm font-semibold">{`0${i + 1}`}</span>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-2xl font-semibold tracking-tight">
              Pensado para confiar en el resultado
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="border-border rounded-xl border p-6">
                  <h3 className="font-medium">{feature.title}</h3>
                  <p className="text-muted-foreground mt-2 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-16">
          <div className="border-border bg-card mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-2xl border p-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Tus primeros apuntes están a un minuto de convertirse en un test
            </h2>
            <Button render={<Link href="/register" />} size="lg">
              Crear cuenta gratis
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-border text-muted-foreground border-t px-6 py-8 text-center text-sm">
        <p>
          Evalia — proyecto de código abierto.{" "}
          <a
            href="https://github.com/AndresChili/Evalia"
            className="hover:text-foreground underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver en GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
