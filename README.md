# dsh-llm-fallback

> LLM model fallback plugin for [DeepSeek Harness](https://github.com/deepseek-ai/dsh)

Automatically switches to the next configured model when a request fails. All configuration is managed through the **DSH Settings UI** — no manual YAML editing required.

## Features

- Configure an ordered fallback chain of provider+model pairs
- Automatically switches to the next model when the current one fails
- Cycles back to the first model when all are exhausted
- Configuration changes take effect immediately (no restart needed)

## Installation

### Method 1: Plugin Market (Recommended)

```bash
dsh plugin --profile web add dsh-llm-fallback
```

Then open **Settings → llm-fallback** in the DSH UI to configure your fallback chain.

### Method 2: Local Path

Add to your `cordis.patch.yml`:

```yaml
- id: llm-fallback
  name: 'file:/path/to/dsh-llm-fallback'
```

## Configuration

All settings are managed in the **DSH Settings UI** under the `llm-fallback` section:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `fallbackChain` | List | `[]` | Ordered list of `{provider, model}` pairs to try |
| `fallbackOn` | List | `["RATE_LIMIT","SERVER","TIMEOUT","TRANSPORT","EMPTY_RESPONSE"]` | Failure codes that trigger fallback |
| `maxFailuresPerModel` | Number | `1` | Consecutive failures before switching to next model |

### Example fallbackChain

```yaml
fallbackChain:
  - provider: deepseek
    model: deepseek-chat
  - provider: deepseek
    model: deepseek-reasoner
  - provider: openai
    model: gpt-4o
  - provider: openai
    model: gpt-4o-mini
```

> **Note**: The `provider` value must exactly match the route ID shown in **Settings → Models**.

## How It Works

```
Request sent → agent/request waterfall
                 │
                 ├─ Read current fallbackChain from DSH settings
                 ├─ Check failure count for current provider/model
                 ├─ Below threshold → send normally
                 └─ At threshold → switch to next entry in fallbackChain
                           ↓
                 Request retried with new provider/model
                           ↓
                 Success → reset counter / Failure → continue switching
```

Configuration changes are synced in real-time via the `onChange` hook.

## Requirements

- DSH >= 0.1.0-rc.2
- At least one provider+model configured in **Settings → Models**
- All providers and models in `fallbackChain` must be registered

## License

MIT License. Copyright (c) 2025 [eye33](https://github.com/eye33)
