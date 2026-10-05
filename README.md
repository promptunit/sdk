# @promptunit/sdk: no longer maintained

> **This package is no longer maintained. Please don't install it.**
> PromptUnit needs no package: connect by changing your app's AI address (base URL).
> Setup guides: https://www.promptunit.ai/docs

## Connect without a package

**OpenAI SDK (Node.js)**

```ts
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://www.promptunit.ai/api/proxy/openai",
  defaultHeaders: { "x-promptunit-key": process.env.PROMPTUNIT_API_KEY },
})
```

**Anthropic SDK (Node.js)**

```ts
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: "https://www.promptunit.ai/api/proxy/anthropic",
  defaultHeaders: { "x-promptunit-key": process.env.PROMPTUNIT_API_KEY },
})
```

Python, AI coding tools (Claude Code, Cursor and others) and OpenRouter: https://www.promptunit.ai/docs

## How PromptUnit works today

- Savings start with the first request. There is no 14-day observation period.
- Each request is checked: when a cheaper model is just as good for it, PromptUnit uses it; otherwise the request goes to the model you asked for.
- Works with OpenAI, Anthropic, Google, Groq and DeepSeek keys, and with your own OpenRouter key.
- Every request shows on the dashboard: the model asked for, the model that answered, what it cost and what it saved.
- Free until PromptUnit has saved you money, then 20% of what it saves. Nothing if it saves nothing.

Get started: https://www.promptunit.ai
