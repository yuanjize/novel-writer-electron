# AI 请求上下文说明（每个 AI 按钮会发给模型什么）

这份文档用于回答：**项目里每个 AI 功能按钮调用时，实际发送给 AI 的上下文 / Prompt 是什么**，便于你调试、优化 Prompt、定位效果不佳的根因。

调用链总览：Renderer（`src/pages/*`）→ Preload（`preload/index.ts`）→ IPC（`main/ipc-handlers.ts`）→ AI 服务（`main/services/ai-service.ts`）。

---

## 1) 通用概念：System Prompt / User Prompt

本项目对大多数 AI 调用都采用两段信息：

- **System Prompt**：定义“模型身份/任务/输出格式约束”，由 `AINovelService` 组装。
- **User Prompt**：具体输入内容（章节文本/大纲/选择文字/表单答案等），由各功能拼接。

> 只有少数功能会额外注入“智能上下文”（见下一节的 `buildContext`）。

---

## 2) 通用“智能上下文” buildContext（动态注入）

代码：`main/services/ai-service.ts` → `buildContext(projectId, currentText, chapterNumber)`

这个上下文会被拼到 **System Prompt** 末尾，用于让模型获得“前情 + 相关资料”：

### 2.1 前情提要（最近 3 章摘要）

- 数据来源：`projectDAO.getChapters(projectId)`（`chapters` 表）
- 选择规则：
  - 只取 `chapter_number < chapterNumber` 且 `summary` 非空的章节
  - 按章节号倒序取 3 条，再转回正序输出
- 输出形态：
  - `【前情提要】`
  - `第{章号}章：{summary}`

> 注意：如果章节 `summary` 从未写入/生成，这块会为空（模型就没有“前情”可用）。

### 2.2 相关角色档案（按“名字是否出现在文本”筛选）

- 数据来源：`characterDAO.getAllByProject(projectId)`（`characters` 表）
- 选择规则：`currentText.includes(character.name)`
- 输出形态：
  - `【相关角色档案】`
  - `姓名/性格/背景/关系`

### 2.3 相关世界观设定（按“标题是否出现在文本”筛选）

- 数据来源：`worldSettingDAO.getAllByProject(projectId)`（`world_settings` 表）
- 选择规则：`currentText.includes(setting.title)`
- 输出形态：
  - `【相关世界观设定】`
  - `[分类] 标题：内容`

### 2.4 重要限制（会影响效果）

- 这是**纯字符串包含**匹配：人名/设定标题没出现就不会注入；同名/常见词可能误命中。
- `currentText` 往往是**裁剪后的片段**（例如续写只拿最后 2000 字做匹配），不是全文。

---

## 3) 各 AI 按钮：发送上下文明细

下面按 UI 页面/按钮来写清楚“System Prompt / User Prompt / 额外上下文来源 / 截断策略 / 返回格式”。

### 3.1 章节编辑器 `src/pages/ChapterEditor.tsx`

#### 3.1.1 `AI 续写`

- Renderer 调用：`ipc.continueWriting(chapterId, { content, prompt? })`
- IPC：`ai:continueWriting`（`main/ipc-handlers.ts`）
- Main 侧补充信息：
  - 用 `chapterId` 查出 `chapter.project_id`、`chapter.chapter_number`
  - 读 `project.genre`（作为文风约束）
  - 会记录一条交互到 `aiInteractionDAO`（prompt/response/model）
- System Prompt：
  - `buildSystemPrompt('continue', project.genre)`
  - `+ buildContext(projectId, content.slice(-2000), chapterNumber)`（智能上下文注入）
- User Prompt：
  - 永远包含：`content.slice(-1000)`（只发最后 1000 字作为“续写依据”）
  - 如果传了 `context.prompt`（续写要求）：会拼到前面，例如 `续写要求：... + 【当前章节末尾】...`
- 返回：纯文本（续写段落）

#### 3.1.2 `AI 优化`

