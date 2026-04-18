# blackvaultdocs.com

Archive + search + analysis layer over declassified US government documents, FOIA releases, and open intelligence disclosures.

Inspired by the playbook style of `localcrimevault.com`, `lobbyvault.com`, `spendingvault.com` - ingest a large public dataset into structured storage, build SEO-oriented frontend surfaces (document pages, topic pages, agency pages), and layer LLM analysis on top to find trends, anomalies, and narratives across documents.

## Structure

- `backend/` - Symfony 7 API consumed by the frontend and used by ingestion crons
- `frontend/` - Next.js (static export) marketing + document pages served via CloudFront

## Primary data sources (planned)

- CIA CREST (25-year FOIA releases)
- FBI Records / The Vault
- National Archives (NARA) declassified series
- National Security Archive (GWU) digitized collections
- White House / ODNI declassified UAP + UFO document dumps
- State Department / Department of Defense FOIA reading rooms
- DOE / DOJ / DHS reading rooms

## Not secrets - just the public brand

There is an existing `theblackvault.com` run by John Greenewald Jr. This project intentionally takes a different structural angle: machine-readable ingestion + structured search + LLM-generated thematic analysis, not curated blog posts. Branding should be distinct enough to avoid confusion.
