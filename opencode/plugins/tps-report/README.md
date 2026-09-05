# tps-report

An [OpenCode](https://opencode.ai) plugin that shows a status indicator in the TUI session prompt with token throughput metrics: **PP** (prefill), **TG** (token generation), and **TTFT** (time to first token).

## Output

```
PP 545.6 | TG 34.8 | TTFT 922ms
```

The indicator is rendered in the right side of the session prompt via the `session_prompt_right` slot.

## How the numbers are calculated

The model works in two phases, and **TTFT** (time to first token) is what we *assume* it can be used to split a message's total time into them:

```
|<----------- total (end - start) ----------->|
|<---- TTFT (prefill) ---->|<---- decode ---->|
start                  firstToken           end
```

- **PP** — prefill throughput: prompt tokens per second during the time *before* the first token. A rolling average over the last 16 messages.
- **TG** — token generation throughput: output tokens per second during the decode phase *after* the first token. A rolling average over the last 16 messages.
- **TTFT** — the raw time to first token of the most recent message (not averaged).

The input/output token counts come from the provider's reported usage: `input` tokens for prompt and `output` tokens for completion. These are exact counts from the provider, not client-side estimates.

If the assumptions of the TTFT splitting the prefill and decode doesn't hold, or if the token usage returned from the API is inaccurate, then the data here will be inaccurate.

## Install

Add the plugin to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@shuhaowu/opencode-tps-report"]
}
```

Or copy the plugin directory to `.opencode/plugins/` or `~/.config/opencode/plugins/` for local use.
