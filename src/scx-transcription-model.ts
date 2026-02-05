import type {
  JSONObject,
  SharedV3Warning,
  TranscriptionModelV3,
  TranscriptionModelV3CallOptions,
} from '@ai-sdk/provider';
import type { FetchFunction } from '@ai-sdk/provider-utils';
import type { ScxTranscriptionModelId } from './scx-transcription-options.js';

export interface ScxTranscriptionModelConfig {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string>;
  fetch?: FetchFunction;
}

interface TranscriptionApiResponse {
  text?: string;
  segments?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
  language?: string;
  duration?: number;
}

export class ScxTranscriptionModel implements TranscriptionModelV3 {
  readonly specificationVersion = 'v3';
  readonly modelId: ScxTranscriptionModelId;
  readonly provider: string;

  private readonly config: ScxTranscriptionModelConfig;

  constructor(
    modelId: ScxTranscriptionModelId,
    config: ScxTranscriptionModelConfig
  ) {
    this.modelId = modelId;
    this.provider = config.provider;
    this.config = config;
  }

  async doGenerate(
    options: TranscriptionModelV3CallOptions
  ): Promise<{
    text: string;
    segments: Array<{
      text: string;
      startSecond: number;
      endSecond: number;
    }>;
    language: string | undefined;
    durationInSeconds: number | undefined;
    warnings: SharedV3Warning[];
    providerMetadata?: Record<string, JSONObject>;
    request?: { body?: string };
    response: {
      timestamp: Date;
      modelId: string;
      headers: Record<string, string> | undefined;
      body?: unknown;
    };
  }> {
    const {
      audio,
      mediaType,
      abortSignal,
      headers: additionalHeaders,
      providerOptions,
    } = options;

    // Convert Uint8Array to base64 string if needed
    const audioData =
      audio instanceof Uint8Array
        ? Buffer.from(audio).toString('base64')
        : audio;

    const requestBody: Record<string, unknown> = {
      model: this.modelId,
      audio: audioData,
      media_type: mediaType,
    };

    // Merge provider-specific options
    const scxOptions = providerOptions?.scx;
    if (scxOptions) {
      Object.assign(requestBody, scxOptions);
    }

    const bodyString = JSON.stringify(requestBody);

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

    const response = await fetchFn(`${this.config.baseURL}/transcriptions`, {
      method: 'POST',
      headers,
      body: bodyString,
      signal: abortSignal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `SCX transcription request failed: ${response.status} ${errorText}`
      );
    }

    const responseBody = (await response.json()) as TranscriptionApiResponse;

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const segments =
      responseBody.segments?.map((seg) => ({
        text: seg.text,
        startSecond: seg.start,
        endSecond: seg.end,
      })) ?? [];

    const warnings: SharedV3Warning[] = [];

    return {
      text: responseBody.text ?? '',
      segments,
      language: responseBody.language,
      durationInSeconds: responseBody.duration,
      warnings,
      request: {
        body: bodyString,
      },
      response: {
        timestamp: new Date(),
        modelId: this.modelId,
        headers: responseHeaders,
        body: responseBody,
      },
    };
  }
}
