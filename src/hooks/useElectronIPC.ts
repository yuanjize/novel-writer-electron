import { useEffect, useMemo, useRef } from 'react'
import { App as AntdApp } from 'antd'
import { useAppStore } from '../store'

/**
 * Electron IPC 通信 Hook
 */
export function useElectronIPC() {
  const setError = useAppStore((state) => state.setError)
  const { message } = AntdApp.useApp()
  const messageRef = useRef(message)

  useEffect(() => {
    messageRef.current = message
  }, [message])

  useEffect(() => {
    // 检查 electronAPI 是否可用
    if (!window.electronAPI) {
      setError('Electron API 不可用，请确保在 Electron 环境中运行')
      messageRef.current.error('Electron API 不可用')
    }
  }, [setError])

  const api = useMemo(() => ({
    // 项目操作
    loadProjects: async () => {
      const response = await window.electronAPI.project.getAll()
      if (!response.success) {
        messageRef.current.error(response.error || '加载项目失败')
        return []
      }
      return response.data || []
    },

    loadProject: async (id: number) => {
      const response = await window.electronAPI.project.getById(id)
      if (!response.success) {
        messageRef.current.error(response.error || '加载项目失败')
        return null
      }
      return response.data || null
    },

    createProject: async (project: any) => {
      const response = await window.electronAPI.project.create(project)
      if (!response.success) {
        messageRef.current.error(response.error || '创建项目失败')
        return null
      }
      messageRef.current.success('项目创建成功')
      return response.data
    },

    updateProject: async (id: number, updates: any) => {
      const response = await window.electronAPI.project.update(id, updates)
      if (!response.success) {
        messageRef.current.error(response.error || '更新项目失败')
        return null
      }
      messageRef.current.success('项目更新成功')
      return response.data
    },

    deleteProject: async (id: number) => {
      const response = await window.electronAPI.project.delete(id)
      if (!response.success) {
        messageRef.current.error(response.error || '删除项目失败')
        return false
      }
      messageRef.current.success('项目删除成功')
      return response.data
    },

    loadChapters: async (projectId: number) => {
      const response = await window.electronAPI.project.getChapters(projectId)
      if (!response.success) {
        messageRef.current.error(response.error || '加载章节失败')
        return []
      }
      return response.data || []
    },

    // 章节操作
    loadChapter: async (id: number) => {
      const response = await window.electronAPI.chapter.getById(id)
      if (!response.success) {
        messageRef.current.error(response.error || '加载章节失败')
        return null
      }
      return response.data || null
    },

    createChapter: async (chapter: any) => {
      const response = await window.electronAPI.chapter.create(chapter)
      if (!response.success) {
        messageRef.current.error(response.error || '创建章节失败')
        return null
      }
      messageRef.current.success('章节创建成功')
      return response.data
    },

    updateChapter: async (id: number, updates: any) => {
      const response = await window.electronAPI.chapter.update(id, updates)
      if (!response.success) {
        messageRef.current.error(response.error || '更新章节失败')
        return null
      }
      return response.data
    },

    loadChapterVersions: async (chapterId: number, limit?: number) => {
      const response = await window.electronAPI.chapter.getVersions(chapterId, limit)
      if (!response.success) {
        messageRef.current.error(response.error || '加载版本历史失败')
        return []
      }
      return response.data || []
    },

    restoreChapterVersion: async (chapterId: number, versionId: number) => {
      const response = await window.electronAPI.chapter.restoreVersion(chapterId, versionId)
      if (!response.success) {
        messageRef.current.error(response.error || '恢复版本失败')
        return null
      }
      messageRef.current.success('已恢复到指定版本')
      return response.data || null
    },

    createChapterSnapshot: async (chapterId: number, name?: string) => {
      const response = await window.electronAPI.chapter.createSnapshot(chapterId, name)
      if (!response.success) {
        messageRef.current.error(response.error || '创建快照失败')
        return null
      }
      messageRef.current.success('已创建新版本快照')
      return response.data || null
    },

    deleteChapter: async (id: number) => {
      const response = await window.electronAPI.chapter.delete(id)
      if (!response.success) {
        messageRef.current.error(response.error || '删除章节失败')
        return false
      }
      messageRef.current.success('章节删除成功')
      return response.data
    },

    // AI 操作
    continueWriting: async (chapterId: number, context: { content: string; prompt?: string }) => {
      return window.electronAPI.ai.continueWriting(chapterId, context)
    },

    improveText: async (
      chapterId: number,
      text: string,
      options?: { intensity?: 'light' | 'standard' | 'strong'; focus?: 'general' | 'dialogue' | 'description' | 'pacing' }
    ) => {
      return window.electronAPI.ai.improveText(chapterId, text, options)
    },

    suggestPlot: async (projectId: number, context: { genre?: string; existingChapters?: string[] }) => {
      return window.electronAPI.ai.suggestPlot(projectId, context)
    },

    generateChapterTitle: async (params: { genre: string; projectDescription: string; previousChapters: string[]; chapterContent?: string }) => {
      return window.electronAPI.ai.generateChapterTitle(params)
    },

    expandOutline: async (projectId: number, outline: string) => {
      return window.electronAPI.ai.expandOutline({ projectId, outline })
    },

    rewriteWithCharacter: async (projectId: number, text: string, characterName: string) => {
      return window.electronAPI.ai.rewriteWithCharacter({ projectId, text, characterName })
    },

    analyzeChapterEmotion: async (content: string) => {
      return window.electronAPI.ai.analyzeChapterEmotion(content)
    },

    analyzeVersionDiff: async (versionId: number, previousVersionId?: number) => {
      return window.electronAPI.ai.analyzeVersionDiff(versionId, previousVersionId)
    },

    reorderOutlines: async (items: { id: number; sequence: number }[]) => {
      const response = await window.electronAPI.outline.reorder(items)
      if (!response.success) {
        messageRef.current.error(response.error || '排序失败')
        return false
      }
      return true
    },

    // Storylines
    loadStorylines: async (projectId: number) => {
      const response = await window.electronAPI.storyline.getAll(projectId)
      if (!response.success) return []
      return response.data || []
    },

    createStoryline: async (storyline: any) => {
      const response = await window.electronAPI.storyline.create(storyline)
      if (!response.success) {
        messageRef.current.error('创建故事线失败')
        return null
      }
      return response.data
    },

    updateStoryline: async (id: number, updates: any) => {
      const response = await window.electronAPI.storyline.update(id, updates)
      return response.success ? response.data : null
    },

    deleteStoryline: async (id: number) => {
      const response = await window.electronAPI.storyline.delete(id)
      return response.success
    },

    // AI 配置管理
    getAIConfig: async () => {
      const response = await window.electronAPI.ai.getConfig()
      if (!response.success) {
        messageRef.current.error(response.error || '获取配置失败')
        return null
      }
      return response.data
    },

    updateAIConfig: async (config: any) => {
      const response = await window.electronAPI.ai.updateConfig(config)
      if (!response.success) {
        messageRef.current.error(response.error || '更新配置失败')
        return false
      }
      messageRef.current.success('AI 配置已更新')
      return true
    },

    getAIConfigPath: async () => {
      const response = await window.electronAPI.ai.getConfigPath()
      if (!response.success) {
        messageRef.current.error(response.error || '获取配置路径失败')
        return null
      }
      return response.data
    },

    checkAIAvailable: async () => {
      const response = await window.electronAPI.ai.isAvailable()
      if (!response.success) {
        return { available: false, configExists: false }
      }
      return response.data
    },

    // 导出（Smart Export）
    previewExport: async (params: { projectId: number; format: 'txt' | 'epub' | 'docx'; options?: any }) => {
      const response = await window.electronAPI.export.preview(params)
      if (!response.success) {
        messageRef.current.error(response.error || '预览导出失败')
        return null
      }
      return response.data || null
    },

    exportProject: async (params: { projectId: number; format: 'txt' | 'epub' | 'docx'; options?: any }) => {
      const response = await window.electronAPI.export.exportProject(params)
      if (!response.success) {
        messageRef.current.error(response.error || '导出失败')
        return null
      }
      messageRef.current.success(`已导出到：${response.data?.path || ''}`)
      return response.data || null
    },

    getStats: async (projectId: number) => {
      const response = await window.electronAPI.stats.getAll(projectId)
      if (!response.success) {
        return { history: [], today: 0 }
      }
      return response.data
    },

    // 导入
    selectImportFile: async () => {
      const response = await window.electronAPI.import.selectFile()
      if (!response.success) {
        if (response.error !== '已取消') {
          messageRef.current.error(response.error || '读取文件失败')
        }
        return null
      }
      return response.data
    },

    importProject: async (data: any) => {
      const response = await window.electronAPI.import.saveProject(data)
      if (!response.success) {
        messageRef.current.error(response.error || '导入失败')
        return null
      }
      messageRef.current.success('导入成功！')
      return response.data
    }
  }), [])

  return api
}
