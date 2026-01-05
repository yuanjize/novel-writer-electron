import Database from 'better-sqlite3'
import { getDatabase } from './init'

// ============= 类型定义 =============

export interface Project { id: number; name: string; author?: string; genre?: string; description?: string; target_words: number; created_at: string; updated_at: string; }
export interface Chapter { id: number; project_id: number; title: string; content?: string; chapter_number: number; word_count: number; status: 'draft' | 'in_progress' | 'completed'; summary?: string; deleted_at?: string; created_at: string; updated_at: string; }
export interface Scene { id: number; chapter_id: number; title: string; content?: string; summary?: string; sequence: number; created_at: string; updated_at: string; }
export interface ChapterVersion { id: number; chapter_id: number; title: string; content?: string; word_count: number; summary?: string; tags?: string; created_at: string; }
export interface AIInteraction { id: number; chapter_id: number; prompt: string; response?: string; model?: string; created_at: string; }
export interface Character { id: number; project_id: number; name: string; personality?: string; background?: string; relationships?: string; avatar_url?: string; created_at: string; updated_at: string; }
export interface Outline { id: number; project_id: number; type: 'volume' | 'chapter'; title: string; content?: string; sequence: number; parent_id?: number; storyline_id?: number; created_at: string; updated_at: string; }
export interface Storyline { id: number; project_id: number; name: string; color?: string; position: number; description?: string; created_at: string; updated_at: string; }
export interface WorldSetting { id: number; project_id: number; category: string; title: string; content?: string; created_at: string; updated_at: string; }

// ============= DAOs =============

export class ProjectDAO {
  private db: Database.Database; constructor(db?: Database.Database) { this.db = db || getDatabase() }
  create(project: any): Project { const res = this.db.prepare('INSERT INTO projects (name, author, genre, description, target_words) VALUES (?, ?, ?, ?, ?)').run(project.name, project.author || null, project.genre || null, project.description || null, project.target_words); return this.getById(res.lastInsertRowid as number)! }
  getById(id: number): Project | undefined { return this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project }
  getAll(): Project[] { return this.db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all() as Project[] }
  update(id: number, updates: any): Project | undefined { const fields = Object.keys(updates).map(k => `${k} = ?`).join(', '); this.db.prepare(`UPDATE projects SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...Object.values(updates), id); return this.getById(id) }
  delete(id: number): boolean { return this.db.prepare('DELETE FROM projects WHERE id = ?').run(id).changes > 0 }
  getChapters(projectId: number): Chapter[] { return this.db.prepare('SELECT * FROM chapters WHERE project_id = ? AND deleted_at IS NULL ORDER BY chapter_number').all(projectId) as Chapter[] }
}

export class ChapterDAO {
  private db: Database.Database; constructor(db?: Database.Database) { this.db = db || getDatabase() }
  create(chapter: any): Chapter { const res = this.db.prepare('INSERT INTO chapters (project_id, title, content, chapter_number, word_count, status, summary) VALUES (?, ?, ?, ?, ?, ?, ?)').run(chapter.project_id, chapter.title, chapter.content || null, chapter.chapter_number, chapter.word_count || 0, chapter.status || 'draft', chapter.summary || null); return this.getById(res.lastInsertRowid as number)! }
  getById(id: number): Chapter | undefined { return this.db.prepare('SELECT * FROM chapters WHERE id = ?').get(id) as Chapter }
  /**
   * 搜索章节内容 (FTS5 高性能版)
   */
  search(projectId: number, query: string): any[] {
    try {
      const stmt = this.db.prepare(`
        SELECT c.id, c.title, snippet(chapter_search, 2, '<b>', '</b>', '...', 20) as preview
        FROM chapter_search s
        JOIN chapters c ON c.id = s.chapter_id
        WHERE c.project_id = ? AND chapter_search MATCH ?
        ORDER BY rank
      `)
      return stmt.all(projectId, query)
    } catch (e) {
      // Fallback to LIKE if FTS fails
      return this.db.prepare("SELECT id, title, content as preview FROM chapters WHERE project_id = ? AND (content LIKE ? OR title LIKE ?)").all(projectId, `%${query}%`, `%${query}%`)
    }
  }

  /**
   * 同步搜索索引
   */
  syncSearchIndex(chapterId: number, title: string, content: string): void {
    try {
      this.db.prepare("INSERT OR REPLACE INTO chapter_search (chapter_id, title, content) VALUES (?, ?, ?)").run(chapterId, title, content)
    } catch (e) {}
  }

  /**
   * 更新章节
   */
  update(id: number, updates: any): Chapter | undefined { 
    const filtered = Object.fromEntries(Object.entries(updates).filter(([k]) => !k.startsWith('__'))) as Record<string, any>
    if (updates.content !== undefined) { 
      const previous = this.getById(id)
      const nextWordCount = typeof updates.content === 'string' ? updates.content.length : 0
      filtered.word_count = nextWordCount
      if (previous) {
        statsDAO.logChange(previous.project_id, nextWordCount - (previous.word_count || 0))
      }
    }
    const fields = Object.keys(filtered).map(k => `${k} = ?`).join(', '); 
    if (fields) this.db.prepare(`UPDATE chapters SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...Object.values(filtered), id); 
    
    // 381 轮：自动同步索引
    const updated = this.getById(id)
    if (updated) this.syncSearchIndex(updated.id, updated.title, updated.content || '')
    
    return updated
  }
  softDelete(id: number): boolean { return this.db.prepare("UPDATE chapters SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?").run(id).changes > 0 }
  restore(id: number): boolean { return this.db.prepare("UPDATE chapters SET deleted_at = NULL WHERE id = ?").run(id).changes > 0 }
  getDeleted(projectId: number): Chapter[] { return this.db.prepare("SELECT * FROM chapters WHERE project_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC").all(projectId) as Chapter[] }
  delete(id: number): boolean { return this.db.prepare('DELETE FROM chapters WHERE id = ?').run(id).changes > 0 }
}

