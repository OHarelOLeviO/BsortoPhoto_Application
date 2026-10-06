# Verification record

Local verification completed on 7 October 2026:

- Strict TypeScript check: passed.
- ESLint: passed with no warnings.
- Vitest: 20 tests in 7 files passed.
- Production build: passed.
- Repository-subpath build: asset links checked against emitted files.
- npm dependency audit after installation: no known vulnerabilities reported.

Tests cover image type/size and dimensions; identifier mapping and duplicate CSV rejection; upload insertion failure cleanup; no overwrite; session restoration/logout event and inactive membership; pagination reset, deduplication and stale response handling; shared like optimism, overlap prevention, reconciliation and rollback; debounced Hebrew search with stale result protection; viewer modal lifecycle, cancel handling, scroll lock and focus restoration.

PGlite runs the actual migration on a local PostgreSQL engine, with minimal test-only auth/storage schemas. Tests exercise anonymous restrictions, profile edit denial, storage folder ownership, like ownership/deletion/uniqueness, inactive member read/write restrictions, invoker feed behavior, team filtering before pagination, composite cursors and uploader team changes. These schemas are test fixtures, not a substitute for the Supabase services.

Awaiting external configuration:

- Applying migrations to a real Supabase project.
- Running `npm run test:auth` against real Auth, PostgREST and Storage with disposable fictional members.
- Actual image decoding, orientation and EXIF removal in supported browsers, signed-URL expiration, full interaction and mobile visual QA.
- GitHub Pages deployment and live route/asset verification.

The application is not deployed, and live end-to-end verification has not been claimed. See the Hebrew README for exact setup commands and the manual acceptance checklist.
