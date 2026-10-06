"use client";

import { useSyncExternalStore } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallState = "unavailable" | "available" | "installed";

let deferredEvent: BeforeInstallPromptEvent | null = null;
let installed = false;
let initialized = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  installed = isStandalone();

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredEvent = event as BeforeInstallPromptEvent;
    emit();
  });

  window.addEventListener("appinstalled", () => {
    installed = true;
    deferredEvent = null;
    emit();
  });
}

function subscribe(listener: () => void) {
  init();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): InstallState {
  if (installed) return "installed";
  return deferredEvent ? "available" : "unavailable";
}

function getServerSnapshot(): InstallState {
  return "unavailable";
}

export function usePwaInstallState() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export async function promptInstall() {
  if (!deferredEvent) return;
  const event = deferredEvent;
  const choice = await event.prompt().then(() => event.userChoice);
  if (choice.outcome === "accepted") {
    installed = true;
  }
  deferredEvent = null;
  emit();
}
