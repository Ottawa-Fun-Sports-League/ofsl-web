# Repository Guidelines

## Project Structure & Modules
- `src/`: React + TypeScript source.
  - `components/` (UI + feature components), `screens/` (route pages), `lib/` (helpers), `hooks/`, `contexts/`, `types/`, `styles/`.
  - Tests live beside code (e.g., `*.test.tsx`) and in `src/components/__tests__` and `src/lib/__tests__`.
- `public/`: static assets served by Vite.
- `e2e/`: Playwright end‑to‑end tests; config in `playwright.config.ts`.
- `scripts/`: maintenance scripts; `supabase/`: functions and SQL; `docs/`: extra docs.

## Build, Test, and Dev
- `npm run dev`: Start Vite dev server at `http://localhost:5173`.
- `npm run build`: Production build.
- `npm run preview`: Preview the production build locally.
- `npm run typecheck`: TypeScript project check (no emit).
- `npm run lint` | `npm run lint:fix`: Lint and auto‑fix issues.
- Unit tests (Vitest): `npm test` (watch), `npm run test:run` (CI), `npm run test:ui`.
- E2E (Playwright): `npm run test:e2e` (headless), `npm run test:e2e:ui` (runner UI).

## Coding Style & Naming
- Language: TypeScript + React (Vite).
- Linting: ESLint (`.eslintrc.json`) with `@typescript-eslint`, React, hooks, and `unused-imports`.
  - Notable rules: disallow `any`, warn on `console` (allow `warn`/`error`).
- Indentation: follow existing files (2 spaces typical). Run `npm run lint:fix` before PRs.
- Naming: Components and screens in `PascalCase`; hooks `useX`; test files `*.test.ts(x)`.

## Testing Guidelines
- Frameworks: Vitest + React Testing Library for unit/integration; Playwright for E2E.
- Organization: co‑locate tests with code or use `__tests__` folders; E2E under `e2e/`.
- Coverage: aim for >80% on critical paths (auth, payments, mutations). See `TESTING.md` and `TEST_QUICK_REFERENCE.md`.
- Run: `npm run test:run` locally before pushing; add E2E for major flows.

## Commit & PR Guidelines
- Commits: follow Conventional Commits (e.g., `feat:`, `fix:`, `chore:`). Keep messages imperative and scoped.
- PRs: include a clear description, linked issue(s), test coverage notes, and screenshots or videos for UI changes. Note any env/config changes.

## Security & Configuration
- Env: create `.env` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`. Do not commit secrets.
- Review `supabase/` changes carefully; ensure migrations and edge functions align with database schema.
- When touching auth or payments, add E2E tests and verify error handling.

