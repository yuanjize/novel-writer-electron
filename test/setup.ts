import { vi } from 'vitest'
import '@testing-library/jest-dom'

if (typeof window !== 'undefined') {
  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock Electron API
  window.electronAPI = {
    project: {
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getChapters: vi.fn()
    },
    chapter: {
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      getVersions: vi.fn(),
      restoreVersion: vi.fn(),
      delete: vi.fn(),
      createSnapshot: vi.fn(),
      updateVersion: vi.fn()
    },
    character: {
      getAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    outline: {
      getAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      reorder: vi.fn()
    },
    worldSetting: {
      getAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    ai: {
      getHistory: vi.fn(),
      logInteraction: vi.fn(),
      continueWriting: vi.fn(),
      improveText: vi.fn(),
      suggestPlot: vi.fn(),
      guidedProjectCreation: vi.fn(),
      generateCharacter: vi.fn(),
      generateOutline: vi.fn(),
      generateWorldSetting: vi.fn(),
      generateChapterTitle: vi.fn(),
      expandOutline: vi.fn(),
      rewriteWithCharacter: vi.fn(),
      analyzeChapterEmotion: vi.fn(),
      analyzeVersionDiff: vi.fn(),
      getConfig: vi.fn(),
      updateConfig: vi.fn(),
      getConfigPath: vi.fn(),
      isAvailable: vi.fn()
    },
    export: {
      preview: vi.fn(),
      exportProject: vi.fn()
    },
    stats: {
      getAll: vi.fn()
    },
    import: {
      selectFile: vi.fn(),
      saveProject: vi.fn()
    }
  }

  // Mock SpeechSynthesis
  window.speechSynthesis = {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn().mockReturnValue([]),
    pending: false,
    speaking: false,
    paused: false,
    onvoiceschanged: null
  } as any

  // Mock SpeechSynthesisUtterance
  window.SpeechSynthesisUtterance = vi.fn().mockImplementation(() => ({})) as any
}
