# Posts and members update — 11 October 2026

The deployed Supabase project has migration `003_posts_comments_members.sql` applied. Do not rerun it there. A fresh project should apply migrations 001, 002 and 003 in order.

- New uploads accept an optional description, up to 2,000 characters.
- Existing 17 posts were preserved with an empty description and no comments.
- Comments accept 1–1,000 nonblank characters, use the authenticated member ID, and are shown in the photo viewer with pagination.
- Only the signed-in post owner can delete a post. The interface asks the member to confirm. Database policies enforce ownership even if a request bypasses the interface.
- Post deletion cascades to likes and comments. The client then removes the private Storage image. If file cleanup fails, the post remains deleted and the app shows a cleanup notice; the existing orphan-cleanup script is available to administrators.
- The Members page shows active linked profiles and imported members who have not signed in yet, grouped by team and alphabetized by name. Every entry links to a profile, including members without an Auth account. Disabled linked members remain excluded.
- Name-only sign-in remains unchanged: the selected member determines the session identity.

Verification: local build and lint passed, 33 existing/extended tests passed, and two additional deletion-service tests passed. Live checks confirmed description insertion/readback, comment insertion/counts, blocked forged authorship, blocked cross-member deletion, owner deletion, comment/like cascading, Storage cleanup, all 56 directory entries and preservation of the original 17 posts. Live test records were removed.
