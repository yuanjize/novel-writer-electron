# Novel Writer Electron Project Context

## Project Overview
This is a local novel writing application built with Electron, React, Ant Design, and SQLite. It features project and chapter management, auto-saving, and optional AI-powered writing assistance (using Anthropic Claude).

## Tech Stack
- **Runtime:** Electron (Main process in Node.js, Renderer in Chromium)
- **Frontend:** React, TypeScript, Ant Design, Zustand (State Management), React Router
- **Backend (Local):** Node.js (Main Process), `better-sqlite3` (Database)
- **Build Tools:** `electron-vite`, `electron-builder`
- **AI Integration:** Custom AI Service (Anthropic API compatible)

## Key Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start the development server (Renderer + Main). **Note:** Clears `ELECTRON_RUN_AS_NODE` automatically. |
| `npm run build` | Build the application for production (outputs to `out/`). |
| `npm run rebuild:native` | Rebuild native modules (like `better-sqlite3`). Run this after `npm install`. |
| `npm run build:win` | Build Windows installer/portable (requires `npm run build` first). |
| `npm run preview` | Preview the production build. |

## Architecture

### Process Structure
The application follows standard Electron architecture:
1.  **Main Process** (`main/`):
    -   Entry: `main/index.ts`
    -   Handles window lifecycle, native menus, and system events.
    -   Manages the SQLite database and AI service.
    -   Exposes functionality via IPC handlers (`main/ipc-handlers.ts`).
2.  **Preload Script** (`preload/`):
    -   Entry: `preload/index.ts`
    -   Securely exposes specific APIs to the renderer using `contextBridge`.
3.  **Renderer Process** (`src/`):
    -   Entry: `src/main.tsx`
    -   React application for the UI.
    -   Communicates with Main process via `window.electronAPI`.

### Data Layer
-   **Database:** SQLite (`novel-writer.db` in user data directory).
-   **Access:** `main/database/dao.ts` provides a DAO pattern for `projects`, `chapters`, and `ai_interactions`.
-   **Schema:** Defined in `main/database/init.ts`.
-   **Constraints:** Foreign keys ensure cascading deletes (e.g., deleting a project deletes its chapters).

### AI Service
-   **Logic:** `main/services/ai-service.ts`.
-   **Configuration:** `main/services/config-service.ts` reads from `ai-config.json` (user data) or `.env` (dev).
-   **Features:** Continue writing, text improvement, plot suggestions.
-   **Integration:** Frontend calls these via IPC `ai:*` channels.

## Project Structure

```text
novel-writer-electron/
├── .env                # Environment variables (API Keys)
├── electron.vite.config.ts # Vite configuration for all processes
├── main/               # Main Process Code
│   ├── index.ts        # Entry point
│   ├── ipc-handlers.ts # IPC logic
│   ├── database/       # DB init and DAO
│   └── services/       # AI and Config services
├── preload/            # Preload scripts
├── src/                # Renderer Process (React App)
│   ├── App.tsx         # Main Component
│   ├── pages/          # Route components (ProjectList, ChapterEditor, etc.)
│   ├── store/          # Zustand store
│   ├── hooks/          # Custom hooks (e.g., useElectronIPC)
│   └── types/          # Shared TypeScript types
└── out/                # Build output
```

## Development Guidelines

1.  **IPC Communication:**
    -   Define handlers in `main/ipc-handlers.ts` using `ipcMain.handle`.
    -   Expose in `preload/index.ts`.
    -   Consume in React using `window.electronAPI` or the `useElectronIPC` hook.
    -   **Pattern:** Request/Response format is `{ success: boolean, data?: T, error?: string }`.

2.  **Database Changes:**
    -   If modifying the schema, update `main/database/init.ts`.
    -   Ensure `dao.ts` types match `src/types/index.ts`.

3.  **Environment Variables:**
    -   Use `.env` for local development (e.g., `ANTHROPIC_API_KEY`).
    -   In production, the app looks for `ai-config.json` in the user's data folder.

4.  **Common Issues:**
    -   **White Screen in Dev:** Often caused by `ELECTRON_RUN_AS_NODE` env var. `npm run dev` handles this, but be aware.
    -   **Native Module Mismatch:** If `better-sqlite3` errors occur, run `npm run rebuild:native`.

5.  **Type Safety:**
    -   Maintain parity between backend types (in `dao.ts`) and frontend types (`src/types/index.ts`).
