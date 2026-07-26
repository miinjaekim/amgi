import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * Flat config, loaded directly.
 *
 * `eslint-config-next@16` *is* a flat config, so the `FlatCompat` wrapper this
 * file used to carry — the shape `create-next-app` generated for the eslintrc
 * era — now fails with "Converting circular structure to JSON" trying to
 * serialize it back into the old format.
 */
const eslintConfig = [
  // `next lint` ignored build output implicitly; running eslint directly does
  // not, and linting `.next/` buries the real findings under 25,000 generated
  // ones. Everything here is generated or copied, never authored.
  {
    ignores: [".next/**", "out/**", "public/**", ".turbo/**", "next-env.d.ts"],
  },
  // Same two the eslintrc version extended. `core-web-vitals` already includes
  // the base config; `typescript` is what turns on `no-explicit-any` and
  // friends, and dropping it would quietly weaken the lint rather than fix it.
  ...coreWebVitals,
  ...typescript,
  // Test doubles are typed by what they stand in for, and mocking Firestore
  // precisely costs more than it proves. The rule stays on everywhere the types
  // describe real data.
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
  // Two React Compiler rules arrive new with eslint-config-next 16 and find 13
  // pre-existing spots, most of them deliberate (`setClientNow(new Date())` to
  // dodge a hydration mismatch, `navigator.onLine` read on mount). Each wants
  // its own answer — usually `useSyncExternalStore` — and doing that inside a
  // change that only moves lint onto a working config would bury it. Warnings,
  // so they stay visible, with a backlog item to clear them and turn these back
  // up. Don't silence them further; that's the failure mode this guards against.
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
];

export default eslintConfig;
