import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Statistics from '../../src/pages/Statistics'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// Mock hooks
const mockGetStats = vi.fn()

vi.mock('../../src/hooks/useElectronIPC', () => ({
  useElectronIPC: () => ({
    getStats: mockGetStats
  })
}))

// Mock Antd charts or components if needed? 
// Statistics uses simple divs for heatmap, so it should render fine with jsdom.

describe('Statistics Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    mockGetStats.mockReturnValue(new Promise(() => {})) // Pending promise
    render(
      <MemoryRouter initialEntries={['/project/1/statistics']}>
        <Routes>
          <Route path="/project/:projectId/statistics" element={<Statistics />} />
        </Routes>
      </MemoryRouter>
    )
    // Antd Spin might not have text, but we can check for class or structure
    // Or just wait.
    // Actually, Statistics component has: 
    // if (loading) return <Spin size="large" />
    // We can query by .ant-spin
    const spin = document.querySelector('.ant-spin')
    expect(spin).toBeInTheDocument()
  })

  it('renders stats when data loads', async () => {
    mockGetStats.mockResolvedValue({
      history: [
        { date: new Date().toISOString().split('T')[0], word_count_change: 500 }
      ],
      today: 500
    })

    render(
      <MemoryRouter initialEntries={['/project/1/statistics']}>
        <Routes>
          <Route path="/project/:projectId/statistics" element={<Statistics />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('今日码字')).toBeInTheDocument()
    })

    const counts = screen.getAllByText('500')
    expect(counts.length).toBeGreaterThan(0) // Should have at least one
    expect(screen.getByText('创作数据中心')).toBeInTheDocument()
  })

  it('renders empty state when no data', async () => {
    mockGetStats.mockResolvedValue({
      history: [],
      today: 0
    })

    render(
      <MemoryRouter initialEntries={['/project/1/statistics']}>
        <Routes>
          <Route path="/project/:projectId/statistics" element={<Statistics />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('加油！开始写作后这里会有数据。')).toBeInTheDocument()
    })
  })
})
