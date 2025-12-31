/**
 * 数据类型定义
 */

export interface Project {
  id: number
  name: string
  author?: string
  genre?: string
  description?: string
  target_words: number
  created_at: string
  updated_at: string
}

export interface Chapter {
  id: number
  project_id: number
  title: string
  content?: string
  chapter_number: number
  word_count: number
  status: 'draft' | 'in_progress' | 'completed'
  created_at: string
  updated_at: string
}

export interface AIInteraction {
  id: number
  chapter_id: number
  prompt: string
  response?: string
  model?: string
  created_at: string
}

/**
 * AI 配置类型
 */
export interface AIConfig {
  apiKey: string
  baseUrl?: string
  modelName?: string
  maxRetries?: number
  timeout?: number
  debug?: boolean
}

/**
 * 安全的 AI 配置（隐藏敏感信息）
 */
export interface SafeAIConfig {
  hasApiKey: boolean
  apiKeyPreview: string
  baseUrl?: string
  modelName?: string
  maxRetries?: number
  timeout?: number
  debug?: boolean
}

/**
 * IPC 请求/响应类型
 */
export interface IPCResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Electron API 类型（在 preload 中定义）
 */
export interface ElectronAPI {
  project: {
    getAll: () => Promise<IPCResponse<Project[]>>
    getById: (id: number) => Promise<IPCResponse<Project>>
    create: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Promise<IPCResponse<Project>>
    update: (id: number, updates: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>) => Promise<IPCResponse<Project>>
    delete: (id: number) => Promise<IPCResponse<boolean>>
    getChapters: (projectId: number) => Promise<IPCResponse<Chapter[]>>
  }
  chapter: {
    getById: (id: number) => Promise<IPCResponse<Chapter>>
    create: (chapter: Omit<Chapter, 'id' | 'created_at' | 'updated_at' | 'word_count'>) => Promise<IPCResponse<Chapter>>
    update: (id: number, updates: Partial<Omit<Chapter, 'id' | 'created_at' | 'updated_at' | 'project_id'>>) => Promise<IPCResponse<Chapter>>
    delete: (id: number) => Promise<IPCResponse<boolean>>
  }
  ai: {
    getHistory: (chapterId: number) => Promise<IPCResponse<AIInteraction[]>>
    logInteraction: (interaction: Omit<AIInteraction, 'id' | 'created_at'>) => Promise<IPCResponse<AIInteraction>>
    continueWriting: (chapterId: number, context: { content: string; prompt?: string }) => Promise<IPCResponse<{ suggestion: string; model: string }>>
    improveText: (chapterId: number, text: string) => Promise<IPCResponse<{ improved: string; model: string }>>
    suggestPlot: (projectId: number, context: { genre?: string; existingChapters?: string[] }) => Promise<IPCResponse<{ suggestions: string[]; model: string }>>
    // 配置管理
    getConfig: () => Promise<IPCResponse<SafeAIConfig>>
    updateConfig: (config: Partial<AIConfig>) => Promise<IPCResponse<string>>
    getConfigPath: () => Promise<IPCResponse<{ path: string; hasFile: boolean }>>
    isAvailable: () => Promise<IPCResponse<{ available: boolean; configExists: boolean }>>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
