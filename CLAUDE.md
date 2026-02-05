# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

SCX AI provider for the Vercel AI SDK. Provides chat, embedding, and transcription models for the SCX API.

## Commands

```bash
bun install          # Install dependencies
bun run build        # Build the package
bun run typecheck    # Type check
```

## Branch Structure

- `main` - Latest stable (ProviderV3)
- `v1` - Legacy ProviderV1 interface
- `v2` - Transitional V2/V3 interface
- `v3` - Full ProviderV3 interface

## Commit Guidelines

- Use conventional commits (feat:, fix:, chore:, ci:, docs:, etc.)
- **NEVER include Co-Authored-By lines in commits**
- **NEVER add Claude as an author or co-author**
- Keep commit messages concise and descriptive

## Releasing

Releases are automated via semantic-release on push to main, v1, v2, or v3 branches.
