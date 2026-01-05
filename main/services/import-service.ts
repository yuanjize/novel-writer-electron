import fs from 'fs'
import path from 'path'
import mammoth from 'mammoth'

export interface ImportedChapter {
  title: string
  content: string
  word_count: number
}

export interface ImportedProject {
  name: string
  author?: string
  chapters: ImportedChapter[]
}

export class ImportService {
  /**
   * 解析文件
   */
  async parseFile(filePath: string): Promise<ImportedProject> {
    const ext = path.extname(filePath).toLowerCase()
    let rawText = ''

    if (ext === '.docx') {
      const buffer = fs.readFileSync(filePath)
      const result = await mammoth.extractRawText({ buffer })
      rawText = result.value
    } else if (ext === '.txt') {
      rawText = fs.readFileSync(filePath, 'utf-8')
    } else {
      throw new Error('不支持的文件格式')
    }

    return this.processText(rawText, path.basename(filePath, ext))
  }

  /**
   * 处理文本，智能分章
   */
  private processText(text: string, filename: string): ImportedProject {
    const lines = text.split(/\r?\n/)
    const chapters: ImportedChapter[] = []
    
    // 正则匹配：第x章 标题
    // 支持：第1章、第一章、第一卷、Volume 1、Chapter 1
    // 稍微宽松一点的正则
    const chapterRegex = /^\s*(?:第[0-9零一二三四五六七八九十百千]+[章卷部]|Chapter\s*\d+|Volume\s*\d+)\s*(.*)/i

    let currentChapter: ImportedChapter = {
      title: '序章 / 前言',
      content: '',
      word_count: 0
    }
    
    let isPreamble = true

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) {
        if (currentChapter.content) currentChapter.content += '\n'
        continue
      }

      const match = trimmed.match(chapterRegex)
      if (match) {
        // 发现新章节
        // 保存上一章 (如果内容不为空)
        if (currentChapter.content.trim()) {
          currentChapter.word_count = currentChapter.content.length
          chapters.push(currentChapter)
        }

        // 开启新章
        currentChapter = {
          title: trimmed, // 使用整行作为标题，或者 match[1] 作为副标题
          content: '',
          word_count: 0
        }
        isPreamble = false
      } else {
        // 正文
        currentChapter.content += line + '\n'
      }
    }

    // 保存最后一章
    if (currentChapter.content.trim()) {
      currentChapter.word_count = currentChapter.content.length
      chapters.push(currentChapter)
    }

    // 如果只有序章且没有内容，或者 chapters 为空
    if (chapters.length === 0) {
      chapters.push({
        title: '正文',
        content: text,
        word_count: text.length
      })
    }

    // 如果第一章是序章且没内容（因为被立即识别的第一章顶掉了），过滤掉
    if (chapters.length > 0 && chapters[0].title === '序章 / 前言' && !chapters[0].content.trim()) {
      chapters.shift()
    }

    // 如果只剩下一个章节，且叫 "序章 / 前言"，说明没识别出分章，改名为 "正文"
    if (chapters.length === 1 && chapters[0].title === '序章 / 前言') {
      chapters[0].title = '正文'
    }

    return {
      name: filename,
      chapters
    }
  }
}

export const importService = new ImportService()
