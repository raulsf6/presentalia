import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Every page in this app renders from the request's session (cookies),
  // so there is nothing to statically prerender: classic dynamic rendering
  // is simpler and fully supported (pages declare `dynamic =
  // "force-dynamic"`).
  cacheComponents: false,
  experimental: {
    // Slide PDFs upload directly to Supabase. Server Actions only need room
    // for small forms/roster CSVs (1 MB plus multipart overhead).
    serverActions: { bodySizeLimit: "2mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
