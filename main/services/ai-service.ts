import { query } from '@anthropic-ai/claude-agent-sdk'
import { configService, type AIConfig } from './config-service'

/**
 * AI 小说创作服务
 */
export class AINovelService {
  private config: AIConfig | null = null

  constructor() {
    this.initializeService()
  }

  /**
   * 初始化 AI 服务配置
   */
  private initializeService(): void {
    try {
      this.config = configService.loadConfig()

      if (!this.config.apiKey?.trim()) {
        console.warn('[AI] ANTHROPIC_API_KEY not set; AI features are disabled.')
        this.config = null
        return
      }

      // 输出配置信息（隐藏 API Key）
      const configInfo = {
        model: this.config.modelName,
        baseUrl: this.config.baseUrl || 'default',
        maxRetries: this.config.maxRetries,
        timeout: this.config.timeout,
        debug: this.config.debug
      }

      console.log('[AI] Service initialized with config:', JSON.stringify(configInfo, null, 2))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('ANTHROPIC_API_KEY')) {
        console.warn('[AI] ANTHROPIC_API_KEY not set; AI features are disabled.')
      } else {
        console.error('[AI] Failed to initialize service:', error)
      }
      this.config = null
    }
  }

  /**
   * 检查 AI 服务是否可用
   */
  isAvailable(): boolean {
    return !!this.config?.apiKey?.trim()
  }

  /**
   * 获取当前配置
   */
  getConfig(): AIConfig | null {
    return this.config
  }

  /**
   * 更新配置（需要重启服务）
   */
  async updateConfig(newConfig: Partial<AIConfig>): Promise<void> {
    // 合并现有配置
    const mergedConfig: AIConfig = {
      ...(this.config || {} as AIConfig),
      ...newConfig
    }

    // 确保 apiKey 存在
    if (!mergedConfig.apiKey) {
      throw new Error('apiKey 不能为空')
    }

    // 保存到配置文件
    configService.saveConfig(mergedConfig)

    // 重新初始化服务
    this.config = null
    this.initializeService()

    if (!this.isAvailable()) {
      throw new Error('配置更新失败')
    }
  }

  /**
   * AI 续写功能
   */
  async continueWriting(content: string, genre?: string, prompt?: string): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('AI 服务不可用，请检查 API Key 配置')
    }

    const systemPrompt = this.buildSystemPrompt('continue', genre)
    const userPrompt = prompt || content

    try {
      const result = await this.queryAI(userPrompt, systemPrompt)
      return result
    } catch (error) {
      console.error('AI 续写失败:', error)
      throw new Error('AI 续写失败，请重试')
    }
  }

  /**
   * AI 文本优化
   */
  async improveText(text: string, genre?: string): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('AI 服务不可用，请检查 API Key 配置')
    }

    const systemPrompt = this.buildSystemPrompt('improve', genre)
    const userPrompt = `请优化以下文本，保持原意但使表达更加生动流畅：\n\n${text}`

    try {
      const result = await this.queryAI(userPrompt, systemPrompt)
      return result
    } catch (error) {
      console.error('AI 优化失败:', error)
      throw new Error('AI 优化失败，请重试')
    }
  }

  /**
   * AI 情节建议
   */
  async suggestPlot(genre: string, existingChapters: string[] = []): Promise<string[]> {
    if (!this.isAvailable()) {
      throw new Error('AI 服务不可用，请检查 API Key 配置')
    }

    const systemPrompt = this.buildSystemPrompt('suggest', genre)

    let context = '这是一个新项目的开始。'
    if (existingChapters.length > 0) {
      context = `目前已有的章节概要：\n${existingChapters.join('\n')}`
    }

    const userPrompt = `${context}\n\n请为这个${genre}小说提供 3 个有趣的后续情节发展建议，每个建议用一句话概括。`

    try {
      const result = await this.queryAI(userPrompt, systemPrompt)

      // 解析返回的建议
      const suggestions = result
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^\d+[\.\、]\s*/, '').trim())
        .slice(0, 3)

      return suggestions.length > 0 ? suggestions : ['建议继续发展主线情节', '增加角色冲突', '引入新的转折']
    } catch (error) {
      console.error('AI 建议失败:', error)
      throw new Error('AI 建议失败，请重试')
    }
  }

  /**
   * 使用 Claude Agent SDK 进行 AI 查询
   */
  private async queryAI(prompt: string, systemPrompt: string): Promise<string> {
    if (!this.config) {
      throw new Error('配置未初始化')
    }

    // 构建查询选项
    const options: any = {
      model: this.config.modelName || 'claude-3-5-sonnet-20241022',
      systemPrompt: systemPrompt
    }

    // 如果配置了自定义环境变量（包含 API Key 和 Base URL）
    const env: Record<string, string> = {
      ANTHROPIC_API_KEY: this.config.apiKey
    }

    if (this.config.baseUrl) {
      env.ANTHROPIC_BASE_URL = this.config.baseUrl
    }

    if (this.config.debug) {
      env.AI_DEBUG = 'true'
    }

    options.env = env

    // 调用 Claude Agent SDK
    const q = query({ prompt, options })

    // 收集结果
    let result = ''
    for await (const message of q) {
      if (message.type === 'result' && message.subtype === 'success') {
        result = message.result
        break
      }
      if (message.type === 'result' && message.subtype.startsWith('error_')) {
        throw new Error(message.errors?.join(', ') || '查询失败')
      }
    }

    return result
  }

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(type: 'continue' | 'improve' | 'suggest', genre?: string): string {
    const genreContext = genre ? `这是一个${genre}类型的小说。` : '这是一个小说创作项目。'

    const prompts = {
      continue: `你是一位专业的小说创作助手。${genreContext}你的任务是：
1. 根据用户提供的内容继续创作
2. 保持风格和情节连贯性
3. 每次续写约 200-500 字
4. 注意对话、描写、节奏的平衡
5. 保持人物性格一致`,
      improve: `你是一位专业的文学编辑。${genreContext}你的任务是：
1. 优化文本表达，使其更加生动流畅
2. 保持原意和核心情节不变
3. 改善对话和描写
4. 提升文本的文学性
5. 不要过度修改，保持作者风格`,
      suggest: `你是一位专业的小说创作顾问。${genreContext}你的任务是：
1. 提供有创意的情节发展建议
2. 建议要符合类型特点和读者期待
3. 考虑情节的合理性和吸引力
4. 每个建议简洁明了，一句话概括
5. 提供多样化的发展方向`
    }

    return prompts[type] || prompts.continue
  }
}

// 导出单例实例
export const aiService = new AINovelService()
