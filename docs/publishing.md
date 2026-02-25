# Publishing Pesafy to npm

## 1. Build and typecheck

From the `pesafy` package directory:

```bash
# Install dependencies
npm install

# Build and run type-check
npm run prepublishOnly
# which runs:
#   npm run build
#   npm run typecheck
```

## 2. Bump version

If you are using Changesets:

```bash
npm run version
```

Otherwise, update the `version` field in `package.json` manually (for example
from `0.1.0` to `0.2.0`).

## 3. Publish

Log in to npm if you have not already:

```bash
npm login
```

Then publish:

```bash
npm publish --access public
```

The package name is **`pesafy`**, so consumers install it with:

```bash
npm install pesafy
```

