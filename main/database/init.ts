import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

const DB_NAME = 'novel-writer.db'
let dbInstance: Database.Database | null = null

/**
 * 获取数据库路径
 */
export function getDatabasePath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, DB_NAME)
}

/**
 * 初始化数据库连接
 */
export function initDatabase(customPath?: string): Database.Database {
  if (dbInstance && !customPath) {
    return dbInstance
  }

  // 如果提供了自定义路径（如测试用的 :memory:），则创建新实例
  // 注意：如果已存在实例但提供了新路径，我们不会覆盖单例，除非我们需要支持切换 DB
  // 为了测试，我们允许直接返回新实例而不缓存它，或者我们需要重置单例
  
  const dbPath = customPath || getDatabasePath()
  const db = new Database(dbPath)

  // 启用外键约束
  db.pragma('foreign_keys = ON')

  // 创建项目表
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      author TEXT,
      genre TEXT,
      description TEXT,
      target_words INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 创建章节表
  db.exec(`
    CREATE TABLE IF NOT EXISTS chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      chapter_number INTEGER NOT NULL,
      word_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft',
      summary TEXT,
      deleted_at DATETIME, -- 201-300 轮：回收站支持
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `)

  // 创建场景表 (第 231 轮)
  db.exec(`
    CREATE TABLE IF NOT EXISTS scenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      summary TEXT,
      sequence INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    )
  `)

  // 创建章节版本表（用于版本历史/撤销）
  db.exec(`
    CREATE TABLE IF NOT EXISTS chapter_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      word_count INTEGER DEFAULT 0,
      summary TEXT,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    )
  `)

  // 尝试为现有表添加 summary 字段 (如果不存在)
  try {
    const tableInfo = db.prepare("PRAGMA table_info(chapters)").all() as any[];
    const hasSummary = tableInfo.some(col => col.name === 'summary');
    if (!hasSummary) {
      db.exec("ALTER TABLE chapters ADD COLUMN summary TEXT");
      console.log('[DB] Added summary column to chapters table');
    }

    // Check for deleted_at column (Recycle Bin support)
    const hasDeletedAt = tableInfo.some(col => col.name === 'deleted_at');
    if (!hasDeletedAt) {
      db.exec("ALTER TABLE chapters ADD COLUMN deleted_at DATETIME");
      console.log('[DB] Added deleted_at column to chapters table');
    }
  } catch (err) {
    console.error('[DB] Failed to check/add columns to chapters:', err);
  }

  // 尝试为 chapter_versions 添加 summary 和 tags 字段
  try {
    const versionTableInfo = db.prepare("PRAGMA table_info(chapter_versions)").all() as any[];
    
    if (!versionTableInfo.some(col => col.name === 'summary')) {
      db.exec("ALTER TABLE chapter_versions ADD COLUMN summary TEXT");
      console.log('[DB] Added summary column to chapter_versions table');
    }

    if (!versionTableInfo.some(col => col.name === 'tags')) {
      db.exec("ALTER TABLE chapter_versions ADD COLUMN tags TEXT");
      console.log('[DB] Added tags column to chapter_versions table');
    }
  } catch (err) {
    console.error('[DB] Failed to check/add columns to chapter_versions:', err);
  }

  // 创建 AI 交互记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_id INTEGER NOT NULL,
      prompt TEXT NOT NULL,
      response TEXT,
      model TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    )
  `)

  // 创建角色表
  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      personality TEXT,
      background TEXT,
      relationships TEXT,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `)

  // 创建大纲表
  db.exec(`
    CREATE TABLE IF NOT EXISTS outlines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      sequence INTEGER NOT NULL DEFAULT 0,
      parent_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES outlines(id) ON DELETE CASCADE
    )
  `)

  // 创建世界观设定表
  db.exec(`
    CREATE TABLE IF NOT EXISTS world_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `)

  // 创建故事线表（用于剧情网格）
  db.exec(`
    CREATE TABLE IF NOT EXISTS storylines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT,
      position INTEGER DEFAULT 0,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `)

  // 创建 AI 人设表
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_personas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      system_prompt TEXT NOT NULL,
      is_active INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 创建 AI 提示词模版表
  db.exec(`
    CREATE TABLE IF NOT EXISTS prompt_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      usage_count INTEGER DEFAULT 0,
      is_built_in INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 尝试为 prompt_templates 添加 description 字段
  try {
    const tableInfo = db.prepare("PRAGMA table_info(prompt_templates)").all() as any[];
    if (!tableInfo.some(col => col.name === 'description')) {
      db.exec("ALTER TABLE prompt_templates ADD COLUMN description TEXT");
      console.log('[DB] Added description column to prompt_templates table');
    }
  } catch (err) {
    console.error('[DB] Failed to add description to prompt_templates:', err);
  }

  // 尝试为 outlines 表添加 storyline_id 字段
  try {
    const tableInfo = db.prepare("PRAGMA table_info(outlines)").all() as any[];
    if (!tableInfo.some(col => col.name === 'storyline_id')) {
      db.exec("ALTER TABLE outlines ADD COLUMN storyline_id INTEGER REFERENCES storylines(id) ON DELETE SET NULL");
      console.log('[DB] Added storyline_id column to outlines table');
    }
  } catch (err) {
    console.error('[DB] Failed to add storyline_id to outlines:', err);
  }

  // 创建每日统计表（用于热力图）
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      date TEXT NOT NULL, -- YYYY-MM-DD
      word_count_change INTEGER DEFAULT 0, -- 当日净增字数
      ai_usage_count INTEGER DEFAULT 0, -- 当日 AI 调用次数
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, date),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `)

  // 尝试为 daily_stats 表添加 ai_usage_count 字段
  try {
    const tableInfo = db.prepare("PRAGMA table_info(daily_stats)").all() as any[];
    if (!tableInfo.some(col => col.name === 'ai_usage_count')) {
      db.exec("ALTER TABLE daily_stats ADD COLUMN ai_usage_count INTEGER DEFAULT 0");
      console.log('[DB] Added ai_usage_count column to daily_stats table');
    }
  } catch (err) {
    console.error('[DB] Failed to add ai_usage_count to daily_stats:', err);
  }

  // 创建索引以提高查询性能
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_chapters_project ON chapters(project_id);
    CREATE INDEX IF NOT EXISTS idx_chapter_versions_chapter_created_at ON chapter_versions(chapter_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_interactions_chapter ON ai_interactions(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_characters_project ON characters(project_id);
    CREATE INDEX IF NOT EXISTS idx_outlines_project ON outlines(project_id);
    CREATE INDEX IF NOT EXISTS idx_world_settings_project ON world_settings(project_id);
  `)

  // 301-400 轮：全文检索支持 (FTS5)
  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS chapter_search USING fts5(
        chapter_id UNINDEXED,
        title,
        content,
        tokenize='unicode61'
      );
    `)
    console.log('[DB] FTS5 search table initialized');
  } catch (err) {
    console.error('[DB] FTS5 not supported, falling back to standard search', err);
  }

  dbInstance = db
  return dbInstance
}

/**
 * 获取数据库实例（单例模式）
 */
export function getDatabase(): Database.Database {
  return initDatabase()
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
