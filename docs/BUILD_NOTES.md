## Environment
macOS 25.2.0 (Darwin), ARM64. Node v20.19.6. pnpm 10.28.0.

## Package manager
pnpm 10.28.0, isolated node-linker mode (default).

## Failure signature
EPERM: operation not permitted when accessing files in `node_modules/.pnpm/next@16.1.3_.../node_modules/next/dist/client/components/router-reducer/create-href-from-url.js` during `pnpm build`.

## Suspected causes
macOS extended attributes (com.apple.provenance) blocking file access in pnpm store directories.

## Ruled-out causes
Node/pnpm version mismatch. Unix file permissions. pnpm linker mode (using default isolated).

## Resolution
Cleared extended attributes on node_modules: `xattr -dr com.apple.quarantine node_modules`. Build passes after fix.

Cold start build (rm node_modules, fresh install) passes on macOS ARM64.

## Mac EPERM quick fix

Run this if you see EPERM under node_modules or pnpm store:

```bash
xattr -dr com.apple.quarantine node_modules
xattr -dr com.apple.quarantine "$(pnpm store path)"
```
