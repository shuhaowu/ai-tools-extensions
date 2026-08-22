# Project-local pi settings

In settings, we have:

```json
{
  "packages": [
    {
      "source": "git:github.com/shuhaowu/ai-tools-extensions@main",
      "extensions": []
    },
    ".."
  ]
}
```

- **First entry** — same git identity as the global package, so the project entry wins. `extensions: []` disables all extensions from the git-installed copy.
- **Second entry** — `..` resolves to the project root. Since the root `package.json` declares `"pi": { "extensions": ["pi/extensions/*/index.ts"] }`, pi loads all local extensions directly from the working tree.

This means extensions load from your local files when working in this repo (live edits, no git clone), while the global git-installed version still works in other projects.

Pi will clone this repo again in `.pi/git` in this repo. So that's ignored in `.gitignore`.
