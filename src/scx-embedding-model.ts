import type {
  EmbeddingModelV3,
  EmbeddingModelV3CallOptions,
  EmbeddingModelV3Embedding,
  EmbeddingModelV3Result,
  SharedV3Warning,
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

export class ScxEmbeddingModel implements EmbeddingModelV3 {
  readonly specificationVersion = 'v3';
  readonly modelId: ScxEmbeddingModelId;
  readonly provider: string;
  readonly maxEmbeddingsPerCall: number = 2048;
  readonly supportsParallelCalls: boolean = true;

  private readonly config: ScxEmbeddingModelConfig;

  constructor(modelId: ScxEmbeddingModelId, config: ScxEmbeddingModelConfig) {
    this.modelId = modelId;
    this.provider = config.provider;
    this.config = config;
  }

  async doEmbed(options: EmbeddingModelV3CallOptions): Promise<EmbeddingModelV3Result> {
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
    const embeddings: EmbeddingModelV3Embedding[] = Array.isArray(responseBody)
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

    const warnings: SharedV3Warning[] = [];

    return {
      embeddings,
      usage,
      warnings,
      response: {
        headers: responseHeaders,
        body: responseBody,
      },
    };
  }
}
