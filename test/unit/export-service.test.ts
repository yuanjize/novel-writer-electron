import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportService } from '../../main/services/export-service'
import { projectDAO, outlineDAO } from '../../main/database/dao'

// Mock DAOs
vi.mock('../../main/database/dao', () => ({
  projectDAO: {
    getById: vi.fn(),
    getChapters: vi.fn()
  },
  outlineDAO: {
    getAllByProject: vi.fn()
  }
}))

// Mock crypto for deterministic UUIDs in EPUB generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => '00000000-0000-0000-0000-000000000000'
  }
})

describe('ExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProject = {
    id: 1,
    name: 'Test Novel',
    author: 'Tester',
    genre: 'Fantasy',
    description: 'Desc',
    target_words: 1000,
    created_at: '2023-01-01',
    updated_at: '2023-01-01'
  }

  const mockChapters = [
    { id: 1, project_id: 1, chapter_number: 1, title: 'Chapter One', content: 'Line 1.\n\nLine 2.', word_count: 100, status: 'draft' },
    { id: 2, project_id: 1, chapter_number: 2, title: 'Chapter Two', content: 'End.', word_count: 50, status: 'draft' }
  ]

  it('should generate TXT preview with correct formatting', async () => {
    vi.mocked(projectDAO.getById).mockReturnValue(mockProject as any)
    vi.mocked(projectDAO.getChapters).mockReturnValue(mockChapters as any)
    vi.mocked(outlineDAO.getAllByProject).mockReturnValue([])

    const result = await exportService.preview(1, 'txt')

    expect(result.suggestedName).toBe('Test Novel.txt')
    // Check HTML content
    expect(result.html).toContain('Test Novel')
    expect(result.html).toContain('Chapter One')
    // Check if cleaning lines works (default options clean blank lines)
    // The content 'Line 1.\n\nLine 2.' should become 'Line 1.\nLine 2.' in preview text roughly
    // Actually preview returns HTML wrapped in <pre>
    expect(result.html).toContain('Line 1.')
    expect(result.html).toContain('Line 2.')
  })

  it('should structure content based on outlines', async () => {
    vi.mocked(projectDAO.getById).mockReturnValue(mockProject as any)
    vi.mocked(projectDAO.getChapters).mockReturnValue(mockChapters as any)
    
    // Simulate an outline where Chapter 1 is in Volume 1, Chapter 2 is in Volume 2
    const mockOutlines = [
      { type: 'volume', title: 'Vol 1', sequence: 1 },
      { type: 'chapter', title: 'Chapter One', sequence: 2 }, // Matches by title
      { type: 'volume', title: 'Vol 2', sequence: 3 },
      { type: 'chapter', title: 'Chapter Two', sequence: 4 }
    ]
    vi.mocked(outlineDAO.getAllByProject).mockReturnValue(mockOutlines as any)

    const result = await exportService.preview(1, 'txt')
    
    expect(result.html).toContain('Vol 1')
    expect(result.html).toContain('Vol 2')
  })

  it('should export TXT buffer correctly', async () => {
    vi.mocked(projectDAO.getById).mockReturnValue(mockProject as any)
    vi.mocked(projectDAO.getChapters).mockReturnValue(mockChapters as any)
    vi.mocked(outlineDAO.getAllByProject).mockReturnValue([])

    const result = await exportService.exportProject(1, 'txt')
    
    expect(result.suggestedName).toBe('Test Novel.txt')
    const content = result.buffer.toString('utf8')
    
    // Check BOM
    expect(content.startsWith('\uFEFF')).toBe(true)
    expect(content).toContain('《Test Novel》')
    expect(content).toContain('作者：Tester')
    expect(content).toContain('第1章 Chapter One')
  })
})
