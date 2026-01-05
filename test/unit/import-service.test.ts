import { describe, it, expect, vi, beforeEach } from 'vitest'
import { importService } from '../../main/services/import-service'
import fs from 'fs'
import mammoth from 'mammoth'

vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn()
  },
  readFileSync: vi.fn()
}))

vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn()
  },
  extractRawText: vi.fn()
}))

describe('ImportService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should parse TXT file correctly', async () => {
    const mockContent = `
序章
这是序章的内容。

第一章 开始
这是第一章的内容。

第2章 发展
这是第二章的内容。
    `
    vi.mocked(fs.readFileSync).mockReturnValue(mockContent)

    const result = await importService.parseFile('test.txt')

    expect(result.name).toBe('test')
    expect(result.chapters).toHaveLength(3)
    
    expect(result.chapters[0].title).toContain('序章')
    expect(result.chapters[0].content).toContain('这是序章的内容')
    
    expect(result.chapters[1].title).toContain('第一章 开始')
    expect(result.chapters[1].content).toContain('这是第一章的内容')

    expect(result.chapters[2].title).toContain('第2章 发展')
  })

  it('should parse DOCX file correctly', async () => {
    const mockText = '第一章 标题\n内容1\n内容2\n第二章 标题2\n内容3'
    vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('fake-docx'))
    vi.mocked(mammoth.extractRawText).mockResolvedValue({ value: mockText, messages: [] })

    const result = await importService.parseFile('test.docx')

    expect(result.name).toBe('test')
    expect(result.chapters).toHaveLength(2)
    expect(result.chapters[0].title).toBe('第一章 标题')
    expect(result.chapters[0].content).toContain('内容1\n内容2')
  })

  it('should handle file with no chapters (only content)', async () => {
    const mockContent = '这是一个没有分章的短篇故事。'
    vi.mocked(fs.readFileSync).mockReturnValue(mockContent)

    const result = await importService.parseFile('short.txt')

    expect(result.chapters).toHaveLength(1)
    expect(result.chapters[0].title).toBe('正文')
    expect(result.chapters[0].content.trim()).toBe(mockContent)
  })
})
