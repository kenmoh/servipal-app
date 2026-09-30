# AGENTS.md

Repo: `servipal-app` (Expo SDK 56, React Native 0.85.3, React 19.2.3). Package manager is npm (`package-lock.json`).

## Installing packages

Always install Expo-adjacent packages with the Expo CLI so versions resolve against the installed SDK:

```
npx expo install <package> --dev
```

Never `npm install <package>@<version>` for anything Expo, React Native, React or Babel touches. Pinning by hand produces version skew against SDK 56. `--dev` saves as a devDependency; `--npm` is already the default here because `package-lock.json` exists.

## Git

- Stage explicit paths. Never `git add -A` or `git add .` — `mintty.*.png` and other stray files are untracked and would ride along.
- `.opencode/` is ignored and must stay ignored.

## Gates

```
npm test        # jest, must be green
npm run lint    # see baseline below
```

**Lint baseline: 255 problems (63 errors, 192 warnings) on a clean checkout.** `npm run lint` does not exit zero today, so treat it as a *comparison*, not a pass: record the count before your change and make sure it does not go up. `npm test` is the gate that actually fails.

There is no CI in this repo (no `.github/workflows`). These two commands are the entire gate.

## Structure

- Path alias `@/*` maps to the repo root, declared in `tsconfig.json`. Jest mirrors it with `moduleNameMapper`.
- Delivery option logic lives in `lib/delivery-options.ts` and is covered by `__tests__/delivery-options.test.ts`. Keep it a pure function; `app/cart.tsx` should call it rather than branch in JSX.
