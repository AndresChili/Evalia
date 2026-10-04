import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-8 bg-zinc-50 px-4 py-12 dark:bg-black">
      <Link href="/" className="flex items-center gap-2">
        <Image src="/icon.png" alt="Evalia" width={32} height={32} className="rounded-lg" />
        <span className="text-lg font-semibold tracking-tight">Evalia</span>
      </Link>
      <div className="border-border bg-background w-full max-w-sm rounded-xl border p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