- Renderer 调用：`ipc.improveText(chapterId, content.trim(), { intensity? })`
- IPC：`ai:improveText`
- System Prompt：`buildSystemPrompt('improve', project.genre)`
- User Prompt：`请优化以下文本...` + **全文文本**（并根据 `intensity=light|standard|strong` 注入“轻度/标准/强力润色”要求）
- 返回：纯文本（优化后的全文）

#### 3.1.3 `情节建议`

- Renderer 调用：`ipc.suggestPlot(projectId, { genre: undefined, existingChapters })`
- IPC：`ai:suggestPlot`
- System Prompt：`buildSystemPrompt('suggest', project.genre)`
- User Prompt（当前实现）：
  - 前端会构造 `existingChapters`（最近几章的 `summary`/内容片段 + 当前章节片段）
  - Main 侧会使用：`目前已有的章节概要：\n{existingChapters.join('\n')}` + `请为这个{genre}小说提供 3 个...`
- 返回：字符串数组（3 条建议，按换行解析）

#### 3.1.4 `AI 扩写`（细纲扩写 / Beats to Prose）

- Renderer 入口：扩写弹窗输入 `outlineInput` → `ipc.expandOutline(projectId, outlineInput)`
- IPC：`ai:expandOutline`
- System Prompt：
  - 固定的 “Beats to Prose” 规则（扩写比例、细节补全、风格匹配）
  - `+ buildContext(projectId, outline, 9999)`（智能上下文注入）
    - `chapterNumber=9999` 使得“前情提要”基本会取到项目里最后几章的 `summary`（如果存在）
    - 角色/设定匹配基于 `outline` 本身是否包含名字/标题
- User Prompt：`请将以下大纲扩写为正文：` + `outline`
- 返回：纯文本（扩写正文，期望约 500-1000 字）

#### 3.1.5 `角色重写`（角色语气重写）

- Renderer 入口：用户在编辑器里**选中一段文字** → 选择角色 → `ipc.rewriteWithCharacter(projectId, selectedText, characterName)`
- IPC：`ai:rewriteWithCharacter`
- System Prompt：
  - 固定“台词润色专家”规则
  - 额外注入：从 DB 读取该角色档案（`characters` 表）并拼到 System Prompt
  - **不使用** `buildContext`
- User Prompt：`请用【角色名】的语气重写...` + `"selectedText"`
- 返回：纯文本（重写结果）

#### 3.1.6 `AI 生成标题`

- Renderer 入口：标题输入框右侧闪电按钮 → `ipc.generateChapterTitle(...)`
- IPC：`ai:generateChapterTitle`
- User Prompt 来源：
  - `genre`: `project.genre || '通用'`
  - `projectDescription`: `project.description || ''`
  - `previousChapters`: 取当前章节之前的章节标题列表，Prompt 中只使用最后 3 个
  - `chapterContent`: 传全文，但 Prompt 中只使用 `chapterContent.slice(0, 200)`
- System Prompt：固定“小说编辑，返回标题，不要其他内容”
- 返回：纯文本（标题；会做一次去引号清理）

#### 3.1.7 `情绪节奏分析`

- Renderer 入口：右侧“智能资料面板” → `ipc.analyzeChapterEmotion(content)`
- IPC：`ai:analyzeChapterEmotion`
- System Prompt：要求输出 JSON（`score/label/critique`）
- User Prompt：`请分析...` + `content.slice(0, 3000)`
- 返回：JSON 对象 `{ score, label, critique }`（解析失败则返回默认值）

#### 3.1.8 `版本历史 → 分析差异`（AI 智能摘要 + 标签）

- Renderer 入口：版本历史 Modal → `ipc.analyzeVersionDiff(versionId)`
- IPC：`ai:analyzeVersionDiff`
- Main 侧补充信息：
  - 通过 `versionId` 取当前版本内容 `currentVersion.content`
  - 如果不传 `previousVersionId`：自动在该章节版本列表里找“上一版本”的内容
  - 分析后会把结果写回 `chapter_versions.summary` / `chapter_versions.tags`
- System Prompt：要求输出 JSON `{ summary, tags }`
- User Prompt：旧/新内容分别截断到 `slice(0, 1500)`，并在末尾拼 `...`
- 返回：JSON `{ summary: string, tags: string[] }`

