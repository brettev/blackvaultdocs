# Frontend (Next.js Application)

The Next.js 16 App Router application that renders peptidedive.com as a statically exported site.

Apply these instructions to `frontend/`. All commands run from this directory.

## UX Intent

Users land on the homepage and browse peptide profiles, comparisons, and blog articles. Pages must load instantly (static HTML from CDN). The site promises evidence-graded, unbiased peptide education with no vendor ties. Broken builds or missing trailing slashes result in 404s on the live site.

## Key Files

| File | Role |
|---|---|
| `app/layout.tsx` | Root layout — nav, footer, metadata, Inter font |
| `app/page.tsx` | Homepage — hero, trending peptides, categories, comparisons, FDA section |
| `app/blog/page.tsx` | Blog index listing all posts from `content/blog/` |
| `app/blog/[slug]/page.tsx` | Dynamic blog post renderer (static params from markdown files) |
| `next.config.ts` | Static export config (`output: "export"`, `trailingSlash: true`) |
| `lib/blog.ts` | Markdown parser (gray-matter + remark) for blog content |
| `data/peptides.json` | Peptide catalog (name, evidence grade, FDA status, benefits, dosing) |
| `data/categories.json` | Goal-based category definitions with icons |

## Local Conventions

- Static export: no API routes, no `getServerSideProps`, no server actions. Every page must resolve at build time via `generateStaticParams`.
- All `<Link>` hrefs use trailing slashes (e.g., `/blog/` not `/blog`).
- Blog slug pages use `dynamicParams = false` — unknown slugs 404 at build time.
- Tailwind v4 via PostCSS plugin (no `tailwind.config.js` — configuration is CSS-based via `@theme`).

## Gotchas

- `next.config.ts` uses `images: { unoptimized: true }` because `next/image` optimization is incompatible with static export.
- The `prose` class in `globals.css` is hand-rolled (not `@tailwindcss/typography`) — changes there affect all blog post rendering.
- Blog content uses `dangerouslySetInnerHTML` — any user-contributed markdown must be sanitized upstream.
- The `params` prop in dynamic routes is a `Promise` (Next.js 16 convention) — must `await params` before use.
