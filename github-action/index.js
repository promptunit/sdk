'use strict'
const https = require('https')

const AI_MODELS = [
  { pattern: /gpt-4o-mini/i, model: 'GPT-4o-mini', tier: 'cheap' },
  { pattern: /gpt-4o/i, model: 'GPT-4o', tier: 'expensive' },
  { pattern: /gpt-4-turbo/i, model: 'GPT-4 Turbo', tier: 'expensive' },
  { pattern: /o[13]-(?:mini|preview)?/i, model: 'o-series', tier: 'expensive' },
  { pattern: /claude-opus/i, model: 'Claude Opus', tier: 'expensive' },
  { pattern: /claude-sonnet/i, model: 'Claude Sonnet', tier: 'mid' },
  { pattern: /claude-haiku/i, model: 'Claude Haiku', tier: 'cheap' },
  { pattern: /gemini-2\.5-pro/i, model: 'Gemini 2.5 Pro', tier: 'expensive' },
  { pattern: /gemini-2\.5-flash/i, model: 'Gemini 2.5 Flash', tier: 'cheap' },
]

const ALREADY_OPTIMIZED = [/promptunit/i, /api\.promptunit\.ai/i, /@promptunit\/sdk/i]

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

async function run() {
  const token = process.env.INPUT_GITHUB_TOKEN || process.env.GITHUB_TOKEN
  const eventPath = process.env.GITHUB_EVENT_PATH
  const repo = process.env.GITHUB_REPOSITORY

  if (!eventPath || !repo) { console.log('Not a GitHub Actions environment.'); return }

  const event = JSON.parse(require('fs').readFileSync(eventPath, 'utf8'))
  const pr = event.pull_request
  if (!pr) { console.log('Not a PR event, skipping.'); return }

  const prNumber = pr.number
  const [owner, repoName] = repo.split('/')

  // Get PR files
  const filesRes = await ghReq(`/repos/${owner}/${repoName}/pulls/${prNumber}/files`, 'GET', null, token)
  if (filesRes.status !== 200) { console.log('Could not fetch PR files:', filesRes.status); return }

  const patch = filesRes.body.map(f => f.patch || '').join('\n')
  const addedLines = patch.split('\n').filter(l => l.startsWith('+')).join('\n')

  // Skip if PromptUnit already in use
  if (ALREADY_OPTIMIZED.some(p => p.test(addedLines))) {
    console.log('PromptUnit already integrated. Skipping.')
    return
  }

  // Detect expensive AI model usage in added lines
  const detected = []
  for (const m of AI_MODELS) {
    if (m.tier === 'expensive' && m.pattern.test(addedLines)) {
      if (!detected.find(d => d.model === m.model)) detected.push(m)
    }
  }

  // Only post if expensive models detected
  if (detected.length === 0) { console.log('No expensive AI model usage detected. Skipping.'); return }

  const modelNames = detected.map(m => `**${m.model}`).join(', ')

  const body = `### AI Cost Analyzer

This PR uses ${modelNames}**. Based on typical production traffic, 60-70% of these calls could be handled by cheaper models with no quality impact.

| | Without routing | With PromptUnit |
|--|--|--|
| Simple tasks (classification, extraction, summarization) | Full model price | Up to 94% cheaper |
| Complex tasks (reasoning, code gen) | Full model price | Unchanged |
| Setup time | | ~5 minutes |

PromptUnit runs in **shadow mode for 14 days** — logs your traffic, classifies each request, and shows you the exact savings before routing anything. No risk. No routing until you click.

**One line change:**
\`\`\`ts
// Before
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// After
import { createPromptUnit } from "@promptunit/sdk"
const openai = createPromptUnit({
  promptunitKey: process.env.PROMPTUNIT_API_KEY,
  openaiKey: process.env.OPENAI_API_KEY
})
\`\`\`

[Start free 14-day audit](https://www.promptunit.ai)

---
*Posted by [PromptUnit AI Cost Analyzer](https://github.com/promptunit/sdk) — remove this action from your workflow to stop these comments.*
`

  // Check for existing comment to avoid duplicates
  const commentsRes = await ghReq(`/repos/${owner}/${repoName}/issues/${prNumber}/comments`, 'GET', null, token)
  const existing = Array.isArray(commentsRes.body)
    ? commentsRes.body.find(c => c.body.includes('AI Cost Analyzer') && c.body.includes('PromptUnit'))
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
