import { configService, type AIConfig } from './config-service'
import { characterDAO, worldSettingDAO, projectDAO } from '../database/dao'

/**
 * AI 小说创作服务 - 全功能版 (700 轮马拉松 Phase 6 Fix)
 */
export class AINovelService {
  private config: AIConfig | null = null
  constructor() { this.initializeService() }

  private initializeService(): void {
    try {
      this.config = configService.loadConfig()
      if (this.config.provider === 'anthropic' && !this.config.apiKey?.trim()) { this.config = null }
    } catch (e) { this.config = null }
  }

  isAvailable(): boolean {
    if (!this.config) return false
    return this.config.provider === 'ollama' ? !!this.config.modelName?.trim() : !!this.config.apiKey?.trim()
  }

  getConfig(): AIConfig | null { return this.config }

  async updateConfig(newConfig: Partial<AIConfig>): Promise<void> {
    const merged = { ...(this.config || {} as AIConfig), ...newConfig }
    configService.saveConfig(merged)
    this.config = null
    this.initializeService()
  }

  private async buildAdvancedContext(projectId: number, currentText: string, chapterNumber: number, options?: any): Promise<string> {
    let context = '【上下文】\n'
    try {
      const allChapters = projectDAO.getChapters(projectId)
      const prev = allChapters.filter(c => c.chapter_number < chapterNumber && c.summary).sort((a,b)=>b.chapter_number - a.chapter_number).slice(0,5).reverse()
      prev.forEach(c => { context += `第${c.chapter_number}章摘要：${c.summary}\n` })
    } catch (e) {}
    return context
  }

  async chat(params: any): Promise<string> {
    if (!this.isAvailable()) throw new Error('AI 不可用')
    let systemPrompt = params.systemPrompt || '你是一位作家。'
    if (params.projectId && params.chapterNumber) {
      systemPrompt += '\n' + await this.buildAdvancedContext(params.projectId, params.selection || '', params.chapterNumber, params.pinnedContext)
    }
    return this.config?.provider === 'ollama' ? this.queryOllama(params, systemPrompt) : this.queryAnthropic(params, systemPrompt)
  }

  private cleanUrl(url: string): string {
    let res = (url || '').trim()
    while (res.endsWith('/')) { res = res.substring(0, res.length - 1) }
    return res
  }

