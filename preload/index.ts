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
    delete: (id: number) => ipcRenderer.invoke('chapter:delete', id)
  },
  // AI 交互 API
  ai: {
    getHistory: (chapterId: number) => ipcRenderer.invoke('ai:getHistory', chapterId),
    logInteraction: (interaction: any) => ipcRenderer.invoke('ai:logInteraction', interaction),
    continueWriting: (chapterId: number, context: any) => ipcRenderer.invoke('ai:continueWriting', chapterId, context),
    improveText: (chapterId: number, text: string) => ipcRenderer.invoke('ai:improveText', chapterId, text),
    suggestPlot: (projectId: number, context: any) => ipcRenderer.invoke('ai:suggestPlot', projectId, context),
    // 配置管理 API
    getConfig: () => ipcRenderer.invoke('ai:getConfig'),
    updateConfig: (config: any) => ipcRenderer.invoke('ai:updateConfig', config),
    getConfigPath: () => ipcRenderer.invoke('ai:getConfigPath'),
    isAvailable: () => ipcRenderer.invoke('ai:isAvailable')
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
