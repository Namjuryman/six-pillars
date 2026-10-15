# Six Pillars — Codex working instructions

Read `docs/PRD.md` before making code changes. Treat `docs/schema.proposal.sql` as an **unverified migration proposal** until deployed and tested in a dedicated Supabase development project. Do not claim it is production-secure without validating policies.

## Scope control

- Implement one milestone at a time, beginning with M0 (public static pages).
- Do not start backend authentication, database writes, financial records, file uploads, or LLM connections during M0.
- Preserve the six pillars as independent categories: fitness, english, analog_ic, cooking, ai, finance. AI is an independent second specialty, not merely an analog IC submodule.
- Present realistic milestones rather than made-up universal learning percentages.

## Engineering standards

- React, TypeScript, Vite, Tailwind, HashRouter for GitHub Pages.
- Mobile-first layout and semantic accessible elements. Ensure keyboard navigation and clear empty/error states.
- Keep business logic, data models, route definitions and UI components separated.
- Use TypeScript strict mode where practical. Write tests for data and access logic.
- Never put personal financial or health records into static source or public fixtures.
- `VITE_` variables are public; no private credentials or LLM API keys should be placed there.
- Admin route guards are only UX. Actual authorization must be enforced by Supabase RLS.
- Public content must be purpose-written and published from the public_entries table. Never expose a private record by toggling its visibility.
- Validate RLS with anonymous, owner, and non-owner authenticated sessions before release.
- Keep all schema changes in migrations. Prefer small reversible changes; provide instructions for admin bootstrapping of app_owners.

## Each milestone completion report

1. Files changed and features implemented.
2. Exact commands for local run, test and build.
3. Tests run and results.
4. Privacy/security considerations and known gaps.
5. Steps still requiring user action (GitHub Pages, Supabase config).
6. Next suggested milestone, without silently implementing it.

## M1 authorized (2026-10-15)

Owner-approved simplified launch supersedes the earlier two-project requirement: reuse `rplgwjhnptappdbwqygj` as the sole personal data project. Approval is recorded in `config/approved-data-project.json`. Keep PR builds isolated, RLS and key-type checks intact. Do not run destructive development suites or elevate QA accounts on this project. Production configuration is authorized; PR merge and Pages deployment still require separate explicit owner approval. Use default Supabase email first; no Pro/TOTP/M2 work.

M0 has been accepted. M1 is now authorized, on a separate branch/PR only. Scope: single-owner email link authentication (explicitly approved instead of OTP during setup), goals/milestones/logs private CRUD, achievements CRUD and unlock/lock. No M2 publication, photo uploads, financial integrations or Agent. Do not merge or configure production Supabase without verified three-identity RLS API checks. Follow `docs/M1_SETUP.md`.

## M0 task

Create a clean, attractive public website with the landing page, pillar pages, roadmap, projects, writing and about page (placeholder content must be visibly labeled examples). Configure GitHub Actions deployment. Add concise README and links to documentation. No fake personal metrics. Do not add database or login until M1 is explicitly authorized.
