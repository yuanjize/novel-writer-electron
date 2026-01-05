import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  // 项目管理 API
  project: {
    getAll: () => ipcRenderer.invoke('project:getAll'),
    getById: (id: number) => ipcRenderer.invoke('project:getById', id),
    create: (data: any) => ipcRenderer.invoke('project:create', data),
    update: (id: number, updates: any) => ipcRenderer.invoke('project:update', id, updates),
    delete: (id: number) => ipcRenderer.invoke('project:delete', id),
    getChapters: (projectId: number) => ipcRenderer.invoke('project:getChapters', projectId)
  },
  // 章节管理 API
  chapter: {
    getById: (id: number) => ipcRenderer.invoke('chapter:getById', id),
    create: (data: any) => ipcRenderer.invoke('chapter:create', data),
    update: (id: number, updates: any) => ipcRenderer.invoke('chapter:update', id, updates),
    createSnapshot: (chapterId: number, name?: string) => ipcRenderer.invoke('chapter:createSnapshot', chapterId, name),
    updateVersion: (versionId: number, updates: any) => ipcRenderer.invoke('chapter:updateVersion', versionId, updates),
    getVersions: (chapterId: number, limit?: number) => ipcRenderer.invoke('chapter:getVersions', chapterId, limit),
    restoreVersion: (chapterId: number, versionId: number) => ipcRenderer.invoke('chapter:restoreVersion', chapterId, versionId),
    softDelete: (id: number) => ipcRenderer.invoke('chapter:softDelete', id),
    getDeleted: (projectId: number) => ipcRenderer.invoke('chapter:getDeleted', projectId),
    restore: (id: number) => ipcRenderer.invoke('chapter:restore', id),
    search: (projectId: number, query: string) => ipcRenderer.invoke('chapter:search', projectId, query),
    delete: (id: number) => ipcRenderer.invoke('chapter:delete', id)
  },
  // 分场景 API（第 231 轮）
  scene: {
    getByChapter: (chapterId: number) => ipcRenderer.invoke('scene:getByChapter', chapterId),
    create: (data: any) => ipcRenderer.invoke('scene:create', data),
    update: (id: number, updates: any) => ipcRenderer.invoke('scene:update', id, updates),
    delete: (id: number) => ipcRenderer.invoke('scene:delete', id)
  },
  // 角色管理 API
  character: {
    getAll: (projectId: number) => ipcRenderer.invoke('character:getAll', projectId),
    create: (data: any) => ipcRenderer.invoke('character:create', data),
    update: (id: number, updates: any) => ipcRenderer.invoke('character:update', id, updates),
    delete: (id: number) => ipcRenderer.invoke('character:delete', id)
  },
  // 大纲管理 API
  outline: {
    getAll: (projectId: number) => ipcRenderer.invoke('outline:getAll', projectId),
    create: (data: any) => ipcRenderer.invoke('outline:create', data),
    update: (id: number, updates: any) => ipcRenderer.invoke('outline:update', id, updates),
    delete: (id: number) => ipcRenderer.invoke('outline:delete', id),
    reorder: (items: { id: number; sequence: number }[]) => ipcRenderer.invoke('outline:reorder', items)
  },
  // 故事线 API
  storyline: {
    getAll: (projectId: number) => ipcRenderer.invoke('storyline:getAll', projectId),
    create: (data: any) => ipcRenderer.invoke('storyline:create', data),
    update: (id: number, updates: any) => ipcRenderer.invoke('storyline:update', id, updates),
    delete: (id: number) => ipcRenderer.invoke('storyline:delete', id)
  },
  // 世界观设定 API
  worldSetting: {
    getAll: (projectId: number) => ipcRenderer.invoke('worldSetting:getAll', projectId),
    create: (data: any) => ipcRenderer.invoke('worldSetting:create', data),
    update: (id: number, updates: any) => ipcRenderer.invoke('worldSetting:update', id, updates),
    delete: (id: number) => ipcRenderer.invoke('worldSetting:delete', id)
  },
  // AI 交互 API
  ai: {
    getHistory: (chapterId: number) => ipcRenderer.invoke('ai:getHistory', chapterId),
    logInteraction: (interaction: any) => ipcRenderer.invoke('ai:logInteraction', interaction),
    continueWriting: (chapterId: number, context: any) => ipcRenderer.invoke('ai:continueWriting', chapterId, context),
    improveText: (chapterId: number, text: string, options?: any) => ipcRenderer.invoke('ai:improveText', chapterId, text, options),
    suggestPlot: (projectId: number, context: any) => ipcRenderer.invoke('ai:suggestPlot', projectId, context),
    // AI 新增功能
    guidedProjectCreation: (answers: any) => ipcRenderer.invoke('ai:guidedProjectCreation', answers),
    generateCharacter: (params: any) => ipcRenderer.invoke('ai:generateCharacter', params),
    generateOutline: (params: any) => ipcRenderer.invoke('ai:generateOutline', params),
    generateWorldSetting: (params: any) => ipcRenderer.invoke('ai:generateWorldSetting', params),
    generateChapterTitle: (params: any) => ipcRenderer.invoke('ai:generateChapterTitle', params),
    expandOutline: (params: any) => ipcRenderer.invoke('ai:expandOutline', params),
    rewriteWithCharacter: (params: any) => ipcRenderer.invoke('ai:rewriteWithCharacter', params),
    analyzeChapterEmotion: (content: string) => ipcRenderer.invoke('ai:analyzeChapterEmotion', content),
    analyzeTextStructure: (params: any) => ipcRenderer.invoke('ai:analyzeTextStructure', params),
    analyzeVersionDiff: (versionId: number, previousVersionId?: number) => ipcRenderer.invoke('ai:analyzeVersionDiff', versionId, previousVersionId),
    checkLogicConsistency: (params: any) => ipcRenderer.invoke('ai:checkLogicConsistency', params),
    scanForeshadowing: (projectId: number) => ipcRenderer.invoke('ai:scanForeshadowing', projectId),
    // 配置管理 API
    getConfig: () => ipcRenderer.invoke('ai:getConfig'),
    updateConfig: (config: any) => ipcRenderer.invoke('ai:updateConfig', config),
    getConfigPath: () => ipcRenderer.invoke('ai:getConfigPath'),
    isAvailable: () => ipcRenderer.invoke('ai:isAvailable'),
    chat: (params: any) => ipcRenderer.invoke('ai:chat', params),

    // AI 角色与模版
    getPersonas: () => ipcRenderer.invoke('ai:getPersonas'),
    createPersona: (data: any) => ipcRenderer.invoke('ai:createPersona', data),
    updatePersona: (id: number, updates: any) => ipcRenderer.invoke('ai:updatePersona', id, updates),
    deletePersona: (id: number) => ipcRenderer.invoke('ai:deletePersona', id),

    getPromptTemplates: () => ipcRenderer.invoke('ai:getPromptTemplates'),
    createPromptTemplate: (data: any) => ipcRenderer.invoke('ai:createPromptTemplate', data),
    updatePromptTemplate: (id: number, updates: any) => ipcRenderer.invoke('ai:updatePromptTemplate', id, updates),
    deletePromptTemplate: (id: number) => ipcRenderer.invoke('ai:deletePromptTemplate', id)
  },
  // 导出（Smart Export）
  export: {
    preview: (params: any) => ipcRenderer.invoke('export:preview', params),
    exportProject: (params: any) => ipcRenderer.invoke('export:exportProject', params),
    exportBible: (projectId: number) => ipcRenderer.invoke('export:exportBible', projectId)
  },
  // 统计 API
  stats: {
    getAll: (projectId: number) => ipcRenderer.invoke('stats:getAll', projectId)
  },
  // 导入 API
  import: {
    selectFile: () => ipcRenderer.invoke('import:selectFile'),
    saveProject: (data: any) => ipcRenderer.invoke('import:saveProject', data)
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
