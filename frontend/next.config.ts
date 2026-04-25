import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "export",
  /** Parent monorepo (`range/`) has another lockfile; pin root so App Router is this package. */
  outputFileTracingRoot: path.resolve(process.cwd()),
  eslint: { ignoreDuringBuilds: true },
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
