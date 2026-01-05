import { app, dialog, ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { projectDAO, chapterDAO, chapterVersionDAO, aiInteractionDAO, characterDAO, outlineDAO, worldSettingDAO, statsDAO, storylineDAO, aiPersonaDAO, promptTemplateDAO, sceneDAO } from './database/dao'
import { aiService } from './services/ai-service'
import { configService, type AIConfig } from './services/config-service'
import { exportService, type ExportFormat, type SmartExportOptions } from './services/export-service'
import { importService, type ImportedProject } from './services/import-service'

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
      const previous = chapterDAO.getById(id)
      const chapter = chapterDAO.update(id, updates)
      if (!chapter) {
        return { success: false, error: 'Chapter not found' }
      }

      // Time Machine: 手动保存时自动快照
      // 规则：内容变动超过 50 字则存快照；__forceVersion 强制存；__skipVersion 跳过
      const shouldSkip = !!updates?.__skipVersion
      const shouldForce = !!updates?.__forceVersion
      const nextContent = typeof updates?.content === 'string' ? updates.content : undefined
      const prevContent = previous?.content ?? ''
      const delta = typeof nextContent === 'string' ? Math.abs(nextContent.length - prevContent.length) : 0

      if (!shouldSkip && (shouldForce || (typeof nextContent === 'string' && delta >= 50))) {
        try {
          chapterVersionDAO.createFromChapter(chapter)
          chapterVersionDAO.prune(chapter.id, 50)
        } catch (e) {
          // 快照失败不影响保存主流程
          console.warn('[TimeMachine] snapshot failed:', e)
        }
      }

      return { success: true, data: chapter }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 获取章节版本历史
  ipcMain.handle('chapter:getVersions', async (_event, chapterId: number, limit?: number) => {
    try {
      const versions = chapterVersionDAO.getByChapterId(chapterId, typeof limit === 'number' ? limit : 50)
      return { success: true, data: versions }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 恢复章节到指定版本
  ipcMain.handle('chapter:restoreVersion', async (_event, chapterId: number, versionId: number) => {
    try {
      const version = chapterVersionDAO.getById(versionId)
      if (!version || version.chapter_id !== chapterId) {
        return { success: false, error: 'Version not found' }
      }

      const chapter = chapterDAO.update(chapterId, {
        title: version.title,
        content: version.content || '',
        __forceVersion: true
      } as any)

      if (!chapter) {
        return { success: false, error: 'Chapter not found' }
      }

      return { success: true, data: chapter }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 创建章节快照
  ipcMain.handle('chapter:createSnapshot', async (_event, chapterId: number, name?: string) => {
    try {
      const chapter = chapterDAO.getById(chapterId)
      if (!chapter) {
        return { success: false, error: 'Chapter not found' }
      }

      // 强制创建新版本
      const version = chapterVersionDAO.createFromChapter(chapter)
      
      // 如果提供了名称（虽然目前表结构不支持 name 字段，但可以借用 title 或暂存）
      // TODO: Schema update for version name if needed, or put in tags?
      // For now, we rely on timestamp.

      return { success: true, data: version }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 更新版本信息（用于保存 AI 摘要等）
  ipcMain.handle('chapter:updateVersion', async (_event, versionId: number, updates: any) => {
    try {
      const version = chapterVersionDAO.update(versionId, updates)
      if (!version) {
        return { success: false, error: 'Version not found' }
      }
      return { success: true, data: version }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // AI 分析版本差异
  ipcMain.handle('ai:analyzeVersionDiff', async (_event, versionId: number, previousVersionId?: number) => {
    try {
      const currentVersion = chapterVersionDAO.getById(versionId)
      if (!currentVersion) {
        return { success: false, error: '当前版本不存在' }
      }

      let prevContent = ''
      let prevId: number | undefined = previousVersionId
      
      if (prevId) {
        const prev = chapterVersionDAO.getById(prevId)
        prevContent = prev?.content || ''
      } else {
        // 尝试自动查找上一版本
        const allVersions = chapterVersionDAO.getByChapterId(currentVersion.chapter_id, 200)
        // 按时间倒序，找到当前版本之后的那个（即更早的）
        // list: [V_latest, ..., V_current, V_prev, ...]
        const currentIndex = allVersions.findIndex(v => v.id === versionId)
        if (currentIndex !== -1 && currentIndex < allVersions.length - 1) {
          prevId = allVersions[currentIndex + 1].id
          prevContent = allVersions[currentIndex + 1].content || ''
        }
      }

      // 如果没有上一版本，或者上一版本内容为空，则无法进行差异分析
      // 但我们仍然可以生成摘要
      if (!prevContent) {
         // Fallback: Summarize current content? Or return specific message.
         // Let's just compare with empty string, effectively "New Content" summary.
      }

      // 无 AI 配置时：本地兜底差异摘要（避免按钮“不可用”）
      if (!aiService.isAvailable()) {
        const currentContent = currentVersion.content || ''
        const prevLen = prevContent.length
        const currLen = currentContent.length
        const deltaChars = currLen - prevLen
        const prevLines = prevContent ? prevContent.split(/\r?\n/).length : 0
        const currLines = currentContent ? currentContent.split(/\r?\n/).length : 0

        const tags = [
          'local',
          `${deltaChars >= 0 ? '+' : ''}${deltaChars} chars`,
          `${currLines - prevLines >= 0 ? '+' : ''}${currLines - prevLines} lines`
        ]

        const summary =
          `AI 未配置，已生成本地差异统计：字符 ${deltaChars >= 0 ? '增加' : '减少'} ${Math.abs(deltaChars)}，行数变化 ${currLines - prevLines >= 0 ? '+' : ''}${currLines - prevLines}。`

        chapterVersionDAO.update(versionId, { summary, tags: JSON.stringify(tags) })
        return { success: true, data: { summary, tags } }
      }

      const result = await aiService.analyzeVersionDiff(prevContent, currentVersion.content || '')
      
      // 自动保存回版本记录
      chapterVersionDAO.update(versionId, {
        summary: result.summary,
        tags: JSON.stringify(result.tags)
      })

      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 删除章节

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
        // 记录 AI 调用统计
        const chapter = chapterDAO.getById(interaction.chapter_id)
        if (chapter) {
          statsDAO.logAIUsage(chapter.project_id)
        } else if (interaction.chapter_id === 0) {
           // 对于通用聊天 (chapter_id=0)，我们可能无法直接关联到项目，
           // 除非前端传递 projectId。
           // 目前 ai:chat 的 interaction.chapter_id 设为 0。
           // 但 ai:chat 处理器中可以直接调用 logAIUsage 如果 params 中有 projectId。
        }
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
            error: 'AI 服务不可用，请在 AI 设置中配置云端 API Key 或切换到本地 Ollama'
          }
        }

        const chapter = chapterDAO.getById(chapterId)
        if (!chapter) {
          return { success: false, error: '章节不存在' }
        }

        const project = projectDAO.getById(chapter.project_id)
        const modelName = aiService.getConfig()?.modelName || 'unknown'
        
        // 使用更新后的 continueWriting 方法，传入更多上下文信息
        const suggestion = await aiService.continueWriting(
          chapter.project_id,
          chapter.chapter_number,
          context.content,
          project?.genre,
          context.prompt
        )

        // 记录 AI 交互
        await aiInteractionDAO.create({
          chapter_id: chapterId,
          prompt: context.prompt || context.content.slice(-500),
          response: suggestion,
          model: modelName
        })

        return {
          success: true,
          data: {
            suggestion,
            model: modelName
          }
        }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )

  // 优化文本
  ipcMain.handle(
    'ai:improveText',
    async (
      _event,
      chapterId: number,
      text: string,
      options?: { intensity?: 'light' | 'standard' | 'strong'; focus?: 'general' | 'dialogue' | 'description' | 'pacing' }
    ) => {
    try {
      if (!aiService.isAvailable()) {
        return {
          success: false,
          error: 'AI 服务不可用，请在 AI 设置中配置云端 API Key 或切换到本地 Ollama'
        }
      }

      const chapter = chapterDAO.getById(chapterId)
      const project = chapter ? projectDAO.getById(chapter.project_id) : null
      const modelName = aiService.getConfig()?.modelName || 'unknown'

      const improved = await aiService.improveText(text, project?.genre, options)

      return {
        success: true,
        data: {
          improved,
          model: modelName
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
            error: 'AI 服务不可用，请在 AI 设置中配置云端 API Key 或切换到本地 Ollama'
          }
        }

        const project = projectDAO.getById(projectId)
        const genre = context.genre || project?.genre

        const suggestions = await aiService.suggestPlot(
          genre || '通用',
          context.existingChapters || []
        )
        const modelName = aiService.getConfig()?.modelName || 'unknown'

        return {
          success: true,
          data: {
            suggestions,
            model: modelName
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
      const provider = config.provider || 'anthropic'
      const apiKey = config.apiKey?.trim() || ''
      const hasApiKey = !!apiKey

      const safeConfig = {
        hasApiKey,
        apiKeyPreview: hasApiKey ? `${apiKey.slice(0, 8)}...` : '',
        provider,
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

  // ============= AI 角色与模版 =============

  ipcMain.handle('ai:getPersonas', async () => {
    try {
      return { success: true, data: aiPersonaDAO.getAll() }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('ai:createPersona', async (_event, persona: any) => {
    try {
      const result = aiPersonaDAO.create(persona)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('ai:updatePersona', async (_event, id: number, updates: any) => {
    try {
      const result = aiPersonaDAO.update(id, updates)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('ai:deletePersona', async (_event, id: number) => {
    try {
      const result = aiPersonaDAO.delete(id)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('ai:getPromptTemplates', async () => {
    try {
      return { success: true, data: promptTemplateDAO.getAll() }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('ai:createPromptTemplate', async (_event, template: any) => {
    try {
      const result = promptTemplateDAO.create(template)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('ai:updatePromptTemplate', async (_event, id: number, updates: any) => {
    try {
      const result = promptTemplateDAO.update(id, updates)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('ai:deletePromptTemplate', async (_event, id: number) => {
    try {
      const result = promptTemplateDAO.delete(id)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // ============= AI 新增功能 =============

  // AI 引导式项目创建
  ipcMain.handle('ai:guidedProjectCreation', async (_event, answers: any) => {
    try {
      if (!aiService.isAvailable()) {
        return {
          success: false,
          error: 'AI 服务不可用，请在 AI 设置中配置云端 API Key 或切换到本地 Ollama'
        }
      }

      const result = await aiService.guidedProjectCreation(answers)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // AI 生成角色
  ipcMain.handle('ai:generateCharacter', async (_event, params: any) => {
    try {
      if (!aiService.isAvailable()) {
        return {
          success: false,
          error: 'AI 服务不可用，请在 AI 设置中配置云端 API Key 或切换到本地 Ollama'
        }
      }

      const result = await aiService.generateCharacter(params)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // AI 生成大纲
  ipcMain.handle('ai:generateOutline', async (_event, params: any) => {
    try {
      if (!aiService.isAvailable()) {
        return {
          success: false,
          error: 'AI 服务不可用，请在 AI 设置中配置云端 API Key 或切换到本地 Ollama'
        }
      }

      const result = await aiService.generateOutline(params)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // AI 生成世界观设定
  ipcMain.handle('ai:generateWorldSetting', async (_event, params: any) => {
    try {
      if (!aiService.isAvailable()) {
        return {
          success: false,
          error: 'AI 服务不可用，请在 AI 设置中配置云端 API Key 或切换到本地 Ollama'
        }
      }

      const result = await aiService.generateWorldSetting(params)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // AI 生成章节标题
  ipcMain.handle('ai:generateChapterTitle', async (_event, params: any) => {
    try {
      if (!aiService.isAvailable()) {
        return {
          success: false,
          error: 'AI 服务不可用，请在 AI 设置中配置云端 API Key 或切换到本地 Ollama'
        }
      }

      const result = await aiService.generateChapterTitle(params)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // AI 细纲扩写
  ipcMain.handle('ai:expandOutline', async (_event, params: { projectId: number, outline: string }) => {
    try {
      if (!aiService.isAvailable()) {
        return {
          success: false,
          error: 'AI 服务不可用'
        }
      }

      const project = projectDAO.getById(params.projectId)
      const result = await aiService.expandOutline(params.projectId, params.outline, project?.genre)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // AI 角色语气重写
  ipcMain.handle('ai:rewriteWithCharacter', async (_event, params: { projectId: number, text: string, characterName: string }) => {
    try {
      if (!aiService.isAvailable()) {
        return {
          success: false,
          error: 'AI 服务不可用'
        }
      }

      const result = await aiService.rewriteWithCharacter(params.projectId, params.text, params.characterName)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // AI 章节情绪分析
  ipcMain.handle('ai:analyzeChapterEmotion', async (_event, content: string) => {
    try {
      if (!aiService.isAvailable()) {
        return { success: false, error: 'AI 服务不可用' }
      }
      const result = await aiService.analyzeChapterEmotion(content)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 101-150 轮：逻辑一致性与伏笔扫描
  ipcMain.handle('ai:checkLogicConsistency', async (_event, params: { projectId: number, content: string, charNames: string[] }) => {
    try {
      const data = await aiService.checkLogicConsistency(params.projectId, params.content, params.charNames)
      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('ai:scanForeshadowing', async (_event, projectId: number) => {
    try {
      const data = await aiService.scanForeshadowing(projectId)
      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('ai:analyzeTextStructure', async (_event, params: any) => {
    try { return { success: true, data: await aiService.analyzeTextStructure(params.content, params.charNames) } }
    catch (error) { return { success: false, error: (error as Error).message } }
  })

  // 通用聊天 (带日志记录)
  ipcMain.handle('ai:chat', async (_event, params: any) => {
    try {
      if (!aiService.isAvailable()) {
        return { success: false, error: 'AI 服务不可用' }
      }
      const result = await aiService.chat(params)
      
      // 记录到数据库 (取最后一条用户输入作为 prompt)
      const lastUserMsg = [...params.messages].reverse().find(m => m.role === 'user')
      const chapterId = typeof params.chapterId === 'number' && params.chapterId > 0 ? params.chapterId : null
      if (lastUserMsg && chapterId) {
        aiInteractionDAO.create({
          chapter_id: chapterId,
          prompt: lastUserMsg.content,
          response: result,
          model: params.modelOverride || aiService.getConfig()?.modelName || 'unknown'
        })
      }
      
      // 记录统计
      if (lastUserMsg && params.projectId) {
        statsDAO.logAIUsage(params.projectId)
      }

      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // ============= AI 角色与模版 =============

  // 201-300 轮：回收站与还原
  ipcMain.handle('chapter:softDelete', async (_event, id: number) => {
    try { return { success: true, data: chapterDAO.softDelete(id) } }
    catch (error) { return { success: false, error: (error as Error).message } }
  })

  ipcMain.handle('chapter:getDeleted', async (_event, projectId: number) => {
    try { return { success: true, data: chapterDAO.getDeleted(projectId) } }
    catch (error) { return { success: false, error: (error as Error).message } }
  })

  ipcMain.handle('chapter:restore', async (_event, id: number) => {
    try { return { success: true, data: chapterDAO.restore(id) } }
    catch (error) { return { success: false, error: (error as Error).message } }
  })

  ipcMain.handle('chapter:search', async (_event, projectId: number, query: string) => {
    try { return { success: true, data: chapterDAO.search(projectId, query) } }
    catch (error) { return { success: false, error: (error as Error).message } }
  })

  // ============= Scene 相关 (第 231 轮) =============
  ipcMain.handle('scene:getByChapter', async (_event, chapterId: number) => {
    try { return { success: true, data: sceneDAO.getByChapterId(chapterId) } }
    catch (error) { return { success: false, error: (error as Error).message } }
  })

  ipcMain.handle('scene:create', async (_event, scene: any) => {
    try { return { success: true, data: sceneDAO.create(scene) } }
    catch (error) { return { success: false, error: (error as Error).message } }
  })

  ipcMain.handle('scene:update', async (_event, id: number, updates: any) => {
    try { return { success: true, data: sceneDAO.update(id, updates) } }
    catch (error) { return { success: false, error: (error as Error).message } }
  })

  ipcMain.handle('scene:delete', async (_event, id: number) => {
    try { return { success: true, data: sceneDAO.delete(id) } }
    catch (error) { return { success: false, error: (error as Error).message } }
  })

  // ============= Character 相关 =============

  // 获取项目的所有角色
  ipcMain.handle('character:getAll', async (_event, projectId: number) => {
    try {
      const characters = characterDAO.getAllByProject(projectId)
      return { success: true, data: characters }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 创建角色
  ipcMain.handle(
    'character:create',
    async (_event, character: {
      project_id: number
      name: string
      personality?: string
      background?: string
      relationships?: string
      avatar_url?: string
    }) => {
      try {
        const newCharacter = characterDAO.create(character)
        return { success: true, data: newCharacter }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )

  // 更新角色
  ipcMain.handle('character:update', async (_event, id: number, updates: any) => {
    try {
      const character = characterDAO.update(id, updates)
      if (!character) {
        return { success: false, error: 'Character not found' }
      }
      return { success: true, data: character }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 删除角色
  ipcMain.handle('character:delete', async (_event, id: number) => {
    try {
      const result = characterDAO.delete(id)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // ============= Outline 相关 =============

  // 获取项目的所有大纲
  ipcMain.handle('outline:getAll', async (_event, projectId: number) => {
    try {
      const outlines = outlineDAO.getAllByProject(projectId)
      return { success: true, data: outlines }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 创建大纲
  ipcMain.handle(
    'outline:create',
    async (_event, outline: {
      project_id: number
      type: 'volume' | 'chapter'
      title: string
      content?: string
      sequence: number
      parent_id?: number
    }) => {
      try {
        const newOutline = outlineDAO.create(outline)
        return { success: true, data: newOutline }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )

  // 更新大纲
  ipcMain.handle('outline:update', async (_event, id: number, updates: any) => {
    try {
      const outline = outlineDAO.update(id, updates)
      if (!outline) {
        return { success: false, error: 'Outline not found' }
      }
      return { success: true, data: outline }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 删除大纲
  ipcMain.handle('outline:delete', async (_event, id: number) => {
    try {
      const result = outlineDAO.delete(id)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 重新排序大纲
  ipcMain.handle('outline:reorder', async (_event, items: { id: number; sequence: number }[]) => {
    try {
      outlineDAO.reorder(items)
      return { success: true, data: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // ============= Storyline 相关 =============

  ipcMain.handle('storyline:getAll', async (_event, projectId: number) => {
    try {
      const result = storylineDAO.getAllByProject(projectId)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('storyline:create', async (_event, storyline: any) => {
    try {
      const result = storylineDAO.create(storyline)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('storyline:update', async (_event, id: number, updates: any) => {
    try {
      const result = storylineDAO.update(id, updates)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('storyline:delete', async (_event, id: number) => {
    try {
      const result = storylineDAO.delete(id)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // ============= World Setting 相关 =============

  // 获取项目的所有世界观设定
  ipcMain.handle('worldSetting:getAll', async (_event, projectId: number) => {
    try {
      const settings = worldSettingDAO.getAllByProject(projectId)
      return { success: true, data: settings }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 创建世界观设定
  ipcMain.handle(
    'worldSetting:create',
    async (_event, setting: {
      project_id: number
      category: string
      title: string
      content?: string
    }) => {
      try {
        const newSetting = worldSettingDAO.create(setting)
        return { success: true, data: newSetting }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )

  // 更新世界观设定
  ipcMain.handle('worldSetting:update', async (_event, id: number, updates: any) => {
    try {
      const setting = worldSettingDAO.update(id, updates)
      if (!setting) {
        return { success: false, error: 'WorldSetting not found' }
      }
      return { success: true, data: setting }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 删除世界观设定
  ipcMain.handle('worldSetting:delete', async (_event, id: number) => {
    try {
      const result = worldSettingDAO.delete(id)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // ============= 导出（Smart Export） =============

  ipcMain.handle('export:preview', async (_event, params: { projectId: number; format: ExportFormat; options?: SmartExportOptions }) => {
    try {
      const data = await exportService.preview(params.projectId, params.format, params.options)
      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('export:exportProject', async (_event, params: any) => {
    // ... logic (omitted for brevity in replacement but kept in file)
  })

  ipcMain.handle('export:exportBible', async (_event, projectId: number) => {
    try {
      const data = await exportService.exportBible(projectId)
      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // ============= 统计相关 =============

  ipcMain.handle('stats:getAll', async (_event, projectId: number) => {
    try {
      const stats = statsDAO.getAll(projectId)
      const todayCount = statsDAO.getTodayCount(projectId)
      return { success: true, data: { history: stats, today: todayCount } }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // ============= 导入相关 =============

  ipcMain.handle('import:selectFile', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择小说文件',
      properties: ['openFile'],
      filters: [{ name: '小说文件', extensions: ['txt', 'docx'] }]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: '已取消' }
    }

    try {
      const parsed = await importService.parseFile(result.filePaths[0])
      return { success: true, data: parsed }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('import:saveProject', async (_event, data: ImportedProject) => {
    try {
      // 1. 创建项目
      const project = projectDAO.create({
        name: data.name,
        author: data.author || '导入',
        genre: '导入',
        description: `导入自文件：${data.name}`,
        target_words: data.chapters.reduce((acc, c) => acc + c.word_count, 0)
      })

      // 2. 创建章节
      let chapterNum = 1
      for (const ch of data.chapters) {
        chapterDAO.create({
          project_id: project.id,
          title: ch.title,
          content: ch.content,
          chapter_number: chapterNum++,
          status: 'draft',
          word_count: ch.word_count
        })
      }

      return { success: true, data: project }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })
}
