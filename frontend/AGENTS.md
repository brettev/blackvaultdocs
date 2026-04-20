# Frontend — BlackVaultDocs Next.js App

Next.js 16 App Router, statically exported. Renders `blackvaultdocs.com` on
top of the Symfony API at `api.blackvaultdocs.com`.

Apply these instructions to `frontend/`. All commands run from this directory.

## UX Intent

Visitors land on the homepage and either (a) browse a declassification
collection, (b) jump into a specific document's metadata + PDF preview, or
(c) search the full corpus. Every route must be fast (static HTML from
CloudFront) and link-able (clean slug URLs with trailing slashes).

The tone is FOIA/archive — dark background, red accent for "Declassified",
monospace for slugs and NARA record identifiers, prose for paragraphs.
Don't dress it up with gradients or marketing pill buttons.

## Key files

| Path | Role |
|---|---|
| `app/layout.tsx` | Root layout — sticky nav (`SiteHeader`), footer, global metadata |
| `app/page.tsx` | Homepage — stats hero, featured collections, recently indexed, why-this-exists |
| `app/components/SiteChrome.tsx` | `SiteHeader` + `SiteFooter` |
| `app/lib/api.ts` | Typed client for `/api/public/*` + `buildSearchIndex` for the search page |
| `app/topics/page.tsx` | All collections index |
| `app/topics/[slug]/page.tsx` | Collection detail, page 1 (`/topics/<slug>/`) |
| `app/topics/[slug]/page/[page]/page.tsx` | Collection detail, pages 2..N (`/topics/<slug>/page/<n>/`) |
| `app/documents/page.tsx` | Recent documents index |
| `app/documents/[slug]/page.tsx` | Document detail — prev/next, related, PDF preview, JSON-LD |
| `app/agencies/page.tsx` + `[slug]/page.tsx` | Agency index + detail |
| `app/search/page.tsx` + `SearchBox.tsx` | Client-side search over a build-time JSON index |
| `app/stats/page.tsx` | Live archive stats + recent ingestion runs |
| `scripts/generate-sitemap.mjs` | `prebuild` step — fetches live data to write `public/sitemap.xml` and `public/robots.txt` |
| `next.config.ts` | `output: "export"`, `images: { unoptimized: true }`, `trailingSlash: true` |

## Local conventions

- **Static export only.** No API routes, no server actions, no middleware.
  Every dynamic route exports `generateStaticParams` + `dynamicParams = false`.
- **Trailing slashes.** `next.config.ts` sets `trailingSlash: true`. Every
  `<Link>` href ends with `/` — missing the slash = 404 through CloudFront.
- **Data access goes through `app/lib/api.ts`.** Never fetch from components
  directly; keep error handling + typing in one place.
- **SEO metadata** lives on each page via `metadata` / `generateMetadata` with
  `alternates.canonical` set. Document detail pages also emit JSON-LD
  (`DigitalDocument`) for rich results.
- **Tailwind v3** via `tailwind.config.ts` + `postcss.config.mjs`. If you
  migrate to v4/`@theme` update this note + `.cursorrules`.
- **Prev/next navigation** on document pages uses slug-lexicographic order
  (same as the topic detail page) — keep that ordering stable.

## Build + deploy

The static export lives on S3 behind CloudFront. Only deploy from a laptop
— the EC2 instance role can't touch CloudFront.

```bash
npm ci
NEXT_PUBLIC_API_BASE=https://api.blackvaultdocs.com \
  MAX_STATIC_DOCS=20000 \
  npm run build   # prebuild regenerates public/sitemap.xml + robots.txt
aws s3 sync out/ s3://blackvaultdocs.com/ --delete \
  --cache-control "public, max-age=300, s-maxage=3600"
aws cloudfront create-invalidation --distribution-id E2I87T26ZZLVBA --paths '/*'
```

`MAX_STATIC_DOCS` caps the number of `/documents/<slug>/` pages that get
prebuilt. The live corpus is ~12.6k today, so 20k gives comfortable
headroom.

## Gotchas

- `images: { unoptimized: true }` is required — `next/image` optimization
  is incompatible with static export.
- The search page inlines the entire title index as JSON; if the corpus
  grows past ~30k rows, switch to a split-fetched or MiniSearch-backed
  index before shipping.
- When a `dynamicParams = false` route's static params set shrinks (e.g. a
  topic is removed), re-build + redeploy — otherwise stale `/documents/<slug>/`
  pages keep serving from S3 until invalidated.
- `prebuild` hits the live API. If the API is down, sitemap generation
  fails-open with a tiny fallback sitemap, but the main `next build` will
  also produce empty dynamic routes. Always verify API health before a
  deploy.
