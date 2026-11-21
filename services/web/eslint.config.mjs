import tseslint from 'typescript-eslint';
import nextConfig from 'eslint-config-next';

const config = [
  {
    ignores: ['.next/**', 'dist/**', 'node_modules/**'],
  },
  ...nextConfig,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];

export default config;
