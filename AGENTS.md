# AGENTS.md

This repo is a Node.js workspace monorepo of multiple extensions. Use `npm` only.

## Workspace layout
```
packages/*
pi/extensions/*
```
Both are workspaces defined in the root `package.json`.

Biome configuration is at repo root: `biome.jsonc`.

## Development commands

From an extension directory, e.g. `pi/extensions/tps-report`:

Type check and lint:
```bash
npm run lint
```
`lint` runs `tsc --noEmit && biome check .` using the root Biome config and workspace TypeScript.

Format code:
```bash
npm run format
```
`format` runs `biome format --write .` using the root config.

## Development loop

Run `npm run lint` once before returning to the user to verify TypeScript types and Biome rules. Fix any lint errors, then run `npm run format` if formatting is needed.

General workspace commands:
```bash
# type check an extension
cd pi/extensions/<name>
npm run lint

# format an extension
cd pi/extensions/<name>
npm run format
```

Dependencies are hoisted via the workspace. Do not add Biome or TypeScript as dev dependencies in extensions; they are provided by the root `package.json`.