export class SceneDAO {
  private db: Database.Database; constructor() { this.db = getDatabase() }
  getByChapterId(chapterId: number): Scene[] { return this.db.prepare('SELECT * FROM scenes WHERE chapter_id = ? ORDER BY sequence').all(chapterId) as Scene[] }
  create(scene: any): Scene { const res = this.db.prepare('INSERT INTO scenes (chapter_id, title, content, sequence) VALUES (?, ?, ?, ?)').run(scene.chapter_id, scene.title, scene.content || '', scene.sequence || 0); return this.db.prepare('SELECT * FROM scenes WHERE id = ?').get(res.lastInsertRowid) as Scene }
  update(id: number, updates: any): Scene { const fields = Object.keys(updates).map(k => `${k} = ?`).join(', '); this.db.prepare(`UPDATE scenes SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...Object.values(updates), id); return this.db.prepare('SELECT * FROM scenes WHERE id = ?').get(id) as Scene }
  delete(id: number): boolean { return this.db.prepare('DELETE FROM scenes WHERE id = ?').run(id).changes > 0 }
}

export class ChapterVersionDAO {
  private db: Database.Database; constructor() { this.db = getDatabase() }
  createFromChapter(c: Chapter): ChapterVersion { const res = this.db.prepare('INSERT INTO chapter_versions (chapter_id, title, content, word_count) VALUES (?, ?, ?, ?)').run(c.id, c.title, c.content || null, c.word_count); return this.getById(res.lastInsertRowid as number)! }
  getById(id: number): ChapterVersion | undefined { return this.db.prepare('SELECT * FROM chapter_versions WHERE id = ?').get(id) as ChapterVersion }
  getByChapterId(cId: number, limit: number = 50): ChapterVersion[] { return this.db.prepare('SELECT * FROM chapter_versions WHERE chapter_id = ? ORDER BY created_at DESC LIMIT ?').all(cId, limit) as ChapterVersion[] }
  update(id: number, updates: any): any { const fields = Object.keys(updates).map(k => `${k} = ?`).join(', '); this.db.prepare(`UPDATE chapter_versions SET ${fields} WHERE id = ?`).run(...Object.values(updates), id); return this.getById(id) }
  prune(cId: number, keep: number = 50): void { this.db.prepare("DELETE FROM chapter_versions WHERE chapter_id = ? AND id NOT IN (SELECT id FROM chapter_versions WHERE chapter_id = ? ORDER BY created_at DESC LIMIT ?)").run(cId, cId, keep) }
}

export class AIInteractionDAO {
  private db: Database.Database; constructor() { this.db = getDatabase() }
  create(i: any): AIInteraction { const res = this.db.prepare('INSERT INTO ai_interactions (chapter_id, prompt, response, model) VALUES (?, ?, ?, ?)').run(i.chapter_id, i.prompt, i.response || null, i.model || null); return this.db.prepare('SELECT * FROM ai_interactions WHERE id = ?').get(res.lastInsertRowid) as AIInteraction }
  getByChapterId(cId: number): AIInteraction[] { return this.db.prepare('SELECT * FROM ai_interactions WHERE chapter_id = ? ORDER BY created_at DESC').all(cId) as AIInteraction[] }
  getById(id: number): AIInteraction | undefined { return this.db.prepare('SELECT * FROM ai_interactions WHERE id = ?').get(id) as AIInteraction }
}

export class CharacterDAO {
  private db: Database.Database; constructor() { this.db = getDatabase() }
  getAllByProject(pId: number): Character[] { return this.db.prepare('SELECT * FROM characters WHERE project_id = ? ORDER BY created_at').all(pId) as Character[] }
  create(c: any): Character { const res = this.db.prepare('INSERT INTO characters (project_id, name, personality, background, relationships, avatar_url) VALUES (?, ?, ?, ?, ?, ?)').run(c.project_id, c.name, c.personality || null, c.background || null, c.relationships || null, c.avatar_url || null); return this.db.prepare('SELECT * FROM characters WHERE id = ?').get(res.lastInsertRowid) as Character }
  getById(id: number): Character | undefined { return this.db.prepare('SELECT * FROM characters WHERE id = ?').get(id) as Character }
  update(id: number, updates: any): Character | undefined { const fields = Object.keys(updates).map(k => `${k} = ?`).join(', '); this.db.prepare(`UPDATE characters SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...Object.values(updates), id); return this.getById(id) }
  delete(id: number): boolean { return this.db.prepare('DELETE FROM characters WHERE id = ?').run(id).changes > 0 }
}

