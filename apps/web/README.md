# @finnbiz/web

## Editor Setup for Tailwind CSS and TypeScript

### Recommended VS Code Extensions
- **Tailwind CSS IntelliSense**: Provides syntax highlighting, autocompletion, and linting for Tailwind CSS. Install from the VS Code Marketplace.
- **ESLint**: For TypeScript and JavaScript linting.

### Workspace Settings
This project includes a `.vscode/settings.json` file that disables built-in CSS validation to prevent false warnings for Tailwind at-rules (`@tailwind`, `@apply`).

If you still see unknown at-rule warnings:
1. Make sure you open the `apps/web` folder in VS Code.
2. Reload the VS Code window after pulling new settings.
3. Install the Tailwind CSS IntelliSense extension.

### TypeScript Usage
- The workspace uses its own TypeScript version and type definitions (`@types/react`).
- If you see type errors in JSX, ensure VS Code is using the workspace TypeScript (click the TypeScript version in the status bar and select "Use Workspace Version").

### Quick Start
```bash
pnpm install --filter @finnbiz/web
pnpm run dev --filter @finnbiz/web
```

### Troubleshooting
- If you see editor warnings for Tailwind at-rules, check your extensions and workspace settings as above.
- For type errors, confirm you are using the workspace TypeScript and have reloaded VS Code.

---
For more help, see the main monorepo README or ask in the project chat.
