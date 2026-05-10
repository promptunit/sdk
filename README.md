# @promptunit/sdk

> Drop-in OpenAI client that routes LLM calls to cheaper models automatically, with built-in failover.

[![npm version](https://img.shields.io/npm/v/@promptunit/sdk)](https://www.npmjs.com/package/@promptunit/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Powered by PromptUnit](https://img.shields.io/badge/Powered%20by-PromptUnit-D4A535?style=flat-square)](https://www.promptunit.ai)

## The problem

Most teams route all AI calls to GPT-4o by default. 60-70% of those calls don't need GPT-4o. The fix is routing, but building and maintaining a routing layer is engineering work nobody wants to own.

PromptUnit does it for you. One line change. Routing happens transparently in the proxy.

## Install

```bash
npm install @promptunit/sdk
```

## Quickstart

```ts
import { createPromptUnit } from "@promptunit/sdk";

const client = createPromptUnit({
  promptunitKey: process.env.PROMPTUNIT_API_KEY,
  openaiKey: process.env.OPENAI_API_KEY,
});

// Your existing code works unchanged
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Summarize this text..." }],
});
```

That's it. The SDK wraps your OpenAI client. Routing happens inside the proxy — your application never changes.

## What happens to each request

```
Your app
  └─ client.chat.completions.create({ model: "gpt-4o", ... })
       └─ PromptUnit proxy (Inferio engine)
            ├─ Classifies task: summarization / classification / extraction / reasoning
            ├─ Scores complexity across 27 signals
            ├─ Routes to cheapest model that clears your quality threshold
            └─ Returns response in standard OpenAI format
```

Your code receives a standard OpenAI ChatCompletion object. It never knows the call was routed.

## Savings by task type

| Task | Default model | Routed to | Cost reduction |
|------|--------------|-----------|---------------|
| Classification | GPT-4o | GPT-4o-mini | 94% |
| Summarization | GPT-4o | GPT-4o-mini | 94% |
| Structured extraction | GPT-4o | GPT-4o-mini | 94% |
| Short-form generation | GPT-4o | GPT-4o-mini | 94% |
| Customer support (standard) | GPT-4o | Claude Haiku 4.5 | 88% |
| Complex reasoning | GPT-4o | GPT-4o | 0% — kept on flagship |
| Code generation | GPT-4o | GPT-4o | 0% — kept on flagship |

Teams spending $5K-$50K/month on AI APIs typically see **40-70% cost reduction** after the 14-day observation period.

## Automatic failover

If PromptUnit is ever unreachable (timeout, 5xx), the SDK falls back directly to OpenAI — no errors, no downtime, no action required on your side.

## 14-day observation period

Before any routing changes your traffic, PromptUnit runs in **shadow mode**:

- Logs every API call
- Classifies each request and decides what it would route it to
- Projects your exact savings

You see the full forecast in the dashboard before enabling anything. No routing until you click.

## Supported providers

| Provider | Models |
|----------|--------|
| OpenAI | GPT-4o, GPT-4o-mini, o1, GPT-5.4, GPT-5.5 |
| Anthropic | Claude Opus 4, Sonnet 4, Haiku 4.5 |
| Google | Gemini 2.5 Pro, 2.5 Flash, 2.0 Flash |
| Groq | Llama 4 Maverick, Llama 4 Scout (ultra-low latency) |
| DeepSeek | V4 Pro, V4 Flash |

## Configuration

```ts
const client = createPromptUnit({
  promptunitKey: "pu_...",   // Your PromptUnit API key
  openaiKey: "sk-...",       // Your OpenAI API key (used as fallback)
  baseUrl: "https://api.promptunit.ai", // optional, default shown
  timeout: 8000,             // optional, ms before falling back to OpenAI
});
```

## Alternative: base URL swap (no package needed)

```python
# Python
client = OpenAI(
    api_key="sk-...",
    base_url="https://api.promptunit.ai/api/proxy/openai",
    default_headers={"x-promptunit-key": "pu_..."},
)
```

```ts
// Node.js / TypeScript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.promptunit.ai/api/proxy/openai",
  defaultHeaders: { "x-promptunit-key": process.env.PROMPTUNIT_API_KEY },
});
```

Works with any OpenAI-compatible SDK: Python, Go, Ruby, any HTTP client.

## Pricing

Free to start. PromptUnit takes **20% of verified savings only**. If routing saves you nothing, you pay nothing.

A team saving $5,440/month pays $1,088/month. Net saving: $4,352/month.

## Add the badge to your README

If you're using PromptUnit in your project, add this to your README:

```markdown
[![Powered by PromptUnit](https://img.shields.io/badge/Powered%20by-PromptUnit-D4A535?style=flat-square)](https://www.promptunit.ai)
```

[![Powered by PromptUnit](https://img.shields.io/badge/Powered%20by-PromptUnit-D4A535?style=flat-square)](https://www.promptunit.ai)

## Get your API key

Sign up at [promptunit.ai](https://www.promptunit.ai) — free, 5-minute setup, no credit card required.

## License

MIT

---

If this saved you money, a star helps others find it. [Leave a star on GitHub](https://github.com/promptunit/sdk)
