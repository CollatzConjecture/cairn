<img src="public/logo.svg" alt="" width="64" height="64">

# Cairn

Cairn is a calm, structured project management workspace that runs entirely in the browser. A cairn is a stack of stones that marks a trail, and Cairn does the same for a team’s work by keeping its milestones and structure in view. It has a home dashboard, an inbox, personal task lists, and projects with board, list, table, calendar, timeline, and file views, plus members, teams, activity, and settings. There is no server. Data lives in `localStorage`, and a first visit opens a demo workspace. The app is built with React, TypeScript, shadcn components on Base UI, and Tailwind CSS v4.

![The Cairn home dashboard](docs/preview.png)

## Getting started

You need Node.js 22 or newer (`.nvmrc` pins 22).

```sh
npm install
npm run dev
```

The dev server runs at http://localhost:5174. To run the end-to-end specs, install Chromium once with `npx playwright install chromium`.

## Scripts

| Script                 | What it does                                                           |
| ---------------------- | ---------------------------------------------------------------------- |
| `npm run dev`          | Starts the Vite dev server on port 5174.                               |
| `npm run build`        | Builds the production bundle into `dist/`.                             |
| `npm run preview`      | Serves `dist/` on port 5174.                                           |
| `npm run typecheck`    | Runs `tsc`.                                                            |
| `npm run lint`         | Runs ESLint.                                                           |
| `npm run format`       | Formats every file with Prettier.                                      |
| `npm run format:check` | Fails if a file is not formatted.                                      |
| `npm run test`         | Runs the Vitest unit tests.                                            |
| `npm run e2e`          | Runs the Playwright specs in `e2e/` against a dev server on port 5180. |

CI (`.github/workflows/ci.yml`) runs the type check, lint, format check, unit tests, build, and end-to-end specs on every push to `main` and every pull request.

## Stack

- React 19 with the React Compiler, TypeScript, and Vite
- TanStack Router, with file-based routes split per route
- zustand and immer for state, and zod for the persisted model
- shadcn components on Base UI, and Tailwind CSS v4
- lucide-react, `@dnd-kit`, cmdk, and Sonner
- Vitest and Playwright

## Project structure

```
src/
  routes/        one file per URL (TanStack Router)
  domain/        constants, dates, ids, zod schemas, and the demo workspace
  store/         the zustand store, selectors, actions, and navigation
  shell/         the sidebar, topbar, mobile nav, and error pages
  components/    shared app components, and shadcn components in components/ui/
  ui/            small render helpers, the brand, and toasts
  overlays/      the task drawer, modals, command palette, and keyboard shortcuts
  project/       the project page and its views
  pages/         workspace pages
  settings/      the Settings sections
  auth/          sign in, sign up, password reset, and onboarding
  index.css      Tailwind setup and the theme (the only stylesheet)
e2e/             Playwright specs
docs/            the README screenshot
```

## Deploy

The app builds to static files, so any static host works. `vercel.json` configures Vercel. It runs `npm run build`, serves `dist/`, and rewrites every path to `index.html`, so the client-side router handles deep links such as `/projects/p1/board`. On another host, add the same single-page-app rewrite.

## Contributing

[CONTRIBUTING.md](CONTRIBUTING.md) explains what goes where and the conventions for styling, state, accessibility, motion, and tests. Read it before you open a pull request.

## License

Cairn is released under the [MIT License](LICENSE).
