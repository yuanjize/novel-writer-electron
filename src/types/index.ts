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
  summary?: string
  deleted_at?: string // 新增
  created_at: string
  updated_at: string
}

export interface Scene {
  id: number
  chapter_id: number
  title: string
  content?: string
  summary?: string
  sequence: number
  created_at: string
  updated_at: string
}

export interface ChapterVersion {
  id: number
  chapter_id: number
  title: string
  content?: string
  word_count: number
  summary?: string
  tags?: string // JSON array string
  created_at: string
}

export interface AIInteraction {
  id: number
  chapter_id: number
  prompt: string
  response?: string
  model?: string
  created_at: string
}

export interface Character {
  id: number
  project_id: number
  name: string
  personality?: string
  background?: string
  relationships?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Outline {
  id: number
  project_id: number
  type: 'volume' | 'chapter' | 'scene' // Added scene
  title: string
  content?: string
  sequence: number
  parent_id?: number
  storyline_id?: number
  created_at: string
  updated_at: string
}

export interface Storyline {
  id: number
  project_id: number
  name: string
  color?: string
  position: number
  description?: string
}

export interface WorldSetting {
  id: number
  project_id: number
  category: string
  title: string
  content?: string
  created_at: string
  updated_at: string
}

export interface AIPersona {
  id: number
  name: string
  description?: string
  system_prompt: string
  is_active: boolean // 这是一个 UI 状态，或者我们可以标记一个默认值
  created_at: string
  updated_at: string
}

export interface PromptTemplate {
  id: number
  name: string
  description?: string
  content: string
  category: string
  usage_count: number
  is_built_in: boolean
  created_at: string
  updated_at: string
}

/**
 * AI 配置类型
 */
export interface AIConfig {
  provider?: 'anthropic' | 'ollama'
  apiKey?: string
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
  provider?: 'anthropic' | 'ollama'
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
    createSnapshot: (chapterId: number, name?: string) => Promise<IPCResponse<ChapterVersion>>
    updateVersion: (versionId: number, updates: any) => Promise<IPCResponse<ChapterVersion>>
    getVersions: (chapterId: number, limit?: number) => Promise<IPCResponse<ChapterVersion[]>>
    restoreVersion: (chapterId: number, versionId: number) => Promise<IPCResponse<Chapter>>
    delete: (id: number) => Promise<IPCResponse<boolean>>
    // 201-300 轮：回收站与还原
    softDelete: (id: number) => Promise<IPCResponse<boolean>>
    getDeleted: (projectId: number) => Promise<IPCResponse<Chapter[]>>
    restore: (id: number) => Promise<IPCResponse<boolean>>
    search: (projectId: number, query: string) => Promise<IPCResponse<any[]>>
  }
  scene: {
    getByChapter: (chapterId: number) => Promise<IPCResponse<Scene[]>>
    create: (scene: any) => Promise<IPCResponse<Scene>>
    update: (id: number, updates: any) => Promise<IPCResponse<Scene>>
    delete: (id: number) => Promise<IPCResponse<boolean>>
  }
  character: {
    getAll: (projectId: number) => Promise<IPCResponse<Character[]>>
    create: (character: Omit<Character, 'id' | 'created_at' | 'updated_at'>) => Promise<IPCResponse<Character>>
    update: (id: number, updates: Partial<Omit<Character, 'id' | 'created_at' | 'updated_at' | 'project_id'>>) => Promise<IPCResponse<Character>>
    delete: (id: number) => Promise<IPCResponse<boolean>>
  }
  outline: {
    getAll: (projectId: number) => Promise<IPCResponse<Outline[]>>
    create: (outline: Omit<Outline, 'id' | 'created_at' | 'updated_at'>) => Promise<IPCResponse<Outline>>
    update: (id: number, updates: Partial<Omit<Outline, 'id' | 'created_at' | 'updated_at' | 'project_id'>>) => Promise<IPCResponse<Outline>>
    delete: (id: number) => Promise<IPCResponse<boolean>>
    reorder: (items: { id: number; sequence: number }[]) => Promise<IPCResponse<boolean>>
  }
  storyline: {
    getAll: (projectId: number) => Promise<IPCResponse<Storyline[]>>
    create: (storyline: Omit<Storyline, 'id'>) => Promise<IPCResponse<Storyline>>
    update: (id: number, updates: Partial<Omit<Storyline, 'id'>>) => Promise<IPCResponse<Storyline>>
    delete: (id: number) => Promise<IPCResponse<boolean>>
  }
  worldSetting: {
    getAll: (projectId: number) => Promise<IPCResponse<WorldSetting[]>>
    create: (setting: Omit<WorldSetting, 'id' | 'created_at' | 'updated_at'>) => Promise<IPCResponse<WorldSetting>>
    update: (id: number, updates: Partial<Omit<WorldSetting, 'id' | 'created_at' | 'updated_at' | 'project_id'>>) => Promise<IPCResponse<WorldSetting>>
    delete: (id: number) => Promise<IPCResponse<boolean>>
  }
  ai: {
    getHistory: (chapterId: number) => Promise<IPCResponse<AIInteraction[]>>
    logInteraction: (interaction: Omit<AIInteraction, 'id' | 'created_at'>) => Promise<IPCResponse<AIInteraction>>
    continueWriting: (chapterId: number, context: { content: string; prompt?: string }) => Promise<IPCResponse<{ suggestion: string; model: string }>>
    improveText: (
      chapterId: number,
      text: string,
      options?: {
        intensity?: 'light' | 'standard' | 'strong'
        focus?: 'general' | 'dialogue' | 'description' | 'pacing'
      }
    ) => Promise<IPCResponse<{ improved: string; model: string }>>
    suggestPlot: (projectId: number, context: { genre?: string; existingChapters?: string[] }) => Promise<IPCResponse<{ suggestions: string[]; model: string }>>
    // AI 新增功能
    guidedProjectCreation: (answers: {
      idea?: string
      preferredGenre?: string
      protagonistType?: string
      tone?: string
      specialSetting?: string
      targetWords?: number
    }) => Promise<IPCResponse<{
      name: string
      description: string
      genre: string
      target_words: number
      suggested_protagonist: string
      suggested_world_view: string
    }>>
    generateCharacter: (params: {
      projectId: number
      role: 'protagonist' | 'antagonist' | 'supporting'
      context?: string
      existingCharacters?: string[]
    }) => Promise<IPCResponse<{
      name: string
      personality: string
      background: string
      relationships: string
    }>>
    generateOutline: (params: {
      genre: string
      projectDescription: string
      existingChapters?: Array<{ title: string; content?: string }>
      targetChapterCount?: number
    }) => Promise<IPCResponse<Array<{
      title: string
      content: string
      sequence: number
    }>>>
    generateWorldSetting: (params: {
      genre: string
      projectDescription: string
      category?: string
    }) => Promise<IPCResponse<Array<{
      category: string
      title: string
      content: string
    }>>>
    generateChapterTitle: (params: {
      genre: string
      projectDescription: string
      previousChapters: string[]
      chapterContent?: string
    }) => Promise<IPCResponse<string>>
    expandOutline: (params: {
      projectId: number
      outline: string
    }) => Promise<IPCResponse<string>>
    rewriteWithCharacter: (params: {
      projectId: number
      text: string
      characterName: string
    }) => Promise<IPCResponse<string>>
    analyzeChapterEmotion: (content: string) => Promise<IPCResponse<{ score: number; label: string; critique: string }>>
    checkLogicConsistency: (params: { projectId: number, content: string, charNames: string[] }) => Promise<IPCResponse<Array<{ issue: string, suggestion: string }>>>
    scanForeshadowing: (projectId: number) => Promise<IPCResponse<any[]>>
    analyzeTextStructure: (params: { content: string, charNames: string[] }) => Promise<IPCResponse<any>>
    analyzeVersionDiff: (versionId: number, previousVersionId?: number) => Promise<IPCResponse<{ summary: string; tags: string[] }>>
    // 配置管理
    getConfig: () => Promise<IPCResponse<SafeAIConfig>>
    updateConfig: (config: Partial<AIConfig>) => Promise<IPCResponse<string>>
    getConfigPath: () => Promise<IPCResponse<{ path: string; hasFile: boolean }>>
    isAvailable: () => Promise<IPCResponse<{ available: boolean; configExists: boolean }>>
    
    // AI 聊天与提示词增强
    chat: (params: {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>,
      systemPrompt?: string,
      modelOverride?: string,
      temperature?: number,
      chapterId?: number,
      projectId?: number,
      chapterNumber?: number,
      selection?: string,
      pinnedContext?: { charIds: number[], settingIds: number[] }
    }) => Promise<IPCResponse<string>>
    
    // AI 角色与模版
    getPersonas: () => Promise<IPCResponse<AIPersona[]>>
    createPersona: (persona: Omit<AIPersona, 'id' | 'created_at' | 'updated_at' | 'is_active'>) => Promise<IPCResponse<AIPersona>>
    updatePersona: (id: number, updates: Partial<Omit<AIPersona, 'id' | 'created_at' | 'updated_at'>>) => Promise<IPCResponse<AIPersona>>
    deletePersona: (id: number) => Promise<IPCResponse<boolean>>
    
    getPromptTemplates: () => Promise<IPCResponse<PromptTemplate[]>>
    createPromptTemplate: (template: Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count' | 'is_built_in'>) => Promise<IPCResponse<PromptTemplate>>
    updatePromptTemplate: (id: number, updates: Partial<Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at' | 'is_built_in'>>) => Promise<IPCResponse<PromptTemplate>>
    deletePromptTemplate: (id: number) => Promise<IPCResponse<boolean>>
  }
  export: {
    preview: (params: {
      projectId: number
      format: 'txt' | 'epub' | 'docx'
      options?: {
        includeProjectHeader?: boolean
        includeVolumeTitles?: boolean
        includeChapterTitles?: boolean
        cleanBlankLines?: boolean
        indentParagraphs?: boolean
        paragraphIndentText?: string
      }
    }) => Promise<IPCResponse<{ html: string; suggestedName: string }>>
    exportProject: (params: {
      projectId: number
      format: 'txt' | 'epub' | 'docx'
      options?: any
    }) => Promise<IPCResponse<{ path: string }>>
    exportBible: (projectId: number) => Promise<IPCResponse<{ html: string, suggestedName: string }>>
  }
  stats: {
    getAll: (projectId: number) => Promise<IPCResponse<{ history: any[]; today: number }>>
  }
  import: {
    selectFile: () => Promise<IPCResponse<any>>
    saveProject: (data: any) => Promise<IPCResponse<any>>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
