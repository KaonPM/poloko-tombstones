import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Poloko Tombstones",
    short_name: "Poloko",
    description:
      "Browse premium tombstones and request a personalised quotation from Poloko Tombstones.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F4EFE6",
    theme_color: "#14110D",
    orientation: "portrait-primary",
    categories: ["business", "lifestyle", "shopping"],
    icons: [
      {
        src: "/poloko-tombstones-logo.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

