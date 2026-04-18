# App Router Pages

Next.js App Router page components and layouts for peptidedive.com.

Apply these instructions to `frontend/app/`.

## UX Intent

Each route renders a user-facing page. The homepage is the primary landing page for SEO traffic. Blog pages drive long-tail keyword traffic. Every page includes site-wide nav, footer, and medical disclaimer context. Broken routes or missing `generateStaticParams` will cause build failures since the site uses static export.

## Key Files

| File | Role |
|---|---|
| `layout.tsx` | Root layout — sticky nav, footer, skip-to-content link, metadata |
| `page.tsx` | Homepage — hero CTA, trending peptides, categories grid, comparisons, FDA section |
| `blog/page.tsx` | Blog index — lists all published posts sorted by date |
| `blog/[slug]/page.tsx` | Blog post detail — renders markdown HTML with breadcrumb and disclaimer |
| `globals.css` | Global styles including hand-rolled `.prose` typography for blog content |

## Local Conventions

- Pages export `metadata` objects (or `generateMetadata` for dynamic routes) for SEO.
- The homepage reads directly from JSON data files — no fetch calls.
- Blog routes use `generateStaticParams` + `dynamicParams = false` for static export compatibility.
- Nav links are defined as a `NAV` array in `layout.tsx` — add new top-level pages there.

## Gotchas

- Adding a new dynamic route (e.g., `/peptides/[slug]/`) requires a corresponding `generateStaticParams` or the build will fail.
- The `globals.css` prose styles must stay in sync with blog markdown structure — heading levels, tables, code blocks all have custom styling.