export class OutlineDAO {
  private db: Database.Database; constructor(db?: Database.Database) { this.db = db || getDatabase() }
  getAllByProject(pId: number): Outline[] { return this.db.prepare('SELECT * FROM outlines WHERE project_id = ? ORDER BY sequence, created_at').all(pId) as Outline[] }
  create(o: any): Outline { const res = this.db.prepare('INSERT INTO outlines (project_id, type, title, content, sequence, parent_id, storyline_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(o.project_id, o.type, o.title, o.content || null, o.sequence, o.parent_id || null, o.storyline_id || null); return this.db.prepare('SELECT * FROM outlines WHERE id = ?').get(res.lastInsertRowid) as Outline }
  getById(id: number): Outline | undefined { return this.db.prepare('SELECT * FROM outlines WHERE id = ?').get(id) as Outline }
  update(id: number, updates: any): Outline | undefined { const fields = Object.keys(updates).map(k => `${k} = ?`).join(', '); this.db.prepare(`UPDATE outlines SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...Object.values(updates), id); return this.getById(id) }
  reorder(items: any[]): void { const stmt = this.db.prepare('UPDATE outlines SET sequence = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'); this.db.transaction((list) => { for (const i of list) stmt.run(i.sequence, i.id) })(items) }
  delete(id: number): boolean { return this.db.prepare('DELETE FROM outlines WHERE id = ?').run(id).changes > 0 }
}

export class StorylineDAO {
  private db: Database.Database; constructor(db?: Database.Database) { this.db = db || getDatabase() }
  getAllByProject(pId: number): Storyline[] { return this.db.prepare('SELECT * FROM storylines WHERE project_id = ? ORDER BY position, created_at').all(pId) as Storyline[] }
  create(s: any): Storyline { const res = this.db.prepare('INSERT INTO storylines (project_id, name, color, position, description) VALUES (?, ?, ?, ?, ?)').run(s.project_id, s.name, s.color || '#4f46e5', s.position, s.description || null); return this.db.prepare('SELECT * FROM storylines WHERE id = ?').get(res.lastInsertRowid) as Storyline }
  getById(id: number): Storyline | undefined { return this.db.prepare('SELECT * FROM storylines WHERE id = ?').get(id) as Storyline }
  update(id: number, updates: any): Storyline | undefined { const fields = Object.keys(updates).map(k => `${k} = ?`).join(', '); this.db.prepare(`UPDATE storylines SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...Object.values(updates), id); return this.getById(id) }
  delete(id: number): boolean { return this.db.prepare('DELETE FROM storylines WHERE id = ?').run(id).changes > 0 }
}

export class WorldSettingDAO {
  private db: Database.Database; constructor() { this.db = getDatabase() }
  getAllByProject(pId: number): WorldSetting[] { return this.db.prepare('SELECT * FROM world_settings WHERE project_id = ? ORDER BY category, created_at').all(pId) as WorldSetting[] }
  create(s: any): WorldSetting { const res = this.db.prepare('INSERT INTO world_settings (project_id, category, title, content) VALUES (?, ?, ?, ?)').run(s.project_id, s.category, s.title, s.content || null); return this.db.prepare('SELECT * FROM world_settings WHERE id = ?').get(res.lastInsertRowid) as WorldSetting }
  getById(id: number): WorldSetting | undefined { return this.db.prepare('SELECT * FROM world_settings WHERE id = ?').get(id) as WorldSetting }
  update(id: number, updates: any): WorldSetting | undefined { const fields = Object.keys(updates).map(k => `${k} = ?`).join(', '); this.db.prepare(`UPDATE world_settings SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...Object.values(updates), id); return this.getById(id) }
  delete(id: number): boolean { return this.db.prepare('DELETE FROM world_settings WHERE id = ?').run(id).changes > 0 }
}

export class StatsDAO {
  private db: Database.Database; constructor() { this.db = getDatabase() }
  logChange(pId: number, delta: number): void { if (delta === 0) return; const today = new Date().toISOString().split('T')[0]; this.db.prepare('INSERT INTO daily_stats (project_id, date, word_count_change, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(project_id, date) DO UPDATE SET word_count_change = word_count_change + ?, updated_at = CURRENT_TIMESTAMP').run(pId, today, delta, delta) }
  logAIUsage(pId: number): void { const today = new Date().toISOString().split('T')[0]; this.db.prepare('INSERT INTO daily_stats (project_id, date, ai_usage_count, updated_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP) ON CONFLICT(project_id, date) DO UPDATE SET ai_usage_count = ai_usage_count + 1, updated_at = CURRENT_TIMESTAMP').run(pId, today) }
  getAll(pId: number): any[] { return this.db.prepare('SELECT * FROM daily_stats WHERE project_id = ? ORDER BY date ASC').all(pId) }
  getTodayCount(pId: number): number { const today = new Date().toISOString().split('T')[0]; const res = this.db.prepare('SELECT word_count_change FROM daily_stats WHERE project_id = ? AND date = ?').get(pId, today) as any; return res ? res.word_count_change : 0 }
}

export class AIPersonaDAO {
  private db: Database.Database; constructor() { this.db = getDatabase(); this.init() }
  init() { if ((this.db.prepare('SELECT COUNT(*) as count FROM ai_personas').get() as any).count > 0) return; const defaults = [{ n: '通用', d: '标准助手', s: '你是一位专业的小说创作助手。' }]; const stmt = this.db.prepare('INSERT INTO ai_personas (name, description, system_prompt) VALUES (?, ?, ?)'); defaults.forEach(p => stmt.run(p.n, p.d, p.s)) }
  getAll(): any[] { return this.db.prepare('SELECT * FROM ai_personas').all().map((r:any) => ({ ...r, is_active: !!r.is_active })) }
  create(p: any): any { const res = this.db.prepare('INSERT INTO ai_personas (name, description, system_prompt) VALUES (?, ?, ?)').run(p.name, p.description || null, p.system_prompt); return this.getById(res.lastInsertRowid as number) }
  getById(id: number): any { const res = this.db.prepare('SELECT * FROM ai_personas WHERE id = ?').get(id) as any; return res ? { ...res, is_active: !!res.is_active } : null }
  update(id: number, u: any): any { const fields = Object.keys(u).map(k => `${k} = ?`).join(', '); this.db.prepare(`UPDATE ai_personas SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...Object.values(u), id); return this.getById(id) }
  delete(id: number): boolean { return this.db.prepare('DELETE FROM ai_personas WHERE id = ?').run(id).changes > 0 }
}

export class PromptTemplateDAO {
  private db: Database.Database; constructor() { this.db = getDatabase(); this.init() }
  init() { 
    const defaults = [
      { n: '通用扩写', d: '基础扩写模式，保留原意进行润色和延展。', c: 'general', t: '请扩写以下内容，使其描写更生动，细节更丰富：\n\n{{selection}}' },
      { n: '感官描写', d: '通过五感（视听嗅味触）强化环境或场景的沉浸感。', c: 'description', t: '请重写以下段落，着重加强【{{sense}}】方面的感官描写：\n\n{{selection}}' },
      { n: '情感渲染', d: '侧重于人物内心活动和情绪氛围的渲染。', c: 'emotion', t: '请改写这段文字，重点体现角色【{{emotion}}】的情绪，多用侧面描写：\n\n{{selection}}' },
      { n: '动作场面', d: '优化打斗或动作戏的节奏感与画面感。', c: 'action', t: '请优化这段动作描写，使其节奏更【{{pace}}】，动作更连贯：\n\n{{selection}}' },
      { n: '对话优化', d: '让对话更符合角色性格，减少书面语。', c: 'dialogue', t: '请润色这段对话，使其听起来更自然，符合【{{character_tone}}】的说话风格：\n\n{{selection}}' },
      { n: '深层含义', d: '为现有情节增加潜台词或象征意义。', c: 'polish', t: '请为这段情节增加一层【{{symbolism}}】的象征意义，不要太直白：\n\n{{selection}}' },
      { n: '风格转换', d: '将文风转换为指定的风格（如古风、赛博朋克等）。', c: 'style', t: '请将以下文本改写为【{{style}}】风格：\n\n{{selection}}' },
      { n: '情节反转', d: '为当前段落设计一个出人意料的转折。', c: 'plot', t: '请基于这段内容，设计一个【{{twist_type}}】类型的情节反转，打破读者的预期：\n\n{{selection}}' },
      { n: '角色成长', d: '体现角色在当前事件中的心理变化或成长。', c: 'character', t: '请改写这段经历，突出主角在面对【{{challenge}}】时的心理变化和成长轨迹：\n\n{{selection}}' },
      { n: '世界观植入', d: '在叙事中自然地植入世界观设定。', c: 'world', t: '请在保留剧情的同时，自然地植入关于【{{setting_element}}】的世界观细节，不要生硬堆砌：\n\n{{selection}}' },
      { n: '氛围营造', d: '通过环境描写烘托特定的氛围（恐怖、温馨等）。', c: 'atmosphere', t: '请重写场景描写，全力烘托出【{{atmosphere}}】的氛围，让读者身临其境：\n\n{{selection}}' }
    ]; 
    const stmt = this.db.prepare(`
      INSERT INTO prompt_templates (name, description, category, content, is_built_in) 
      SELECT ?, ?, ?, ?, 1 
      WHERE NOT EXISTS (SELECT 1 FROM prompt_templates WHERE name = ?)
    `); 
    defaults.forEach(p => stmt.run(p.n, p.d, p.c, p.t, p.n)) 
  }
  getAll(): any[] { return this.db.prepare('SELECT * FROM prompt_templates').all().map((r:any) => ({ ...r, is_built_in: !!r.is_built_in })) }
  create(t: any): any { const res = this.db.prepare('INSERT INTO prompt_templates (name, description, content, category) VALUES (?, ?, ?, ?)').run(t.name, t.description || null, t.content, t.category); return this.getById(res.lastInsertRowid as number) }
  getById(id: number): any { const res = this.db.prepare('SELECT * FROM prompt_templates WHERE id = ?').get(id) as any; return res ? { ...res, is_built_in: !!res.is_built_in } : null }
  update(id: number, u: any): any { const fields = Object.keys(u).map(k => `${k} = ?`).join(', '); this.db.prepare(`UPDATE prompt_templates SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...Object.values(u), id); return this.getById(id) }
  delete(id: number): boolean { return this.db.prepare('DELETE FROM prompt_templates WHERE id = ? AND is_built_in = 0').run(id).changes > 0 }
}

export const projectDAO = new ProjectDAO()
export const statsDAO = new StatsDAO()
export const chapterDAO = new ChapterDAO()
export const chapterVersionDAO = new ChapterVersionDAO()
export const aiInteractionDAO = new AIInteractionDAO()
export const characterDAO = new CharacterDAO()
export const outlineDAO = new OutlineDAO()
export const storylineDAO = new StorylineDAO()
export const worldSettingDAO = new WorldSettingDAO()
export const aiPersonaDAO = new AIPersonaDAO()
export const promptTemplateDAO = new PromptTemplateDAO()
export const sceneDAO = new SceneDAO()
