# ai-tools-extensions

AI development extensions and utility packages.

Currently supported harnesses:

- [pi.dev](./pi)
- [OpenCode](./opencode)

## Pi

### Install

Via git:

```bash
pi install git:github.com/shuhaowu/ai-tools-extensions@main
```

Via npm:

```bash
pi install npm:@shuhaowu/pi-tps-report
```

To update after changes are pushed:

```bash
pi update --extensions
```

Then run `/reload` in your pi session.

### Extensions

| Extension | NPM Package | Description |
|-----------|-------------|-------------|
| [`tps-report`](pi/extensions/tps-report/) | `@shuhaowu/pi-tps-report` | TPS reporting extension |

## OpenCode

### Install

Plugins can be used from local files or via npm. For local use, copy the plugin directory to `.opencode/plugins/` or `~/.config/opencode/plugins/`. To use an npm package, add it to the `plugin` array in your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@shuhaowu/opencode-tps-report"]
}
```

### Plugins

| Plugin | NPM Package | Description |
|--------|-------------|-------------|
| [`tps-report`](opencode/plugins/tps-report/) | `@shuhaowu/opencode-tps-report` | TPS reporting plugin |

## Development

```bash
npm install
npm run lint -w @shuhaowu/pi-tps-report # or substitute other extension names
```

If this package is already installed (via `pi install git:...`), push your changes and run `pi update --extensions` to sync the installed copy, then `/reload` in your pi session.
