import { ipcMain } from 'electron'
import { projectDAO, chapterDAO, aiInteractionDAO } from './database/dao'
import { aiService } from './services/ai-service'
import { configService, type AIConfig } from './services/config-service'

/**
 * 设置所有 IPC 处理器
 */
export function setupIPCHandlers(): void {
  // ============= Project 相关 =============

  // 获取所有项目
  ipcMain.handle('project:getAll', async () => {
    try {
      return { success: true, data: projectDAO.getAll() }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 获取单个项目
  ipcMain.handle('project:getById', async (_event, id: number) => {
    try {
      const project = projectDAO.getById(id)
      if (!project) {
        return { success: false, error: 'Project not found' }
      }
      return { success: true, data: project }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 创建项目
  ipcMain.handle(
    'project:create',
    async (_event, project: {
      name: string
      author?: string
      genre?: string
      description?: string
      target_words?: number
    }) => {
      try {
        const newProject = projectDAO.create({
          ...project,
          target_words: project.target_words ?? 0
        })
        return { success: true, data: newProject }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )

  // 更新项目
  ipcMain.handle('project:update', async (_event, id: number, updates: any) => {
    try {
      const project = projectDAO.update(id, updates)
      if (!project) {
        return { success: false, error: 'Project not found' }
      }
      return { success: true, data: project }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 删除项目
  ipcMain.handle('project:delete', async (_event, id: number) => {
    try {
      const result = projectDAO.delete(id)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 获取项目的章节列表
  ipcMain.handle('project:getChapters', async (_event, projectId: number) => {
    try {
      const chapters = projectDAO.getChapters(projectId)
      return { success: true, data: chapters }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // ============= Chapter 相关 =============

  // 获取单个章节
  ipcMain.handle('chapter:getById', async (_event, id: number) => {
    try {
      const chapter = chapterDAO.getById(id)
      if (!chapter) {
        return { success: false, error: 'Chapter not found' }
      }
      return { success: true, data: chapter }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 创建章节
  ipcMain.handle(
    'chapter:create',
    async (_event, chapter: {
      project_id: number
      title: string
      content?: string
      chapter_number: number
      status?: 'draft' | 'in_progress' | 'completed'
    }) => {
      try {
        const newChapter = chapterDAO.create({
          ...chapter,
          word_count: chapter.content?.length || 0,
          status: chapter.status || 'draft'
        })
        return { success: true, data: newChapter }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )

  // 更新章节
  ipcMain.handle('chapter:update', async (_event, id: number, updates: any) => {
    try {
      const chapter = chapterDAO.update(id, updates)
      if (!chapter) {
        return { success: false, error: 'Chapter not found' }
      }
      return { success: true, data: chapter }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 删除章节
  ipcMain.handle('chapter:delete', async (_event, id: number) => {
    try {
      const result = chapterDAO.delete(id)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // ============= AI Interaction 相关 =============

  // 获取章节的 AI 交互历史
  ipcMain.handle('ai:getHistory', async (_event, chapterId: number) => {
    try {
      const history = aiInteractionDAO.getByChapterId(chapterId)
      return { success: true, data: history }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 记录 AI 交互
  ipcMain.handle(
    'ai:logInteraction',
    async (_event, interaction: {
      chapter_id: number
      prompt: string
      response?: string
      model?: string
    }) => {
      try {
        const newInteraction = aiInteractionDAO.create(interaction)
        return { success: true, data: newInteraction }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )

  // ============= AI 协助功能 =============

  // 续写章节
  ipcMain.handle(
    'ai:continueWriting',
    async (_event, chapterId: number, context: { content: string; prompt?: string }) => {
      try {
        if (!aiService.isAvailable()) {
          return {
            success: false,
            error: 'AI 服务不可用，请配置 ANTHROPIC_API_KEY'
          }
        }

        const chapter = chapterDAO.getById(chapterId)
        if (!chapter) {
          return { success: false, error: '章节不存在' }
        }

        const project = projectDAO.getById(chapter.project_id)
        const suggestion = await aiService.continueWriting(
          context.content,
          project?.genre,
          context.prompt
        )

        // 记录 AI 交互
        await aiInteractionDAO.create({
          chapter_id: chapterId,
          prompt: context.prompt || context.content.slice(-500),
          response: suggestion,
          model: 'claude-3-5-sonnet'
        })

        return {
          success: true,
          data: {
            suggestion,
            model: 'claude-3-5-sonnet'
          }
        }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )

  // 优化文本
  ipcMain.handle('ai:improveText', async (_event, chapterId: number, text: string) => {
    try {
      if (!aiService.isAvailable()) {
        return {
          success: false,
          error: 'AI 服务不可用，请配置 ANTHROPIC_API_KEY'
        }
      }

      const chapter = chapterDAO.getById(chapterId)
      const project = chapter ? projectDAO.getById(chapter.project_id) : null

      const improved = await aiService.improveText(text, project?.genre)

      return {
        success: true,
        data: {
          improved,
          model: 'claude-3-5-sonnet'
        }
      }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 生成情节建议
  ipcMain.handle(
    'ai:suggestPlot',
    async (_event, projectId: number, context: { genre?: string; existingChapters?: string[] }) => {
      try {
        if (!aiService.isAvailable()) {
          return {
            success: false,
            error: 'AI 服务不可用，请配置 ANTHROPIC_API_KEY'
          }
        }

        const project = projectDAO.getById(projectId)
        const genre = context.genre || project?.genre

        const suggestions = await aiService.suggestPlot(
          genre || '通用',
          context.existingChapters || []
        )

        return {
          success: true,
          data: {
            suggestions,
            model: 'claude-3-5-sonnet'
          }
        }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )

  // ============= AI 配置管理 =============

  // 获取当前 AI 配置（隐藏 API Key）
  ipcMain.handle('ai:getConfig', async () => {
    try {
      const config = aiService.getConfig()
      if (!config) {
        return {
          success: false,
          error: '配置未初始化'
        }
      }

      // 隐藏敏感信息
      const safeConfig = {
        hasApiKey: !!config.apiKey,
        apiKeyPreview: config.apiKey ? `${config.apiKey.slice(0, 8)}...` : '',
        baseUrl: config.baseUrl,
        modelName: config.modelName,
        maxRetries: config.maxRetries,
        timeout: config.timeout,
        debug: config.debug
      }

      return { success: true, data: safeConfig }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 更新 AI 配置
  ipcMain.handle('ai:updateConfig', async (_event, newConfig: Partial<AIConfig>) => {
    try {
      await aiService.updateConfig(newConfig)
      return { success: true, data: '配置已更新，AI 服务已重新初始化' }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 获取配置文件路径
  ipcMain.handle('ai:getConfigPath', async () => {
    try {
      const path = configService.getConfigFilePath()
      const hasFile = configService.hasConfigFile()
      return {
        success: true,
        data: {
          path,
          hasFile
        }
      }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 检查 AI 服务可用性
  ipcMain.handle('ai:isAvailable', async () => {
    try {
      const available = aiService.isAvailable()
      return {
        success: true,
        data: {
          available,
          configExists: configService.hasConfigFile()
        }
      }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })
}
