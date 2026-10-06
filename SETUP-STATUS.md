# Connection status — 7 October 2026

Repository: https://github.com/OHarelOLeviO/BsortoPhoto_Application

Supabase project: https://igtavvjwxrjfmybwmntl.supabase.co

The supplied publishable key is accepted by Supabase. Local frontend configuration and the GitHub Actions public defaults are configured, with `/BsortoPhoto_Application/` as the Pages base. Only public client configuration is tracked. No administrative key was supplied or stored.

Read-only live probes found:

- Email authentication enabled; public signup still enabled.
- An existing `public.teams` table is readable by an unauthenticated request.
- `public.profiles` is absent from the API schema cache.

The fresh-project migration cannot simply be applied over the existing `teams` table. Inspect its schema and dependencies through the project owner connection first, then prepare a compatible migration that preserves existing data. No member names or photos were fetched by the probes. No existing backend data was modified.

Git remote is configured locally. The repository advertised no refs when inspected. Push failed because this session could not use Git Credential Manager; no code was pushed. GitHub and Supabase owner connections are needed to continue remote setup without exchanging private credentials.

Next: authorize GitHub repository access and Supabase project access through their plugins; inspect existing schema; apply the compatible migration and storage policies; disable signup; provision fictional test accounts through the Admin API; run live authorization and browser tests; enable GitHub Pages with Actions; push and verify deployment. Real member provisioning remains a local/private operation.
