import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

function loadDotenv(): void {
  // 优先级：显式指定 > npm INIT_CWD > 当前工作目录
  const candidates = [
    process.env.DOTENV_CONFIG_PATH,
    process.env.INIT_CWD ? path.join(process.env.INIT_CWD, '.env') : undefined,
    path.resolve(process.cwd(), '.env')
  ].filter((p): p is string => typeof p === 'string' && p.trim().length > 0)

  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue

    const result = dotenv.config({ path: envPath, override: true })
    if (!result.error) {
      console.log('[AI] Loaded .env from:', envPath)
    }
    break
  }
}

loadDotenv()

/**
 * AI 服务配置接口
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
 * 配置文件管理服务
 */
export class ConfigService {
  private configFilePath: string
  private config: AIConfig | null = null

  constructor() {
    // 配置文件放在用户数据目录
    this.configFilePath = path.join(app.getPath('userData'), 'ai-config.json')
  }

  /**
   * 加载配置（优先级：配置文件 > 环境变量 > 默认值）
   */
  loadConfig(): AIConfig {
    // 先尝试从配置文件加载
    if (fs.existsSync(this.configFilePath)) {
      try {
        const fileContent = fs.readFileSync(this.configFilePath, 'utf-8')
        const parsed = JSON.parse(fileContent) as Partial<AIConfig> | null

        const providerFromFile = parsed?.provider === 'ollama' ? 'ollama' : 'anthropic'

        if (providerFromFile === 'ollama') {
          this.config = {
            provider: 'ollama',
            apiKey: '',
            baseUrl: typeof parsed?.baseUrl === 'string' && parsed.baseUrl.trim() ? parsed.baseUrl : 'http://127.0.0.1:11434',
            modelName: typeof parsed?.modelName === 'string' && parsed.modelName.trim() ? parsed.modelName : 'llama3.1',
            maxRetries: typeof parsed?.maxRetries === 'number' ? parsed.maxRetries : 3,
            timeout: typeof parsed?.timeout === 'number' ? parsed.timeout : 60000,
            debug: typeof parsed?.debug === 'boolean' ? parsed.debug : false
          }

          console.log('[AI] 已从配置文件加载 AI 配置 (Ollama)')
          return this.config
        }

        // Anthropic / 兼容网关
        const apiKeyFromFile = typeof parsed?.apiKey === 'string' ? parsed.apiKey.trim() : ''
        if (!apiKeyFromFile) {
          console.warn('配置文件中缺少 apiKey，将使用环境变量')
          this.config = null
        } else {
          this.config = {
            provider: 'anthropic',
            apiKey: apiKeyFromFile,
            baseUrl: typeof parsed?.baseUrl === 'string' && parsed.baseUrl.trim() ? parsed.baseUrl : undefined,
            modelName: typeof parsed?.modelName === 'string' && parsed.modelName.trim() ? parsed.modelName : 'claude-3-5-sonnet-20241022',
            maxRetries: typeof parsed?.maxRetries === 'number' ? parsed.maxRetries : 3,
            timeout: typeof parsed?.timeout === 'number' ? parsed.timeout : 60000,
            debug: typeof parsed?.debug === 'boolean' ? parsed.debug : false
          }

          console.log('[AI] 已从配置文件加载 AI 配置')
          return this.config
        }
      } catch (error) {
        console.warn('配置文件解析失败，将使用环境变量:', error)
        this.config = null
      }
    }

    const providerFromEnv = process.env.AI_PROVIDER?.trim().toLowerCase() === 'ollama' ? 'ollama' : 'anthropic'

    const maxRetries = Number.parseInt(process.env.AI_MAX_RETRIES || '3', 10)
    const timeout = Number.parseInt(process.env.AI_TIMEOUT || '60000', 10)

    if (providerFromEnv === 'ollama') {
      this.config = {
        provider: 'ollama',
        apiKey: '',
        baseUrl: process.env.OLLAMA_BASE_URL?.trim() || 'http://127.0.0.1:11434',
        modelName: process.env.OLLAMA_MODEL?.trim() || 'llama3.1',
        maxRetries: Number.isFinite(maxRetries) ? maxRetries : 3,
        timeout: Number.isFinite(timeout) ? timeout : 60000,
        debug: process.env.AI_DEBUG === 'true'
      }

      console.log('[AI] 已从环境变量加载 AI 配置 (Ollama)')
      return this.config
    }

    // Anthropic / 兼容网关
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY 未配置，请在配置文件或环境变量中设置')
    }

    this.config = {
      provider: 'anthropic',
      apiKey,
      baseUrl: process.env.ANTHROPIC_BASE_URL?.trim() || undefined,
      modelName: process.env.ANTHROPIC_MODEL?.trim() || 'claude-3-5-sonnet-20241022',
      maxRetries: Number.isFinite(maxRetries) ? maxRetries : 3,
      timeout: Number.isFinite(timeout) ? timeout : 60000,
      debug: process.env.AI_DEBUG === 'true'
    }

    console.log('[AI] 已从环境变量加载 AI 配置')
    return this.config
  }

  /**
   * 保存配置到文件
   */
  saveConfig(config: AIConfig): void {
    try {
      // 确保目录存在
      const dir = path.dirname(this.configFilePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      // 写入配置文件
      fs.writeFileSync(this.configFilePath, JSON.stringify(config, null, 2), 'utf-8')
      this.config = config
      console.log('✓ AI 配置已保存到:', this.configFilePath)
    } catch (error) {
      console.error('保存配置文件失败:', error)
      throw new Error('保存配置失败')
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): AIConfig {
    if (!this.config) {
      return this.loadConfig()
    }
    return this.config
  }

  /**
   * 获取配置文件路径
   */
  getConfigFilePath(): string {
    return this.configFilePath
  }

  /**
   * 检查配置文件是否存在
   */
  hasConfigFile(): boolean {
    return fs.existsSync(this.configFilePath)
  }
}

// 导出单例实例
export const configService = new ConfigService()
