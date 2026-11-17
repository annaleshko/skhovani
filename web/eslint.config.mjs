import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Native flat configs from eslint-config-next@16
const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [".next/**", "node_modules/**", "out/**"],
  },
];

export default eslintConfig;
