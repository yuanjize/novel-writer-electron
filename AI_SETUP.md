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

- AI 功能需要网络连接
- API 调用会产生费用（具体参考 Anthropic 定价）
- 建议先在 [Anthropic Console](https://console.anthropic.com/) 查看使用量和费用
- API Key 请妥善保管，不要提交到公开仓库

## 🔧 故障排除

### AI 功能不可用
如果看到 "AI 服务不可用，请配置 ANTHROPIC_API_KEY" 错误：

1. 检查 `.env` 文件是否存在
2. 确认 API Key 是否正确
3. 重启 Electron 应用
4. 查看控制台是否有其他错误信息

### API 调用失败
如果 AI 功能报错：

1. 检查网络连接
2. 确认 API Key 是否有效
3. 检查 API 额度是否用完
4. 查看 Anthropic 账户状态

## 💡 进阶配置

### 自定义模型

在 `main/services/ai-service.ts` 中可以修改使用的模型：

```typescript
this.agent = new Agent({
  apiKey: this.apiKey,
  modelName: 'claude-3-5-sonnet-20241022' // 可选其他模型
})
```

可选模型：
- `claude-3-5-sonnet-20241022` (推荐，平衡性能和成本)
- `claude-3-5-haiku-20241022` (更快，成本更低)
- `claude-3-opus-20240229` (最强，但成本较高)

### 调整系统提示词

在 `ai-service.ts` 的 `buildSystemPrompt` 方法中可以自定义 AI 的行为和风格。
