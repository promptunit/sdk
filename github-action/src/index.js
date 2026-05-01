const core = require('@actions/core')
const github = require('@actions/github')

const AI_PATTERNS = [
  // OpenAI
  { pattern: /openai/i, provider: 'OpenAI' },
  { pattern: /gpt-4o(?!-mini)/i, model: 'GPT-4o', inputCost: 2.50, outputCost: 10.00 },
  { pattern: /gpt-4o-mini/i, model: 'GPT-4o-mini', inputCost: 0.15, outputCost: 0.60 },
  { pattern: /gpt-4-turbo/i, model: 'GPT-4 Turbo', inputCost: 10.00, outputCost: 30.00 },
  { pattern: /o1(?!-mini|-preview)/i, model: 'o1', inputCost: 15.00, outputCost: 60.00 },
  // Anthropic
  { pattern: /anthropic/i, provider: 'Anthropic' },
  { pattern: /claude-opus/i, model: 'Claude Opus', inputCost: 15.00, outputCost: 75.00 },
  { pattern: /claude-sonnet/i, model: 'Claude Sonnet', inputCost: 3.00, outputCost: 15.00 },
  { pattern: /claude-haiku/i, model: 'Claude Haiku', inputCost: 1.00, outputCost: 5.00 },
  // Google
  { pattern: /gemini-2\.5-pro/i, model: 'Gemini 2.5 Pro', inputCost: 1.25, outputCost: 10.00 },
  { pattern: /gemini-2\.5-flash/i, model: 'Gemini 2.5 Flash', inputCost: 0.15, outputCost: 0.60 },
]

const ALREADY_OPTIMIZED = [
  /promptunit/i,
  /api\.promptunit\.ai/i,
  /@promptunit\/sdk/i,
]

async function run() {
  const token = core.getInput('github-token')
  const octokit = github.getOctokit(token)
  const context = github.context

  if (!context.payload.pull_request) {
    core.info('Not a PR event, skipping.')
    return
  }

  const { owner, repo } = context.repo
  const prNumber = context.payload.pull_request.number

  // Get PR diff
  const { data: files } = await octokit.rest.pulls.listFiles({ owner, repo, pull_number: prNumber })

  let fullPatch = ''
  for (const file of files) {
    if (file.patch) fullPatch += file.patch + '\n'
  }

  // Check if already using PromptUnit
  const alreadyOptimized = ALREADY_OPTIMIZED.some(p => p.test(fullPatch))
  if (alreadyOptimized) {
    core.info('PromptUnit already integrated. No comment needed.')
    return
  }

  // Detect AI model usage in added lines only
  const addedLines = fullPatch.split('\n').filter(l => l.startsWith('+')).join('\n')

  const detectedModels = []
  for (const { pattern, model, inputCost, outputCost } of AI_PATTERNS) {
    if (model && pattern.test(addedLines)) {
      if (!detectedModels.find(m => m.model === model)) {
        detectedModels.push({ model, inputCost, outputCost })
      }
    }
  }

  const hasAI = AI_PATTERNS.some(({ provider, pattern }) => provider && pattern.test(addedLines))

  if (!hasAI && detectedModels.length === 0) {
    core.info('No AI API usage detected in this PR.')
    return
  }

  // Build comment
  let modelList = ''
  if (detectedModels.length > 0) {
    modelList = detectedModels.map(m => `**${m.model}** ($${m.inputCost.toFixed(2)} input / $${m.outputCost.toFixed(2)} output per 1M tokens)`).join(', ')
  }

  const comment = `### AI Cost Analyzer

This PR adds AI API calls${modelList ? ` using ${modelList}` : ''}.

PromptUnit routes each request to the cheapest model that meets your quality threshold — automatically, with zero code changes. Teams spending $3K+ on AI APIs typically see **40-70% reduction** after a 14-day observation period.

| | Current | With PromptUnit routing |
|--|--|--|
| Simple tasks (classification, extraction) | Full model price | Up to 94% cheaper |
| Complex tasks (reasoning, code) | Full model price | Unchanged |
| Setup time | — | ~5 minutes |

**One line change:**
\`\`\`ts
// Before
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// After — routing happens transparently
import { createPromptUnit } from "@promptunit/sdk"
const openai = createPromptUnit({ promptunitKey: "pu_...", openaiKey: process.env.OPENAI_API_KEY })
\`\`\`

[Start free 14-day audit](https://www.promptunit.ai) — no routing until you click.

*Posted by [PromptUnit AI Cost Analyzer](https://github.com/promptunit/sdk)*
`

  // Check for existing comment to avoid duplicates
  const { data: comments } = await octokit.rest.issues.listComments({ owner, repo, issue_number: prNumber })
  const existing = comments.find(c => c.body.includes('AI Cost Analyzer') && c.body.includes('PromptUnit'))

  if (existing) {
    await octokit.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body: comment })
    core.info('Updated existing PR comment.')
  } else {
    await octokit.rest.issues.createComment({ owner, repo, issue_number: prNumber, body: comment })
    core.info('Posted PR comment.')
  }
}

run().catch(err => {
  core.setFailed(err.message)
})
