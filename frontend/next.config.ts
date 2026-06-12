import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /** Parent monorepo (`range/`) has another lockfile; pin root so App Router is this package. */
  outputFileTracingRoot: path.resolve(process.cwd()),
  eslint: { ignoreDuringBuilds: true },
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  /**
   * The blog (posts + sitemap-blog.xml) is rendered by the Symfony backend on
   * api.blackvaultdocs.com. Apache proxies the whole apex to this Next app,
   * so proxy those paths through to the backend or they 404 on the apex.
   */
  async rewrites() {
    const api = process.env.BVD_API_BASE ?? "https://api.blackvaultdocs.com";
    return [
      { source: "/sitemap-blog.xml", destination: `${api}/sitemap-blog.xml` },
      // Index before slug rewrites so /blog/ does not capture as :slug.
      { source: "/blog/", destination: `${api}/blog` },
      { source: "/blog", destination: `${api}/blog` },
      // trailingSlash: true means incoming blog paths normally carry a
      // trailing slash, but match both forms to be safe.
      { source: "/blog/:slug/", destination: `${api}/blog/:slug` },
      { source: "/blog/:slug", destination: `${api}/blog/:slug` },
    ];
  },
};

export default nextConfig;