---

### 3.2 项目创建 `src/pages/ProjectCreate.tsx`

#### 3.2.1 `AI 生成项目设定`（引导式问答）

- Renderer 调用：`window.electronAPI.ai.guidedProjectCreation(answers)`
- IPC：`ai:guidedProjectCreation`
- System Prompt：要求返回固定 JSON 结构（name/description/genre/target_words/主角/世界观）
- User Prompt：把问卷答案逐行拼接（idea/genre/主角类型/基调/目标字数…）
- 返回：JSON 对象（用正则提取 `{...}` 后 `JSON.parse`）

---

### 3.3 角色管理 `src/pages/CharacterManagement.tsx`

#### 3.3.1 `AI 一键生成/补全设定`

- Renderer 调用：`window.electronAPI.ai.generateCharacter({ projectId, role, context, existingCharacters? })`
- `role`：当前 UI 固定传 `supporting`（配角）
- `context` 由前端拼接：
  - `小说类型：{project.genre}`
  - `小说简介：{project.description}`
  - （可选）`角色名字：{表单里当前 name}`
- `existingCharacters`：
  - 取当前项目已存在的角色名列表（排除正在编辑的那个名字），用于让 AI 避免起重复名
- System Prompt：要求返回 JSON（name/personality/background/relationships）
- 返回：JSON 对象（用正则提取 `{...}` 后 `JSON.parse`），并回填到表单

---

### 3.4 大纲规划 `src/pages/OutlineManagement.tsx`

#### 3.4.1 `AI 生成大纲`

- Renderer 调用：`window.electronAPI.ai.generateOutline({ genre, projectDescription, existingChapters?, targetChapterCount })`
- 当前 UI 传参：
  - `genre = project.genre || '通用'`
  - `projectDescription = project.description || ''`
  - `targetChapterCount = 10`
  - 如果项目已有章节：会传入最近若干章的 `{ title, content? }`（content 优先用 `summary`，否则用内容片段）
- System Prompt：要求返回 JSON 数组 `[{title, content, sequence}, ...]`
- 返回：JSON 数组（用正则提取 `[...]` 后 `JSON.parse`），前端会批量写入 `outlines` 表

---

### 3.5 世界观设定 `src/pages/WorldSettingManagement.tsx`

#### 3.5.1 `AI 生成设定`

- Renderer 调用：`window.electronAPI.ai.generateWorldSetting({ genre, projectDescription })`
- 当前 UI 传参：
  - `genre = project.genre || '通用'`
  - `projectDescription = project.description || ''`
  - 未传 `category`
- System Prompt：要求返回 JSON 数组 `[{category, title, content}, ...]`（3-5 条）
- 返回：JSON 数组（用正则提取 `[...]` 后 `JSON.parse`），前端会批量写入 `world_settings` 表

---

## 4) Provider 请求格式（调试用）

代码：`main/services/ai-service.ts` → `queryAnthropic` / `queryOllama`

### 4.1 Anthropic（或 Anthropic 兼容网关）

- URL：`{baseUrl}/v1/messages`（如果 `baseUrl` 以 `/v1` 结尾，则为 `{baseUrl}/messages`）
- Headers：
  - `anthropic-version: 2023-06-01`
  - `x-api-key: {apiKey}`
  - 如果 `baseUrl` 不是 `https://api.anthropic.com`：额外加 `authorization: Bearer {apiKey}`（兼容一些第三方网关）
- Body（核心字段）：
  - `system: systemPrompt`
  - `messages: [{ role: 'user', content: userPrompt }]`

### 4.2 Ollama（本地）

- URL：`{baseUrl}/api/chat`（如果 `baseUrl` 以 `/api` 结尾，则为 `{baseUrl}/chat`）
- Body（核心字段）：
  - `messages: [{role:'system', content: systemPrompt}, {role:'user', content: userPrompt}]`

### 4.3 重试/超时

- `AI_MAX_RETRIES`：默认 3 次，指数退避（250ms * 2^attempt）
- `AI_TIMEOUT`：默认 60s
