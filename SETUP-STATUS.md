# Live setup — 7 October 2026

Website: https://oharelolevio.github.io/BsortoPhoto_Application/
Repository: https://github.com/OHarelOLeviO/BsortoPhoto_Application

Name-only login is deployed to GitHub Pages and the Supabase name-login Edge Function. The existing six teams and 56 members were preserved; the old tables were archived in a private company_legacy schema. Existing members are imported into pending_members and linked to Supabase Auth automatically on their first name selection. No member names, passwords or administrative keys are committed to GitHub.

Database RLS and the private company-photos bucket remain enabled. The public function intentionally allows anyone to select any active member, as requested. No access code is required.

Live checks passed: all 56 directory entries, token issuance, session verification, authenticated profile/feed reads, browser login, refresh restoration and logout. Anonymous direct profile access is denied. Local typecheck, lint, build and 30 tests passed. Full live photo-upload, like and mobile acceptance checks remain pending.