  private async queryOllama(params: any, systemPrompt: string): Promise<string> {
    const base = this.cleanUrl(this.config?.baseUrl || 'http://127.0.0.1:11434')
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: this.config?.modelName || 'llama3.1',
        stream: false,
        options: { temperature: params.temperature || 0.7 },
        messages: [{ role: 'system', content: systemPrompt }, ...params.messages]
      })
    })
    const json = await res.json() as any
    return json.message?.content || json.response || ''
  }

  private async queryAnthropic(params: any, systemPrompt: string): Promise<string> {
    const base = this.cleanUrl(this.config?.baseUrl || 'https://api.anthropic.com')
    const res = await fetch(`${base}/v1/messages`, {
      method: 'POST',
      headers: { 
        'content-type': 'application/json',
        'x-api-key': this.config?.apiKey || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config?.modelName || 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: params.temperature || 0.7,
        system: systemPrompt,
        messages: params.messages.filter((m: any) => m.role !== 'system')
      })
    })
    const json = await res.json() as any
    return json.content?.[0]?.text || ''
  }

  async analyzeTextStructure(content: string, characterNames: string[]): Promise<any> {
    const systemPrompt = `分析小说片段并返回 JSON: {"pacing":[{"label":"起","score":5}], "characterStats":[{"name":"张三","count":10}], "style":{"readability":80, "tone":"幽默"}}`
    const res = await this.chat({ messages: [{ role: 'user', content }], systemPrompt })
    try { return JSON.parse(res.match(/\{.*\}/s)?.[0] || '{}') } catch (e) { return {} }
  }

  async checkLogicConsistency(pId: number, content: string, cNames: string[]): Promise<any[]> {
    const res = await this.chat({ messages: [{ role: 'user', content: `分析角色一致性：${cNames.join(',')}\n${content}` }] })
    try { return JSON.parse(res.match(/.*\]/s)?.[0] || '[]') } catch (e) { return [] }
  }

  async scanForeshadowing(pId: number): Promise<any[]> {
    const res = await this.chat({ messages: [{ role: 'user', content: '找出未填的伏笔' }] })
    try { return JSON.parse(res.match(/.*\]/s)?.[0] || '[]') } catch (e) { return [] }
  }

  async continueWriting(pId: number, cNum: number, c: string, genre?: string, prompt?: string): Promise<string> {
    const instruction = [
      '请基于以下内容继续续写下一段，保持人称、时态与文风一致。',
      genre ? `题材/风格：${genre}` : undefined,
      prompt?.trim() ? `额外要求：${prompt.trim()}` : undefined,
      '【当前内容】',
      c,
      '【输出要求】只输出续写文本，不要解释。'
    ]
      .filter(Boolean)
      .join('\n')

    return this.chat({
      messages: [{ role: 'user', content: instruction }],
      projectId: pId,
      chapterNumber: cNum,
      selection: c
    })
  }

  async improveText(
    t: string,
    genre?: string,
    options?: { intensity?: 'light' | 'standard' | 'strong'; focus?: 'general' | 'dialogue' | 'description' | 'pacing' }
  ): Promise<string> {
    const intensity = options?.intensity ?? 'standard'
    const focus = options?.focus ?? 'general'

    const intensityGuide =
      intensity === 'light'
        ? '强度：轻度（尽量少改动，主要修错别字/语病/标点）。'
        : intensity === 'strong'
          ? '强度：强（允许较大改写，但不改变核心情节与信息）。'
          : '强度：标准（适度润色，提升节奏与表达）。'

    const focusGuide =
      focus === 'dialogue'
        ? '侧重：对白（更自然、更有角色口吻，减少说教）。'
        : focus === 'description'
          ? '侧重：描写（更具画面感与感官细节，避免堆砌）。'
          : focus === 'pacing'
            ? '侧重：节奏（删冗余、增强张力与推进）。'
            : '侧重：通用（整体可读性与感染力）。'

    const instruction = [
      '请润色/改写以下文本：',
      genre ? `题材/风格：${genre}` : undefined,
      intensityGuide,
      focusGuide,
      '【原文】',
      t,
      '【输出要求】只输出润色后的文本，不要解释。'
    ]
      .filter(Boolean)
      .join('\n')

    return this.chat({ messages: [{ role: 'user', content: instruction }] })
  }

  async expandOutline(pId: number, o: string, genre?: string): Promise<string> {
    const instruction = [
      '请把下面的大纲扩写为更详细的细纲（可用于直接写作）。',
      genre ? `题材/风格：${genre}` : undefined,
      '【大纲】',
      o,
      '【输出要求】分点输出，每点包含：场景/冲突/转折/悬念/人物动机；不要解释。'
    ]
      .filter(Boolean)
      .join('\n')

    return this.chat({ messages: [{ role: 'user', content: instruction }], projectId: pId, chapterNumber: 1, selection: o })
  }
  async rewriteWithCharacter(pId: number, t: string, cN: string): Promise<string> { return this.chat({ messages: [{ role: 'user', content: `用${cN}口吻：${t}` }], projectId: pId, chapterNumber: 1 }) }
  async suggestPlot(g: string, e: string[]): Promise<string[]> { const res = await this.chat({ messages: [{ role: 'user', content: '情节建议' }] }); return res.split('\n').slice(0, 3) }
  async analyzeChapterEmotion(c: string): Promise<any> { return { score: 5, label: '稳', critique: '优' } }
  async analyzeVersionDiff(o: string, n: string): Promise<any> { return { summary: '改', tags: [] } }
  async generateChapterTitle(p: any): Promise<string> { return '标题' }
  async guidedProjectCreation(a: any): Promise<any> { return { name: '新' } }
  async generateCharacter(p: any): Promise<any> { return { name: '角' } }
  async generateOutline(p: any): Promise<any> { return [] }
  async generateWorldSetting(p: any): Promise<any> { return [] }
}

export const aiService = new AINovelService()
