# Project Structure

## Current Organization
```
.
├── .kiro/
│   └── steering/          # AI assistant steering rules
│       ├── product.md     # Product overview and philosophy
│       ├── tech.md        # Technology stack and commands
│       └── structure.md   # This file - project organization
└── .vscode/
    └── settings.json      # VSCode workspace configuration
```

## Folder Conventions
- **`.kiro/steering/`** - Contains markdown files that guide AI assistant behavior
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
├── .kiro/                 # Kiro AI configuration
├── .vscode/               # VSCode settings
└── README.md              # Project documentation
```

## File Naming Conventions
- Use lowercase with hyphens for directories: `my-component/`
- Use descriptive names that clearly indicate purpose
- Keep steering documents focused and single-purpose
- Update this structure guide as the project evolves

## Best Practices
- Maintain clean separation between configuration, source, and documentation
- Keep the root directory uncluttered
- Use consistent naming patterns across the project
- Document any deviations from standard conventions