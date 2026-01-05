# AI 功能配置指南

## 🚀 如何启用 AI 功能

### 1. 获取 API Key

访问 [Anthropic Console](https://console.anthropic.com/) 并登录，然后获取你的 API Key。

### 2. 配置环境变量

在项目根目录创建 `.env` 文件：

```bash
# 复制示例文件
cp .env.example .env
```

编辑 `.env` 文件，填入你的 API Key：

```env
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

### 3. 重启应用

配置完成后，需要重启 Electron 应用：

```bash
# 停止当前运行的应用 (Ctrl+C)
# 重新启动
npm run dev
```

## ✨ AI 功能说明

### AI 续写
- **位置**：章节编辑器工具栏
- **功能**：根据当前内容自动续写
- **使用**：先输入一些内容，然后点击"AI 续写"按钮
- **效果**：AI 会分析你写的内容，并继续创作 200-500 字

### AI 优化
- **位置**：章节编辑器工具栏
- **功能**：优化文本表达
- **使用**：选中或输入需要优化的文本，点击"AI 优化"
- **效果**：AI 会优化文本，使其更加生动流畅

### 情节建议
- **位置**：章节编辑器工具栏
- **功能**：提供情节发展建议
- **使用**：点击"情节建议"按钮
- **效果**：AI 会根据项目类型提供 3 个创意建议

## 🎯 使用技巧

1. **续写功能**
   - 输入至少 50-100 字的内容，效果更好
   - 可以在提示框中添加特殊要求，如"增加对话"、"加强描写"等

2. **优化功能**
   - 适合优化初稿或草稿
   - 可以多次使用，逐步完善文本

3. **情节建议**
   - 建议在创作瓶颈时使用
   - 可以根据建议进行头脑风暴

## ⚠️ 注意事项

- 云端模式需要网络连接；本地 Ollama 可离线使用
- 云端 API 调用会产生费用（具体参考 Anthropic 定价）
- 建议先在 [Anthropic Console](https://console.anthropic.com/) 查看使用量和费用
- API Key 请妥善保管，不要提交到公开仓库

## 🔧 故障排除

### AI 功能不可用
如果看到类似提示（例如 “AI 服务不可用，请在 AI 设置中配置云端 API Key 或切换到本地 Ollama”）：

1. 打开应用里的「AI 设置」（右上角 / 章节编辑器顶部工具栏），检查 Provider / Model / Base URL
2. Anthropic：确认 API Key 是否有效；如使用兼容网关，确认 Base URL 正确可访问
3. Ollama：确认本地服务已启动（默认 `http://127.0.0.1:11434`），且模型已拉取（如 `ollama pull llama3.1`）
4. 如果你修改了 `.env` 但不生效：检查是否已经生成配置文件（配置文件优先级更高，可在「AI 设置」中看到路径）

### API 调用失败
如果 AI 功能报错：

1. 检查网络连接
2. 确认 API Key 是否有效
3. 检查 API 额度是否用完
4. 查看 Anthropic 账户状态

## 💡 进阶配置

- 推荐通过应用内「AI 设置」修改 Provider / Base URL / Model（会写入配置文件，优先级高于 `.env`）。
- 如需使用 `.env`，请参考 `.env.example`（仅在未生成配置文件时生效）。

常用环境变量：
- `AI_PROVIDER=anthropic|ollama`
- Anthropic：`ANTHROPIC_API_KEY` / `ANTHROPIC_BASE_URL` / `ANTHROPIC_MODEL`
- Ollama：`OLLAMA_BASE_URL` / `OLLAMA_MODEL`
- 高级：`AI_MAX_RETRIES` / `AI_TIMEOUT` / `AI_DEBUG`
