"use client";

import { Download } from "lucide-react";

import { Button, type buttonVariants } from "@/components/ui/button";
import { promptInstall, usePwaInstallState } from "@/lib/pwa-install";
import type { VariantProps } from "class-variance-authority";

type InstallAppButtonProps = VariantProps<typeof buttonVariants> & {
  className?: string;
};

export function InstallAppButton({
  className,
  variant = "outline",
  size = "default",
}: InstallAppButtonProps) {
  const state = usePwaInstallState();

  if (state !== "available") return null;

  return (
    <Button variant={variant} size={size} className={className} onClick={() => promptInstall()}>
      <Download /> Instalar app
    </Button>
  );
}
