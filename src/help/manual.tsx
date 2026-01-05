import type { ReactNode } from 'react'

export type HelpTopicId =
  | 'chapter.save'
  | 'chapter.versions'
  | 'chapter.snapshot'
  | 'chapter.findReplace'
  | 'chapter.localSearch'
  | 'chapter.globalSearch'
  | 'chapter.aiSettings'
  | 'chapter.tts'
  | 'chapter.sidebar'
  | 'chapter.zen'
  | 'chapter.mention'
  | 'chapter.help'
  | 'ai.continue'
  | 'ai.improve'
  | 'ai.suggest'
  | 'ai.expand'
  | 'ai.rewrite'
  | 'ai.title'
  | 'ai.promptPanel'
  | 'ai.logicCheck'
  | 'export.smart'
  | 'project.import'
  | 'project.create'
  | 'project.guide'

export interface HelpTopic {
  id: HelpTopicId
  title: string
  summary?: string
  content: ReactNode
  keywords?: string[]
  group: '章节编辑' | 'AI 写作' | '项目管理' | '导出' | '写作技巧'
}

export const helpTopics: HelpTopic[] = [
  {
    id: 'chapter.save',
    group: '章节编辑',
    title: '保存',
    summary: '手动保存（Cmd/Ctrl + S）',
    keywords: ['保存', '快捷键'],
    content: (
      <div style={{ lineHeight: 1.8 }}>
        <div>快捷键：Cmd/Ctrl + S。</div>
        <div>若启用快照规则，保存时会自动生成历史版本（便于回滚）。</div>
      </div>
    )
  },
  {
    id: 'chapter.versions',
    group: '章节编辑',
    title: '版本历史（Time Machine）',
    summary: '按时间轴查看并一键回滚',
    keywords: ['版本', '回滚', '历史'],
    content: (
      <div style={{ lineHeight: 1.8 }}>
        <div>当文本变化超过阈值时会自动生成快照版本。</div>
        <div>可在历史面板选择任一版本回滚，并支持 AI 差异分析。</div>
      </div>
    )
  },
  {
    id: 'chapter.snapshot',
    group: '章节编辑',
    title: '手动快照',
    summary: '关键修改前手动留档',
    keywords: ['快照', '存档'],
    content: <div style={{ lineHeight: 1.8 }}>重大改动前点一次，避免“后悔”。</div>
  },
  {
    id: 'chapter.findReplace',
    group: '章节编辑',
    title: '查找 / 替换',
    summary: '在当前章节内搜索与替换',
    keywords: ['查找', '替换'],
    content: <div style={{ lineHeight: 1.8 }}>快捷键：Cmd/Ctrl + F。</div>
  },
  {
    id: 'chapter.localSearch',
    group: '章节编辑',
    title: '本章搜索栏',
    summary: '在当前章节内快速定位',
    keywords: ['本章', '搜索'],
    content: <div style={{ lineHeight: 1.8 }}>支持逐条跳转和替换。</div>
  },
  {
    id: 'chapter.globalSearch',
    group: '章节编辑',
    title: '全书搜索',
    summary: '在项目内全文检索',
    keywords: ['全书', '搜索', 'FTS'],
    content: <div style={{ lineHeight: 1.8 }}>支持高亮预览与直接跳转到章节。</div>
  },
  {
    id: 'chapter.aiSettings',
    group: '章节编辑',
    title: 'AI 设置',
    summary: '配置模型、Key 与网关',
    keywords: ['AI', '设置', 'Key', 'Ollama'],
    content: (
      <div style={{ lineHeight: 1.8 }}>
        <div>支持 Anthropic / 网关 与 Ollama 本地模型。</div>
        <div>配置完成后可点击“测试连接”验证可用性。</div>
      </div>
    )
  },
  {
    id: 'chapter.tts',
    group: '章节编辑',
    title: '朗读/播报',
    summary: '用语音检查节奏与语病',
    keywords: ['朗读', 'TTS'],
    content: <div style={{ lineHeight: 1.8 }}>适合检查语感、节奏与错别字。</div>
  },
  {
    id: 'chapter.sidebar',
    group: '章节编辑',
    title: '右侧栏（资料/分析/AI）',
    summary: '素材、分析与 AI 面板',
    keywords: ['侧栏', '资料', '分析', 'AI'],
    content: (
      <div style={{ lineHeight: 1.8 }}>
        <div>资料：角色/设定等内容一览。</div>
        <div>分析：情绪、结构等分析结果。</div>
        <div>AI：写作技能库与聊天面板。</div>
      </div>
    )
  },
  {
    id: 'chapter.zen',
    group: '章节编辑',
    title: '禅模式（全屏写作）',
    summary: '隐藏干扰，专注写作',
    keywords: ['禅模式', '全屏'],
    content: <div style={{ lineHeight: 1.8 }}>进入后隐藏侧栏与工具区，沉浸写作。</div>
  },
  {
    id: 'chapter.mention',
    group: '章节编辑',
    title: '@ 插入角色引用',
    summary: '输入 @ 选择角色快速插入',
    keywords: ['@', '角色', '引用'],
    content: <div style={{ lineHeight: 1.8 }}>在编辑器输入 @，选择角色即可插入名称。</div>
  },
  {
    id: 'chapter.help',
    group: '章节编辑',
    title: '说明书入口',
    summary: '随时查功能与快捷键',
    keywords: ['说明书', '帮助'],
    content: <div style={{ lineHeight: 1.8 }}>顶部“？”按钮可打开说明书。</div>
  },
  {
    id: 'ai.continue',
    group: 'AI 写作',
    title: 'AI 续写',
    summary: '基于当前内容继续写 200~500 字',
    keywords: ['续写', 'AI'],
    content: (
      <div style={{ lineHeight: 1.8 }}>
        <div>会使用当前章节内容与前情摘要作为上下文。</div>
        <div>写得越具体（场景/人物/冲突），续写越稳定。</div>
      </div>
    )
  },
  {
    id: 'ai.improve',
    group: 'AI 写作',
    title: 'AI 润色（优化）',
    summary: '轻度/标准/强力润色',
    keywords: ['润色', '优化'],
    content: (
      <div style={{ lineHeight: 1.8 }}>
        <div>先选强度，再点击润色；支持预览后应用。</div>
        <div>强力润色改动较大，建议先预览。</div>
      </div>
    )
  },
  {
    id: 'ai.suggest',
    group: 'AI 写作',
    title: '情节建议',
    summary: '给你 3 个推进方向',
    keywords: ['建议', '剧情', '卡文'],
    content: <div style={{ lineHeight: 1.8 }}>适合卡文或需要转折、悬念时使用。</div>
  },
  {
    id: 'ai.expand',
    group: 'AI 写作',
    title: 'AI 扩写（细纲 → 正文）',
    summary: '把大纲扩写成段落',
    keywords: ['扩写', '细纲'],
    content: (
      <div style={{ lineHeight: 1.8 }}>
        <div>建议用序号列出 3~6 个剧情点（行动+冲突+结果）。</div>
      </div>
    )
  },
  {
    id: 'ai.rewrite',
    group: 'AI 写作',
    title: '角色口吻重写',
    summary: '把选中文本改成角色口吻',
    keywords: ['重写', '角色', '台词'],
    content: <div style={{ lineHeight: 1.8 }}>先选中文本，再选择角色。</div>
  },
  {
    id: 'ai.title',
    group: 'AI 写作',
    title: 'AI 生成标题',
    summary: '基于内容生成章节名',
    keywords: ['标题', 'AI'],
    content: <div style={{ lineHeight: 1.8 }}>写出场景与冲突会提升标题匹配度。</div>
  },
  {
    id: 'ai.promptPanel',
    group: 'AI 写作',
    title: '写作技能库',
    summary: '模板化指令 + 参数',
    keywords: ['技能库', '模板'],
    content: (
      <div style={{ lineHeight: 1.8 }}>
        <div>
          模板支持 <code>{'{{selection}}'}</code> 引用选中文本。
        </div>
        <div>若模板需要选中文本，未选中时会灰掉不可用。</div>
      </div>
    )
  },
  {
    id: 'ai.logicCheck',
    group: 'AI 写作',
    title: '逻辑一致性检测',
    summary: '识别角色与逻辑矛盾',
    keywords: ['逻辑', '检测'],
    content: <div style={{ lineHeight: 1.8 }}>先选中文本再检测，可得到问题与建议。</div>
  },
  {
    id: 'export.smart',
    group: '导出',
    title: 'Smart Export（一键导出）',
    summary: '导出 TXT / EPUB / DOCX 并支持预览',
    keywords: ['导出', 'txt', 'epub', 'docx'],
    content: <div style={{ lineHeight: 1.8 }}>建议先预览排版，再导出成最终文件。</div>
  },
  {
    id: 'project.import',
    group: '项目管理',
    title: '导入书稿',
    summary: '从外部文件导入项目',
    keywords: ['导入', '书稿'],
    content: <div style={{ lineHeight: 1.8 }}>适合迁移旧稿后继续写作。</div>
  },
  {
    id: 'project.create',
    group: '项目管理',
    title: '新建项目',
    summary: '创建小说项目与基本信息',
    keywords: ['新建项目'],
    content: <div style={{ lineHeight: 1.8 }}>可先用 AI 生成设定，再确认创建。</div>
  },
  {
    id: 'project.guide',
    group: '写作技巧',
    title: '三步上手',
    summary: '不研究也能快速开始写',
    keywords: ['上手', '新手'],
    content: (
      <div style={{ lineHeight: 1.9 }}>
        <div>1) 新建项目：写一句想法（或用 AI 生成设定）。</div>
        <div>2) 新建章节：先写 50~100 字，再用 AI 续写/润色。</div>
        <div>3) 需要结构：用大纲/世界观/角色管理一键生成。</div>
      </div>
    )
  }
]

export const helpGroups: HelpTopic['group'][] = ['章节编辑', 'AI 写作', '项目管理', '导出', '写作技巧']
