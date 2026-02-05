# scx-ai-provider

SCX AI provider for the [Vercel AI SDK](https://sdk.vercel.ai/).

## Installation

```bash
npm install scx-ai-provider
# or
bun add scx-ai-provider
# or
pnpm add scx-ai-provider
```

## Usage

### Chat Models

```typescript
import { generateText } from 'ai';
import { scx } from 'scx-ai-provider';

const result = await generateText({
  model: scx('DeepSeek-V3.1'),
  prompt: 'What is the meaning of life?',
});

console.log(result.text);
```

### With Custom Configuration

```typescript
import { createScx } from 'scx-ai-provider';

const scx = createScx({
  apiKey: 'your-api-key', // defaults to SCX_API_KEY env var
  baseURL: 'https://api.scx.ai/v1', // optional
});
```

### Embedding Models

```typescript
import { embed } from 'ai';
import { scx } from 'scx-ai-provider';

const result = await embed({
  model: scx.embedding('E5-Mistral-7B-Instruct'),
  value: 'Hello, world!',
});

console.log(result.embedding);
```

### Transcription Models

```typescript
import { transcribe } from 'ai';
import { scx } from 'scx-ai-provider';

const result = await transcribe({
  model: scx.transcription('whisper-large-v3'),
  audio: audioBuffer,
});

console.log(result.text);
```

## Available Models

### Chat Models

- `Qwen3-32b`
- `Qwen3-235b`
- `DeepSeek-V3`
- `DeepSeek-V3-0324`
- `DeepSeek-V3.1`
- `DeepSeek-V3.1-Terminus`
- `Llama-4-Maverick-17B-128E-Instruct`
- `Llama-3.3-Swallow-70B-Instruct-v0.4`
- `DeepSeek-R1-0528`
- `gpt-oss-120b`
- `magpie-small`

### Embedding Models

- `E5-Mistral-7B-Instruct`

### Transcription Models

- `whisper-large-v3`

## Environment Variables

- `SCX_API_KEY` - Your SCX API key (required if not passed to `createScx`)

## License

Apache-2.0
