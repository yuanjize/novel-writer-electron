import Database from 'better-sqlite3'
import { getDatabase } from './init'

// ============= 类型定义 =============

export interface Project {
  id: number
  name: string
  author?: string
  genre?: string
  description?: string
  target_words: number
  created_at: string
  updated_at: string
}

export interface Chapter {
  id: number
  project_id: number
  title: string
  content?: string
  chapter_number: number
  word_count: number
  status: 'draft' | 'in_progress' | 'completed'
  created_at: string
  updated_at: string
}

export interface AIInteraction {
  id: number
  chapter_id: number
  prompt: string
  response?: string
  model?: string
  created_at: string
}

// ============= Project DAO =============

export class ProjectDAO {
  private db: Database.Database

  constructor() {
    this.db = getDatabase()
  }

  /**
   * 创建新项目
   */
  create(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Project {
    const stmt = this.db.prepare(`
      INSERT INTO projects (name, author, genre, description, target_words)
      VALUES (?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      project.name,
      project.author || null,
      project.genre || null,
      project.description || null,
      project.target_words
    )

    return this.getById(result.lastInsertRowid as number)!
  }

  /**
   * 根据 ID 获取项目
   */
  getById(id: number): Project | undefined {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?')
    return stmt.get(id) as Project | undefined
  }

  /**
   * 获取所有项目
   */
  getAll(): Project[] {
    const stmt = this.db.prepare('SELECT * FROM projects ORDER BY updated_at DESC')
    return stmt.all() as Project[]
  }

  /**
   * 更新项目
   */
  update(id: number, updates: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>): Project | undefined {
    const fields: string[] = []
    const values: any[] = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.author !== undefined) {
      fields.push('author = ?')
      values.push(updates.author)
    }
    if (updates.genre !== undefined) {
      fields.push('genre = ?')
      values.push(updates.genre)
    }
    if (updates.description !== undefined) {
      fields.push('description = ?')
      values.push(updates.description)
    }
    if (updates.target_words !== undefined) {
      fields.push('target_words = ?')
      values.push(updates.target_words)
    }

    if (fields.length === 0) return this.getById(id)

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = this.db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`)
    stmt.run(...values)

    return this.getById(id)
  }

  /**
   * 删除项目
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  /**
   * 获取项目的章节列表
   */
  getChapters(projectId: number): Chapter[] {
    const stmt = this.db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY chapter_number')
    return stmt.all(projectId) as Chapter[]
  }
}

// ============= Chapter DAO =============

export class ChapterDAO {
  private db: Database.Database

  constructor() {
    this.db = getDatabase()
  }

  /**
   * 创建新章节
   */
  create(chapter: Omit<Chapter, 'id' | 'created_at' | 'updated_at'>): Chapter {
    const stmt = this.db.prepare(`
      INSERT INTO chapters (project_id, title, content, chapter_number, word_count, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      chapter.project_id,
      chapter.title,
      chapter.content || null,
      chapter.chapter_number,
      chapter.word_count,
      chapter.status
    )

    return this.getById(result.lastInsertRowid as number)!
  }

  /**
   * 根据 ID 获取章节
   */
  getById(id: number): Chapter | undefined {
    const stmt = this.db.prepare('SELECT * FROM chapters WHERE id = ?')
    return stmt.get(id) as Chapter | undefined
  }

  /**
   * 更新章节
   */
  update(id: number, updates: Partial<Omit<Chapter, 'id' | 'created_at' | 'updated_at' | 'project_id'>>): Chapter | undefined {
    const fields: string[] = []
    const values: any[] = []

    if (updates.title !== undefined) {
      fields.push('title = ?')
      values.push(updates.title)
    }
    if (updates.content !== undefined) {
      fields.push('content = ?')
      values.push(updates.content)
      // 自动计算字数
      fields.push('word_count = ?')
      values.push(updates.content.length)
    }
    if (updates.chapter_number !== undefined) {
      fields.push('chapter_number = ?')
      values.push(updates.chapter_number)
    }
    if (updates.status !== undefined) {
      fields.push('status = ?')
      values.push(updates.status)
    }

    if (fields.length === 0) return this.getById(id)

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = this.db.prepare(`UPDATE chapters SET ${fields.join(', ')} WHERE id = ?`)
    stmt.run(...values)

    return this.getById(id)
  }

  /**
   * 删除章节
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM chapters WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }
}

// ============= AI Interaction DAO =============

export class AIInteractionDAO {
  private db: Database.Database

  constructor() {
    this.db = getDatabase()
  }

  /**
   * 记录 AI 交互
   */
  create(interaction: Omit<AIInteraction, 'id' | 'created_at'>): AIInteraction {
    const stmt = this.db.prepare(`
      INSERT INTO ai_interactions (chapter_id, prompt, response, model)
      VALUES (?, ?, ?, ?)
    `)

    const result = stmt.run(
      interaction.chapter_id,
      interaction.prompt,
      interaction.response || null,
      interaction.model || null
    )

    return this.getById(result.lastInsertRowid as number)!
  }

  /**
   * 获取章节的 AI 交互历史
   */
  getByChapterId(chapterId: number): AIInteraction[] {
    const stmt = this.db.prepare('SELECT * FROM ai_interactions WHERE chapter_id = ? ORDER BY created_at DESC')
    return stmt.all(chapterId) as AIInteraction[]
  }

  /**
   * 根据 ID 获取交互记录
   */
  getById(id: number): AIInteraction | undefined {
    const stmt = this.db.prepare('SELECT * FROM ai_interactions WHERE id = ?')
    return stmt.get(id) as AIInteraction | undefined
  }
}

// 导出单例实例
export const projectDAO = new ProjectDAO()
export const chapterDAO = new ChapterDAO()
export const aiInteractionDAO = new AIInteractionDAO()
