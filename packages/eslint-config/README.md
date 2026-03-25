# @repo/eslint-config

Shared ESLint presets for this monorepo.

## Use

In your eslint.config.mjs (recommended):

```js
import config from '@repo/eslint-config';

export default config;
```

Works for package.json `eslintConfig` as well: `{ "extends": "@repo/eslint-config" }`.
