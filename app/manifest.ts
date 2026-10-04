import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Evalia",
    short_name: "Evalia",
    description: "Genera tests de estudio a partir de tus propios apuntes, con IA.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a1a3a",
    theme_color: "#1e4fd6",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
