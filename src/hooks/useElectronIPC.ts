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

    improveText: async (chapterId: number, text: string) => {
      return window.electronAPI.ai.improveText(chapterId, text)
    },

    suggestPlot: async (projectId: number, context: { genre?: string; existingChapters?: string[] }) => {
      return window.electronAPI.ai.suggestPlot(projectId, context)
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
    }
  }), [])

  return api
}
