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
export function initDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance
  }

  const dbPath = getDatabasePath()
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `)

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

  // 创建索引以提高查询性能
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_chapters_project ON chapters(project_id);
    CREATE INDEX IF NOT EXISTS idx_ai_interactions_chapter ON ai_interactions(chapter_id);
  `)

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
