# ai-tools-extensions

AI development extensions and utility packages.

Currently supported harness:

- [pi.dev](./pi)

## Install

```bash
pi install git:github.com/shuhaowu/ai-tools-extensions@main
```

To update after changes are pushed:

```bash
pi update --extensions
```

Then run `/reload` in your pi session.

## Extensions

| Extension | Description |
|-----------|-------------|
| [`tps-report`](pi/extensions/tps-report/) | TPS reporting extension |

## Development

```bash
npm install
npm run lint -w @shuhaowu/pi-tps-report # or substitute other extension names
```

If this package is already installed (via `pi install git:...`), push your changes and run `pi update --extensions` to sync the installed copy, then `/reload` in your pi session.
