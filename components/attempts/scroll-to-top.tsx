"use client";

import { useEffect } from "react";

export function ScrollToTop() {
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  return null;
}
