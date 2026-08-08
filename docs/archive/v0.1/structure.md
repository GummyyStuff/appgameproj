---
title: "Kiro AI Structure"
audience: developer
layer: ai
status: stable
tags: [ai, kiro, structure, architecture]
last_updated: "2026-08-07"
---

# Project Structure

## Current Organization
```
.
├── docs/
│   └── ai/                # Unified AI configuration and steering rules
│       ├── kiro/          # Kiro AI steering documents
│       └── cursor/        # Cursor AI configuration files
└── .vscode/
    └── settings.json      # VSCode workspace configuration
```

## Folder Conventions
- **`docs/ai/kiro/`** - Contains markdown files that guide AI assistant behavior
- **`docs/ai/cursor/`** - Contains configuration files for Cursor AI tool
- **`.vscode/`** - VSCode-specific settings and configurations

## Recommended Structure (for future development)
When adding code and assets, consider this organization:

```
.
├── src/                   # Source code
├── tests/                 # Test files
├── docs/                  # Documentation
├── config/                # Configuration files
├── scripts/               # Build and utility scripts
├── assets/                # Static assets
├── docs/ai/               # Unified AI configuration
```