import type {
  EmbeddingModelV2,
  EmbeddingModelV2Embedding,
} from '@ai-sdk/provider';
import type { FetchFunction } from '@ai-sdk/provider-utils';
import type { ScxEmbeddingModelId } from './scx-embedding-options.js';

export interface ScxEmbeddingModelConfig {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string>;
  fetch?: FetchFunction;
}

interface EmbeddingApiResponse {
  data?: Array<{ embedding: number[] }>;
  usage?: {
    total_tokens?: number;
    prompt_tokens?: number;
  };
}

export class ScxEmbeddingModel implements EmbeddingModelV2<string> {
  readonly specificationVersion = 'v2';
  readonly modelId: ScxEmbeddingModelId;
  readonly provider: string;
  readonly maxEmbeddingsPerCall = 2048;
  readonly supportsParallelCalls = true;

  private readonly config: ScxEmbeddingModelConfig;

  constructor(modelId: ScxEmbeddingModelId, config: ScxEmbeddingModelConfig) {
    this.modelId = modelId;
    this.provider = config.provider;
    this.config = config;
  }

  async doEmbed(options: {
    values: string[];
    abortSignal?: AbortSignal;
    headers?: Record<string, string | undefined>;
  }): Promise<{
    embeddings: EmbeddingModelV2Embedding[];
    usage?: { tokens: number };
    rawResponse?: { headers?: Record<string, string> };
  }> {
    const { values, abortSignal, headers: additionalHeaders } = options;

    const requestBody = {
      model: this.modelId,
      input: values,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers(),
    };

    if (additionalHeaders) {
      for (const [key, value] of Object.entries(additionalHeaders)) {
        if (value !== undefined) {
          headers[key] = value;
        }
      }
    }

    const fetchFn = this.config.fetch ?? fetch;

    const response = await fetchFn(`${this.config.baseURL}/embeddings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: abortSignal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `SCX embedding request failed: ${response.status} ${errorText}`
      );
    }

    const responseBody = (await response.json()) as
      | EmbeddingApiResponse
      | Array<{ embedding: number[] }>;

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Handle both response formats
    const embeddings = Array.isArray(responseBody)
      ? responseBody.map((d) => d.embedding)
      : (responseBody.data?.map((d) => d.embedding) ?? []);

    const usage =
      !Array.isArray(responseBody) && responseBody.usage
        ? {
            tokens:
              responseBody.usage.total_tokens ??
              responseBody.usage.prompt_tokens ??
              0,
          }
        : undefined;

    return {
      embeddings,
      usage,
      rawResponse: {
        headers: responseHeaders,
      },
    };
  }
}
