import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type {
  EmbeddingModelV3,
  LanguageModelV3,
  ProviderV3,
  TranscriptionModelV3,
} from '@ai-sdk/provider';
import {
  loadApiKey,
  withoutTrailingSlash,
} from '@ai-sdk/provider-utils';
import type { FetchFunction } from '@ai-sdk/provider-utils';
import type { ScxChatModelId } from './scx-chat-options.js';
import type { ScxEmbeddingModelId } from './scx-embedding-options.js';
import type { ScxTranscriptionModelId } from './scx-transcription-options.js';
import { ScxEmbeddingModel } from './scx-embedding-model.js';
import { ScxTranscriptionModel } from './scx-transcription-model.js';

export interface ScxProvider extends ProviderV3 {
  /**
   * Creates a language model for chat completions.
   * @param modelId - The model ID to use (e.g., 'DeepSeek-V3.1', 'Llama-4-Maverick-17B-128E-Instruct')
   */
  (modelId: ScxChatModelId): LanguageModelV3;

  /**
   * Creates a language model for chat completions.
   * @param modelId - The model ID to use
   */
  languageModel(modelId: ScxChatModelId): LanguageModelV3;

  /**
   * Creates a language model for chat completions.
   * @param modelId - The model ID to use
   */
  chat(modelId: ScxChatModelId): LanguageModelV3;

  /**
   * Creates an embedding model.
   * @param modelId - The embedding model ID (e.g., 'E5-Mistral-7B-Instruct')
   */
  embeddingModel(modelId: ScxEmbeddingModelId): EmbeddingModelV3;

  /**
   * Creates an embedding model.
   * @param modelId - The embedding model ID
   * @deprecated Use `embeddingModel` instead.
   */
  textEmbeddingModel(modelId: ScxEmbeddingModelId): EmbeddingModelV3;

  /**
   * Creates a transcription model.
   * @param modelId - The transcription model ID (e.g., 'whisper-large-v3')
   */
  transcriptionModel(modelId: ScxTranscriptionModelId): TranscriptionModelV3;
}

export interface ScxProviderSettings {
  /**
   * Base URL for the SCX API.
   * @default 'https://api.scx.ai/v1'
   */
  baseURL?: string;

  /**
   * API key for SCX. Falls back to SCX_API_KEY environment variable.
   */
  apiKey?: string;

  /**
   * Custom headers to include in requests.
   */
  headers?: Record<string, string>;

  /**
   * Custom fetch implementation.
   */
  fetch?: FetchFunction;
}

/**
 * Creates an SCX provider instance (ProviderV3).
 *
 * @example
 * ```ts
 * import { createScx } from 'scx-ai-provider';
 *
 * const scx = createScx({
 *   apiKey: 'your-api-key', // optional, defaults to SCX_API_KEY env var
 * });
 *
 * // Use with AI SDK
 * const result = await generateText({
 *   model: scx('DeepSeek-V3.1'),
 *   prompt: 'Hello!',
 * });
 * ```
 */
export function createScx(options: ScxProviderSettings = {}): ScxProvider {
  const baseURL =
    withoutTrailingSlash(options.baseURL) ?? 'https://api.scx.ai/v1';

  const getApiKey = () =>
    loadApiKey({
      apiKey: options.apiKey,
      environmentVariableName: 'SCX_API_KEY',
      description: 'SCX',
    });

  const getHeaders = (): Record<string, string> => ({
    Authorization: `Bearer ${getApiKey()}`,
    ...options.headers,
  });

  // Create OpenAI-compatible provider for chat models
  const openaiCompatible = createOpenAICompatible({
    name: 'scx',
    baseURL,
    apiKey: getApiKey(),
    headers: options.headers,
    fetch: options.fetch,
  });

  const createChatModel = (modelId: ScxChatModelId): LanguageModelV3 => {
    return openaiCompatible.chatModel(modelId);
  };

  const createEmbeddingModel = (modelId: ScxEmbeddingModelId): EmbeddingModelV3 => {
    return new ScxEmbeddingModel(modelId, {
      provider: 'scx.embedding',
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
    });
  };

  const createTranscriptionModel = (
    modelId: ScxTranscriptionModelId
  ): TranscriptionModelV3 => {
    return new ScxTranscriptionModel(modelId, {
      provider: 'scx.transcription',
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
    });
  };

  const provider = function (modelId: ScxChatModelId): LanguageModelV3 {
    if (new.target) {
      throw new Error(
        'The SCX model function cannot be called with the new keyword.'
      );
    }
    return createChatModel(modelId);
  } as ScxProvider;

  Object.defineProperty(provider, 'specificationVersion', {
    value: 'v3',
    writable: false,
    enumerable: true,
  });
  provider.languageModel = createChatModel;
  provider.chat = createChatModel;
  provider.embeddingModel = createEmbeddingModel;
  provider.textEmbeddingModel = createEmbeddingModel;
  provider.transcriptionModel = createTranscriptionModel;
  provider.imageModel = () => {
    throw new Error('Image model not supported');
  };

  return provider;
}

/**
 * Default SCX provider instance.
 * Uses the SCX_API_KEY environment variable for authentication.
 */
export const scx = createScx();
