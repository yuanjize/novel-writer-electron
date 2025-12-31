import { createWithEqualityFn } from 'zustand/traditional'
import type { Project, Chapter } from '../types'

interface AppState {
  // 项目相关状态
  projects: Project[]
  currentProject: Project | null
  error: string | null

  // 章节相关状态
  chapters: Chapter[]
  currentChapter: Chapter | null

  // Actions - 项目
  setProjects: (projects: Project[]) => void
  setCurrentProject: (project: Project | null) => void
  setError: (error: string | null) => void
  addProject: (project: Project) => void
  updateProject: (project: Project) => void
  removeProject: (id: number) => void

  // Actions - 章节
  setChapters: (chapters: Chapter[]) => void
  setCurrentChapter: (chapter: Chapter | null) => void
  addChapter: (chapter: Chapter) => void
  updateChapter: (chapter: Chapter) => void
  removeChapter: (id: number) => void
}

export const useAppStore = createWithEqualityFn<AppState>((set) => ({
  // 初始状态
  projects: [],
  currentProject: null,
  error: null,
  chapters: [],
  currentChapter: null,

  // 项目 Actions
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setError: (error) => set({ error }),
  addProject: (project) => set((state) => ({ projects: [project, ...state.projects] })),
  updateProject: (project) =>
    set((state) => ({
      projects: state.projects.map((p) => (p.id === project.id ? project : p)),
      currentProject: state.currentProject?.id === project.id ? project : state.currentProject
    })),
  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject
    })),

  // 章节 Actions
  setChapters: (chapters) => set({ chapters }),
  setCurrentChapter: (chapter) => set({ currentChapter: chapter }),
  addChapter: (chapter) => set((state) => ({ chapters: [...state.chapters, chapter] })),
  updateChapter: (chapter) =>
    set((state) => ({
      chapters: state.chapters.map((c) => (c.id === chapter.id ? chapter : c)),
      currentChapter: state.currentChapter?.id === chapter.id ? chapter : state.currentChapter
    })),
  removeChapter: (id) =>
    set((state) => ({
      chapters: state.chapters.filter((c) => c.id !== id),
      currentChapter: state.currentChapter?.id === id ? null : state.currentChapter
    }))
}))
