# @promptunit/sdk: no longer maintained

> **This package is no longer maintained. Please don't install it.**
> PromptUnit needs no package: you paste your personal PromptUnit address as your app's AI address (base URL).
> Your AI provider key stays in your app. PromptUnit never asks for it and does not store or log it.
> Setup guides: https://www.promptunit.ai/docs/connect

## Connect without a package

**OpenAI SDK (Node.js)**

```ts
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // unchanged: your own key
  baseURL: "https://www.promptunit.ai/api/proxy/openai/<your PromptUnit key>/v1", // your personal address
})
```

**Anthropic SDK (Node.js)**

```ts
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // unchanged: your own key
  baseURL: "https://www.promptunit.ai/api/proxy/anthropic/<your PromptUnit key>", // your personal address
})
```

If your app reads its address from an environment variable, no code changes at all: set OPENAI_BASE_URL or ANTHROPIC_BASE_URL to your personal address where the app runs, and redeploy.

You get your personal address after sign-up. Guides for Vercel, Netlify, Replit, Lovable, n8n, Claude Code, Cursor and others: https://www.promptunit.ai/docs/connect

## How PromptUnit works today

- You do not hand over your API key. Your app keeps its own provider key and sends it with each request, as it does today. PromptUnit passes it on to the provider with that request and does not store or log it. Saving a key in your account is optional, and only needed to let requests move to another provider's cheaper model.
- No header and no second setting. The `x-promptunit-key` header is the older setup; it still works for existing accounts.
- Savings start with the first request. There is no 14-day observation period.
- Each request is checked: when a cheaper model is just as good for it, PromptUnit uses it; otherwise the request goes to the model you asked for.
- Works with OpenAI, Anthropic, Google, Groq and DeepSeek keys, and with your own OpenRouter key.
- Every request shows on the dashboard: the model asked for, the model that answered, what it cost and what it saved.
- Free until PromptUnit has saved you money, then 20% of what it saves. Nothing if it saves nothing.

Get started: https://www.promptunit.ai
