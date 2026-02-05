import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type {
  EmbeddingModelV2,
  LanguageModelV3,
  TranscriptionModelV2,
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

/**
 * SCX Provider interface.
 *
 * Note: Chat models use LanguageModelV3 (latest stable from @ai-sdk/openai-compatible).
 * Embedding and transcription models use V2 interfaces.
 */
export interface ScxProvider {
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
  embedding(modelId: ScxEmbeddingModelId): EmbeddingModelV2<string>;

  /**
   * Creates an embedding model.
   * @param modelId - The embedding model ID
   */
  textEmbeddingModel(modelId: ScxEmbeddingModelId): EmbeddingModelV2<string>;

  /**
   * Creates a transcription model.
   * @param modelId - The transcription model ID (e.g., 'whisper-large-v3')
   */
  transcription(modelId: ScxTranscriptionModelId): TranscriptionModelV2;

  /**
   * Creates a transcription model.
   * @param modelId - The transcription model ID
   */
  transcriptionModel(modelId: ScxTranscriptionModelId): TranscriptionModelV2;
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
 * Creates an SCX provider instance.
 *
 * Chat models use LanguageModelV3 (via @ai-sdk/openai-compatible).
 * Embedding and transcription models use V2 interfaces.
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

  // Create OpenAI-compatible provider for chat models (V3)
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

  const createEmbeddingModel = (
    modelId: ScxEmbeddingModelId
  ): EmbeddingModelV2<string> => {
    return new ScxEmbeddingModel(modelId, {
      provider: 'scx.embedding',
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
    });
  };

  const createTranscriptionModel = (
    modelId: ScxTranscriptionModelId
  ): TranscriptionModelV2 => {
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

  provider.languageModel = createChatModel;
  provider.chat = createChatModel;
  provider.embedding = createEmbeddingModel;
  provider.textEmbeddingModel = createEmbeddingModel;
  provider.transcription = createTranscriptionModel;
  provider.transcriptionModel = createTranscriptionModel;

  return provider;
}

/**
 * Default SCX provider instance.
 * Uses the SCX_API_KEY environment variable for authentication.
 */
export const scx = createScx();
