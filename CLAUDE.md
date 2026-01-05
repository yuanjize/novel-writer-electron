# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Build native modules (after npm install)
npm run rebuild:native

# Build platform-specific distributables
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## Project Architecture

This is an Electron-based AI-powered novel writing application with a three-process architecture:

### Process Structure

- **Main Process** ([main/index.ts](main/index.ts)) - Node.js entry point, manages window lifecycle and database initialization
- **Preload** ([preload/index.ts](preload/index.ts)) - Secure bridge using `contextBridge` to expose IPC APIs to renderer
- **Renderer Process** ([src/](src/)) - React UI with TypeScript

### Data Layer

- **Database**: better-sqlite3 with schema in [main/database/init.ts](main/database/init.ts)
- **DAO Pattern**: Singleton DAOs in [main/database/dao.ts](main/database/dao.ts) for Projects, Chapters, and AIInteractions
- **Tables**: `projects`, `chapters` (with foreign key cascade delete), `ai_interactions`
- **Database Location**: `<userData>/novel-writer.db`

### IPC Communication

- **Handlers**: All IPC channels registered in [main/ipc-handlers.ts](main/ipc-handlers.ts)
- **Pattern**: `ipcMain.handle()` in main, `ipcRenderer.invoke()` in preload
- **Response Format**: `{ success: boolean, data?: T, error?: string }`
- **API Groups**:
  - `project:*` - Project CRUD operations
  - `chapter:*` - Chapter CRUD operations
  - `ai:*` - AI features (continueWriting, improveText, suggestPlot) and config management

### AI Service

- **Implementation**: [main/services/ai-service.ts](main/services/ai-service.ts) - Anthropic-compatible HTTP API
- **Config Management**: [main/services/config-service.ts](main/services/config-service.ts)
  - Config file location: `<userData>/ai-config.json`
  - Fallback to environment variables (`.env` file)
  - Required: `ANTHROPIC_API_KEY`
- **Features**:
  - `continueWriting()` - Continues text with 200-500 words
  - `improveText()` - Polishes text while preserving meaning
  - `suggestPlot()` - Provides 3 plot development suggestions
- **Model**: Defaults to `claude-3-5-sonnet-20241022`
- **Customization**: System prompts defined in `buildSystemPrompt()` method

### State Management

- **Store**: Zustand store in [src/store/index.ts](src/store/index.ts)
- **State**: Projects, currentProject, chapters, currentChapter, error
- **IPC Hook**: [src/hooks/useElectronIPC.ts](src/hooks/useElectronIPC.ts) wraps all IPC calls with error handling and Antd messages

### Type Safety

- **Shared Types**: [src/types/index.ts](src/types/index.ts) and duplicate in [main/database/dao.ts](main/database/dao.ts)
- **Window Interface**: `ElectronAPI` type defines preload-exposed methods
- **IPC Response**: `IPCResponse<T>` wrapper for all IPC responses

### Build Configuration

- **electron-vite**: [electron.vite.config.ts](electron.vite.config.ts) handles three-process bundling
- **External**: `better-sqlite3` is external (native module rebuilt via `npm run rebuild:native`)
- **React**: Plugin `@vitejs/plugin-react` with jsx: 'react-jsx'
- **Path Alias**: `@/*` -> `./src/*`

### AI Configuration

See [AI_SETUP.md](AI_SETUP.md) for end-user documentation. Key environment variables (from [.env.example](.env.example)):

- `ANTHROPIC_API_KEY` - Required
- `ANTHROPIC_BASE_URL` - Optional, for custom endpoints/proxies
- `ANTHROPIC_MODEL` - Model name (default: claude-3-5-sonnet-20241022)
- `AI_MAX_RETRIES`, `AI_TIMEOUT`, `AI_DEBUG` - Optional tuning

## Important Implementation Notes

1. **Database Cascade Delete**: Deleting a project automatically deletes its chapters and AI interactions via foreign key constraints

2. **Word Count Auto-Update**: Chapter `word_count` is automatically recalculated when `content` is updated (see [main/database/dao.ts:189-194](main/database/dao.ts#L189-L194))

3. **AI Availability Check**: Always call `aiService.isAvailable()` before AI operations - returns false if API key not configured

4. **Third-Party API Support**: The AI service supports non-Anthropic endpoints via `ANTHROPIC_BASE_URL` and uses `Authorization: Bearer` header for non-anthropic.com domains

5. **Type Duplication**: `Project`, `Chapter`, `AIInteraction` types are duplicated between [src/types/index.ts](src/types/index.ts) and [main/database/dao.ts](main/database/dao.ts) - keep both in sync when modifying

6. **Preload Security**: `contextIsolation: true` and `nodeIntegration: false` are enforced in [main/index.ts:23-24](main/index.ts#L23-L24)
