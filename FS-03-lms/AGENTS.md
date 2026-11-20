# AGENTS.md — Rules for every AI model working on this repo

Project: **LMS with Live Classes** — courses, HLS video lessons, live classes (LiveKit) with chat,
quizzes with auto-grading, PDF certificates, instructor revenue dashboard, test-mode payments.

Two models work here: **MiMo** (opencode) and **Nemotron** (kilocode). Either may be cut off
by a rate limit at any moment. These rules exist so the other one can continue without context.
(Kilocode users: copy this file to `.kilocode/rules/agents.md` so it is loaded automatically.)

## Start of every session
1. Read `TASKS.md`, `ARCHITECTURE.md` and `API_CONTRACT.md` fully.
2. Pick the first task in `TASKS.md` that is `[ ]`, whose dependencies are `[x]`, and whose owner is you
   (or `ANY`). Do not skip ahead. Do not take a task owned by the other model unless the human says so.
3. Say which task ID you are doing before writing code.

## Working rules
- ONE task at a time. Finish it, test it, commit it, tick it in `TASKS.md`, then start the next.
- Stay inside the folders the task names. Do not refactor unrelated code.
- `API_CONTRACT.md` is law. If a task needs a change, edit the contract first, add a line to the
  "Contract changes" section of `TASKS.md`, then implement.
- TypeScript `strict: true` on both server and client. No `any` without a comment explaining why.
- Validate every request body/query with `zod` in a route-level middleware.
- Business logic goes in `server/src/services/*`, never in route handlers or models.
- Every service function with real logic (grading, earnings, progress, enrollment checks) gets a unit test.
- No new npm dependency without adding one line to "Dependencies added" in `TASKS.md`.
- All secrets come from env vars; add every new one to `.env.example`. Never commit `.env`.
- If unsure about an AWS / LiveKit / Stripe / BullMQ / FFmpeg API, say so and check the official docs
  instead of guessing method names.
- Keep files under ~300 lines; split when larger.
- Commit after each task: `feat(video): HLS transcode worker (T-12)` (conventional commits, task ID in message).

## If you are about to run out of tokens or hit a rate limit
1. Stop starting new work. Get the code to a state that compiles.
2. `git commit` (use `wip:` prefix if unfinished).
3. Append to the **Handoff log** at the bottom of `TASKS.md`: task ID, what is done, what is left,
   files touched, any failing test, the exact next command to run.
4. Stop.

## Repo layout (monorepo, npm workspaces)
```
/server   Express + TypeScript + Mongoose + BullMQ
  src/config  src/models  src/routes  src/controllers  src/services
  src/middleware  src/workers  src/utils  src/tests
/client   React + Vite + TypeScript + Redux Toolkit (RTK Query for API)
  src/app  src/features/<feature>  src/components  src/pages
/docs     architecture diagram, test results, perf numbers
/scripts  seed.ts, sample video tools
```

## Style
- Server: controllers are thin; services return plain objects; errors thrown as `AppError(status, code, message)`.
- Client: one folder per feature under `src/features` (api, slice, components, types). RTK Query for server data;
  plain slices only for UI/auth state.
- camelCase in code and JSON; Mongo `_id` is exposed as `id` in API responses.

## Definition of done for any task
Compiles, lints, its tests pass, exercised once manually (curl or browser), committed, ticked in `TASKS.md`.
