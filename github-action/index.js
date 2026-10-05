'use strict'
const https = require('https')

// Expensive models worth a second look. Cheaper variants (mini, nano, flash, haiku) are never flagged.
const EXPENSIVE_MODELS = [
  { pattern: /\bgpt-5(?:\.\d+)?(?![\d.])(?!-(?:mini|nano))/i, model: 'GPT-5' },
  { pattern: /\bgpt-4o(?!-mini)/i, model: 'GPT-4o' },
  { pattern: /\bgpt-4-turbo/i, model: 'GPT-4 Turbo' },
  { pattern: /["'`]o[13](?:-pro|-preview)?["'`]/i, model: 'OpenAI o-series' },
  { pattern: /claude-(?:3-)?opus/i, model: 'Claude Opus' },
  { pattern: /gemini-[\d.]+-pro/i, model: 'Gemini Pro' },
]

// Already connected: any PromptUnit address or name in the added lines.
const ALREADY_CONNECTED = /promptunit/i

function ghReq(path, method, body, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path,
      method: method || 'GET',
      headers: {
        Authorization: 'token ' + token,
        'User-Agent': 'promptunit-ai-cost-analyzer',
        Accept: 'application/vnd.github.v3+json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
    }
    const r = https.request(opts, res => {
      let d = ''
      res.on('data', c => (d += c))
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }) }
        catch { resolve({ status: res.statusCode, body: d }) }
      })
    })
    r.on('error', reject)
    if (body) r.write(JSON.stringify(body))
    r.end()
  })
}

function commentFor(detected) {
  const modelNames = detected.map(m => `**${m.model}**`).join(', ')
  return `### AI Cost Analyzer

This PR uses ${modelNames}. Calls like classification, extraction and summarization often don't need the most expensive model.

| | Without routing | With PromptUnit |
|--|--|--|
| Simple tasks (classification, extraction, summarization) | Full model price | Up to 94% cheaper |
| Complex tasks (reasoning, code generation) | Full model price | Unchanged |
| Setup | | Change one line, the base URL |

PromptUnit checks each request: when a cheaper model is just as good for it, PromptUnit uses that model; otherwise the request goes to the model you chose. Savings start with the first request, and every request shows its cost and saving on the dashboard. Free until it has saved you money, then 20% of what it saves.

**The one-line change, the base URL:**
\`\`\`ts
// Before
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// After
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://www.promptunit.ai/api/proxy/openai",
  defaultHeaders: { "x-promptunit-key": process.env.PROMPTUNIT_API_KEY },
})
\`\`\`

Using Anthropic, Google, Groq, DeepSeek or OpenRouter? Same idea: https://www.promptunit.ai/docs

[Start free](https://www.promptunit.ai)

---
*Posted by [PromptUnit AI Cost Analyzer](https://github.com/promptunit/sdk). Remove this action from your workflow to stop these comments.*
`
}

async function run() {
  const token = process.env.INPUT_GITHUB_TOKEN || process.env['INPUT_GITHUB-TOKEN'] || process.env.GITHUB_TOKEN
  const eventPath = process.env.GITHUB_EVENT_PATH
  const repo = process.env.GITHUB_REPOSITORY

  if (!eventPath || !repo) { console.log('Not a GitHub Actions environment.'); return }

  const event = JSON.parse(require('fs').readFileSync(eventPath, 'utf8'))
  const pr = event.pull_request
  if (!pr) { console.log('Not a PR event, skipping.'); return }

  const prNumber = pr.number
  const [owner, repoName] = repo.split('/')

  // Get PR files
  const filesRes = await ghReq(`/repos/${owner}/${repoName}/pulls/${prNumber}/files?per_page=100`, 'GET', null, token)
  if (filesRes.status !== 200) { console.log('Could not fetch PR files:', filesRes.status); return }

  const patch = filesRes.body.map(f => f.patch || '').join('\n')
  const addedLines = patch.split('\n').filter(l => l.startsWith('+')).join('\n')

  if (ALREADY_CONNECTED.test(addedLines)) {
    console.log('PromptUnit already connected. Skipping.')
    return
  }

  const detected = EXPENSIVE_MODELS.filter(m => m.pattern.test(addedLines))
  if (detected.length === 0) { console.log('No expensive AI model usage detected. Skipping.'); return }

  const body = commentFor(detected)

  // Update our earlier comment instead of posting a second one
  const commentsRes = await ghReq(`/repos/${owner}/${repoName}/issues/${prNumber}/comments?per_page=100`, 'GET', null, token)
  const existing = Array.isArray(commentsRes.body)
    ? commentsRes.body.find(c => c.body && c.body.includes('AI Cost Analyzer') && c.body.includes('PromptUnit'))
    : null

  if (existing) {
    await ghReq(`/repos/${owner}/${repoName}/issues/comments/${existing.id}`, 'PATCH', { body }, token)
    console.log('Updated existing comment.')
  } else {
    await ghReq(`/repos/${owner}/${repoName}/issues/${prNumber}/comments`, 'POST', { body }, token)
    console.log('Posted comment on PR #' + prNumber)
  }
}

run().catch(err => {
  console.error('Action failed:', err.message)
  process.exit(1)
})
