import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pages personalize their chrome and content from the request, but the
  // shell around the session read can still prerender and stream. Cache
  // Components makes that split explicit; `use cache` scopes assign lifetimes
  // to the data that is safe to reuse.
  cacheComponents: true,
  partialPrefetching: true,
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
