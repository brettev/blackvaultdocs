# blackvaultdocs.com — frontend

Next.js 16 App Router app, exported to static HTML and served from S3 +
CloudFront. Renders the public BlackVaultDocs archive on top of the
Symfony API at `api.blackvaultdocs.com`.

See the root `.cursorrules` for the full operational manual (server,
AWS, database, ingestion status) and `frontend/AGENTS.md` for
frontend-specific conventions.

## Local dev

```bash
npm ci
NEXT_PUBLIC_API_BASE=https://api.blackvaultdocs.com npm run dev
# open http://localhost:3000
```

Set `NEXT_PUBLIC_API_BASE` to any running backend (e.g. `http://localhost:8000`
when running the Symfony app locally).

## Build + deploy

```bash
npm ci
NEXT_PUBLIC_API_BASE=https://api.blackvaultdocs.com MAX_STATIC_DOCS=20000 npm run build
aws s3 sync out/ s3://blackvaultdocs.com/ --delete \
  --cache-control "public, max-age=300, s-maxage=3600"
aws cloudfront create-invalidation --distribution-id E2I87T26ZZLVBA --paths '/*'
```

Only deploy from a laptop — the EC2 role on `sshnewbe` can't touch
CloudFront.

## Directory layout

```
app/
  layout.tsx / page.tsx              hero + featured collections + recent
  components/SiteChrome.tsx          header + footer
  lib/api.ts                         typed API client
  topics/                            collection index + detail + pagination
  documents/                         recent index + document detail
  agencies/                          agency index + detail
  search/                            static page + client-side filter
  stats/                             live corpus stats
scripts/generate-sitemap.mjs         prebuild step (sitemap + robots)
public/                              static assets (SVGs, sitemap, robots)
next.config.ts                       static export config
```
