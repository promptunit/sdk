import OpenAI from "openai";

export interface PromptUnitConfig {
  promptunitKey: string;
  openaiKey: string;
  /** Override the PromptUnit proxy base URL. Defaults to https://api.promptunit.ai */
  baseUrl?: string;
  /** Timeout in ms before falling back to direct OpenAI. Defaults to 8000 */
  timeout?: number;
}

export interface PromptUnitClient {
  chat: {
    completions: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: (...args: any[]) => any;
    };
  };
  /** Access the underlying OpenAI client directly (bypasses PromptUnit) */
  openai: OpenAI;
}

const DEFAULT_BASE_URL = "https://api.promptunit.ai";
const DEFAULT_TIMEOUT_MS = 8000;

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    if ("code" in err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ECONNREFUSED" || code === "ECONNRESET" || code === "ETIMEDOUT") return true;
    }
    if (err.message.includes("timeout") || err.message.includes("network")) return true;
  }
  if (err instanceof OpenAI.APIError) {
    return err.status >= 500 && err.status <= 599;
  }
  return false;
}

/**
 * Creates a PromptUnit-wrapped OpenAI client.
 *
 * All requests route through the PromptUnit proxy for smart model routing,
 * prompt compression, and cost optimization. If the proxy returns a 5xx or
 * times out, the call is automatically retried directly against OpenAI — your
 * app never sees the error.
 *
 * @example
 * ```ts
 * import { createPromptUnit } from "@promptunit/sdk";
 *
 * const client = createPromptUnit({
 *   promptunitKey: process.env.PROMPTUNIT_API_KEY!,
 *   openaiKey: process.env.OPENAI_API_KEY!,
 * });
 *
 * const response = await client.chat.completions.create({
 *   model: "gpt-4o",
 *   messages: [{ role: "user", content: "Hello!" }],
 * });
 * ```
 */
export function createPromptUnit(config: PromptUnitConfig): PromptUnitClient {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const timeoutMs = config.timeout ?? DEFAULT_TIMEOUT_MS;

  const proxyClient = new OpenAI({
    apiKey: config.openaiKey,
    baseURL: `${baseUrl}/api/proxy/openai`,
    defaultHeaders: {
      "x-promptunit-key": config.promptunitKey,
    },
    timeout: timeoutMs,
  });

  const fallbackClient = new OpenAI({
    apiKey: config.openaiKey,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function createWithFallback(...args: any[]): Promise<any> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (proxyClient.chat.completions as any).create(...args);
    } catch (err) {
      if (isRetryableError(err)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (fallbackClient.chat.completions as any).create(...args);
      }
      throw err;
    }
  }

  return {
    chat: {
      completions: {
        create: createWithFallback,
      },
    },
    openai: fallbackClient,
  };
}

export default createPromptUnit;
