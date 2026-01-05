import { createWithEqualityFn } from 'zustand/traditional'
import type { Project, Chapter } from '../types'

interface AppState {
  error: string | null

  projects: Project[]
  chapters: Chapter[]

  currentProject: Project | null
  currentChapter: Chapter | null
  openChapters: Chapter[] // 700 轮优化：支持多标签页

  setError: (error: string | null) => void
  setProjects: (projects: Project[]) => void
  removeProject: (projectId: number) => void
  setChapters: (chapters: Chapter[]) => void
  setCurrentProject: (project: Project | null) => void
  setCurrentChapter: (chapter: Chapter | null) => void
  addOpenChapter: (chapter: Chapter) => void
  closeChapter: (chapterId: number) => void
}

export const useAppStore = createWithEqualityFn<AppState>((set) => ({
  error: null,

  projects: [],
  chapters: [],

  currentProject: null,
  currentChapter: null,
  openChapters: [],

  setError: (error) => set({ error }),
  setProjects: (projects) => set({ projects }),
  removeProject: (projectId) => set((state) => ({ projects: state.projects.filter((p) => p.id !== projectId) })),
  setChapters: (chapters) => set({ chapters }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setCurrentChapter: (chapter) => set({ currentChapter: chapter }),
  addOpenChapter: (chapter) => set((state) => ({
    openChapters: state.openChapters.find(c => c.id === chapter.id) 
      ? state.openChapters 
      : [...state.openChapters, chapter]
  })),
  closeChapter: (chapterId) => set((state) => ({
    openChapters: state.openChapters.filter(c => c.id !== chapterId)
  }))
}))
