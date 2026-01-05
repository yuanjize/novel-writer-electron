import { useEffect, useMemo, useState } from 'react'
import {
  App as AntdApp,
  Button,
  Card,
  Divider,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography
} from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined, RobotOutlined, ThunderboltOutlined } from '@ant-design/icons'
import type { AIPersona, PromptTemplate, SafeAIConfig } from '../types'

type Provider = 'anthropic' | 'ollama'

interface AISettingsModalProps {
  open: boolean
  onClose: () => void
}

type ConfigFormValues = {
  provider: Provider
  apiKey?: string
  baseUrl?: string
  modelName?: string
  maxRetries?: number
  timeout?: number
  debug?: boolean
}

type PersonaFormValues = {
  name: string
  description?: string
  system_prompt: string
}

type TemplateFormValues = {
  name: string
  category: string
  content: string
}

export default function AISettingsModal({ open, onClose }: AISettingsModalProps) {
  const { message } = AntdApp.useApp()
  const [form] = Form.useForm<ConfigFormValues>()
  const [personaForm] = Form.useForm<PersonaFormValues>()
  const [templateForm] = Form.useForm<TemplateFormValues>()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [configPath, setConfigPath] = useState('')
  const [configFileExists, setConfigFileExists] = useState(false)
  const [safeConfig, setSafeConfig] = useState<SafeAIConfig | null>(null)

  const provider = Form.useWatch('provider', form) as Provider | undefined

  const [personas, setPersonas] = useState<AIPersona[]>([])
  const [templates, setTemplates] = useState<PromptTemplate[]>([])

  const [personaModalOpen, setPersonaModalOpen] = useState(false)
  const [editingPersona, setEditingPersona] = useState<AIPersona | null>(null)

  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null)

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ status: 'success' | 'error' | null; msg: string }>({
    status: null,
    msg: ''
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [pathRes, configRes, personaRes, templateRes] = await Promise.all([
        window.electronAPI.ai.getConfigPath(),
        window.electronAPI.ai.getConfig(),
        window.electronAPI.ai.getPersonas(),
        window.electronAPI.ai.getPromptTemplates()
      ])

      if (pathRes.success) {
        setConfigPath(pathRes.data?.path ?? '')
        setConfigFileExists(!!pathRes.data?.hasFile)
      }

      if (configRes.success) {
        const cfg = configRes.data ?? null
        setSafeConfig(cfg)
        form.setFieldsValue({
          provider: (cfg?.provider ?? 'anthropic') as Provider,
          baseUrl: cfg?.baseUrl ?? undefined,
          modelName: cfg?.modelName ?? undefined,
          maxRetries: cfg?.maxRetries ?? undefined,
          timeout: cfg?.timeout ?? undefined,
          debug: cfg?.debug ?? false,
          apiKey: undefined
        })
      } else {
        setSafeConfig(null)
      }

      if (personaRes.success) setPersonas(personaRes.data ?? [])
      if (templateRes.success) setTemplates(templateRes.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    loadData()
  }, [open])

  const apiKeyHint = useMemo(() => {
    if (!safeConfig?.hasApiKey) return '未设置（保存时填写即可）'
    return `已设置：${safeConfig.apiKeyPreview}`
  }, [safeConfig])

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult({ status: null, msg: '正在测试连接…' })
    try {
      const res = await window.electronAPI.ai.chat({
        messages: [{ role: 'user', content: 'Just reply OK.' }],
        temperature: 0
      })
      if (res.success) {
        setTestResult({ status: 'success', msg: `连接成功：${res.data ?? ''}` })
      } else {
        setTestResult({ status: 'error', msg: res.error || '连接失败' })
      }
    } catch (e) {
      setTestResult({ status: 'error', msg: (e as Error).message || '连接异常' })
    } finally {
      setTesting(false)
    }
  }

  const handleSaveConfig = async () => {
    const values = await form.validateFields()

    const payload: Partial<ConfigFormValues> = { ...values }
    const trimmedApiKey = (payload.apiKey ?? '').trim()
    if (!trimmedApiKey) {
      delete payload.apiKey
    } else {
      payload.apiKey = trimmedApiKey
    }

    setSaving(true)
    try {
      const res = await window.electronAPI.ai.updateConfig(payload)
      if (res.success) {
        message.success('配置已保存')
        form.setFieldValue('apiKey', undefined)
        await loadData()
      } else {
        message.error(res.error || '保存失败')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleEditPersona = (persona?: AIPersona) => {
    setEditingPersona(persona ?? null)
    personaForm.setFieldsValue({
      name: persona?.name ?? '',
      description: persona?.description ?? '',
      system_prompt: persona?.system_prompt ?? ''
    })
    setPersonaModalOpen(true)
  }

  const handleSavePersona = async () => {
    const values = await personaForm.validateFields()
    const res = editingPersona
      ? await window.electronAPI.ai.updatePersona(editingPersona.id, values)
      : await window.electronAPI.ai.createPersona(values)

    if (!res.success) {
      message.error(res.error || '保存失败')
      return
    }

    message.success('已保存')
    setPersonaModalOpen(false)
    setEditingPersona(null)
    await loadData()
  }

  const handleDeletePersona = async (id: number) => {
    const res = await window.electronAPI.ai.deletePersona(id)
    if (!res.success) {
      message.error(res.error || '删除失败')
      return
    }
    message.success('已删除')
    await loadData()
  }

  const handleEditTemplate = (template?: PromptTemplate) => {
    setEditingTemplate(template ?? null)
    templateForm.setFieldsValue({
      name: template?.name ?? '',
      category: template?.category ?? 'general',
      content: template?.content ?? ''
    })
    setTemplateModalOpen(true)
  }

  const handleSaveTemplate = async () => {
    const values = await templateForm.validateFields()
    const res = editingTemplate
      ? await window.electronAPI.ai.updatePromptTemplate(editingTemplate.id, values)
      : await window.electronAPI.ai.createPromptTemplate(values)

    if (!res.success) {
      message.error(res.error || '保存失败')
      return
    }

    message.success('已保存')
    setTemplateModalOpen(false)
    setEditingTemplate(null)
    await loadData()
  }

  const handleDeleteTemplate = async (id: number) => {
    const res = await window.electronAPI.ai.deletePromptTemplate(id)
    if (!res.success) {
      message.error(res.error || '删除失败')
      return
    }
    message.success('已删除')
    await loadData()
  }

  const { Text } = Typography

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined /> AI 设置
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
    >
      <Tabs
        defaultActiveKey="config"
        items={[
          {
            key: 'config',
            label: '基础配置',
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Card size="small" loading={loading}>
                  <Space direction="vertical" style={{ width: '100%' }} size={8}>
                    <Text type="secondary">
                      {configFileExists ? '使用自定义配置文件：' : '尚未创建配置文件，保存后会自动创建：'} <Text code>{configPath || '(未知路径)'}</Text>
                    </Text>
                    <Form form={form} layout="vertical" initialValues={{ provider: 'anthropic', debug: false }}>
                      <Form.Item label="Provider" name="provider" rules={[{ required: true }]}>
                        <Select
                          options={[
                            { label: 'Anthropic / 网关', value: 'anthropic' },
                            { label: 'Ollama (本地模型)', value: 'ollama' }
                          ]}
                        />
                      </Form.Item>

                      {provider === 'anthropic' && (
                        <Form.Item
                          label={
                            <Space size={8}>
                              API Key <Text type="secondary">({apiKeyHint})</Text>
                            </Space>
                          }
                          name="apiKey"
                        >
                          <Input.Password placeholder="留空表示不修改已有 Key" autoComplete="off" />
                        </Form.Item>
                      )}

                      <Form.Item
                        label={provider === 'ollama' ? 'Base URL (Ollama)' : 'Base URL (可选，支持网关)'}
                        name="baseUrl"
                      >
                        <Input
                          placeholder={
                            provider === 'ollama' ? 'http://127.0.0.1:11434' : 'https://api.anthropic.com 或你的网关地址'
                          }
                        />
                      </Form.Item>

                      <Form.Item label="模型" name="modelName">
                        <Input placeholder={provider === 'ollama' ? 'llama3.1 / qwen2.5 等' : 'claude-3-5-sonnet-20241022 等'} />
                      </Form.Item>

                      <Space size={12} wrap>
                        <Form.Item label="Max Retries" name="maxRetries" style={{ marginBottom: 0 }}>
                          <Input type="number" min={0} style={{ width: 160 }} />
                        </Form.Item>
                        <Form.Item label="Timeout(ms)" name="timeout" style={{ marginBottom: 0 }}>
                          <Input type="number" min={1000} style={{ width: 180 }} />
                        </Form.Item>
                        <Form.Item label="Debug" name="debug" valuePropName="checked" style={{ marginBottom: 0 }}>
                          <Switch />
                        </Form.Item>
                      </Space>
                    </Form>

                    <Divider style={{ margin: '8px 0' }} />

                    <Space>
                      <Button type="primary" loading={saving} onClick={handleSaveConfig}>
                        保存配置
                      </Button>
                      <Button icon={<ThunderboltOutlined />} loading={testing} onClick={handleTestConnection}>
                        测试连接
                      </Button>
                      {testResult.status && (
                        <Text type={testResult.status === 'success' ? 'success' : 'danger'}>{testResult.msg}</Text>
                      )}
                    </Space>
                  </Space>
                </Card>
              </Space>
            )
          },
          {
            key: 'personas',
            label: 'AI 人设',
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Text type="secondary">定义系统提示词（System Prompt），用于控制文风与偏好。</Text>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => handleEditPersona()}>
                    新增人设
                  </Button>
                </Space>

                <Card size="small" loading={loading}>
                  <Tabs
                    size="small"
                    items={[
                      {
                        key: 'list',
                        label: `人设列表 (${personas.length})`,
                        children: (
                          <div>
                            {personas.map((p) => (
                              <Card
                                key={p.id}
                                size="small"
                                style={{ marginBottom: 10 }}
                                title={
                                  <Space>
                                    {p.name} {p.is_active && <Tag color="blue">默认</Tag>}
                                  </Space>
                                }
                                extra={
                                  <Space>
                                    <Button type="text" icon={<EditOutlined />} onClick={() => handleEditPersona(p)} />
                                    <Popconfirm title="确定删除？" onConfirm={() => handleDeletePersona(p.id)}>
                                      <Button type="text" danger icon={<DeleteOutlined />} />
                                    </Popconfirm>
                                  </Space>
                                }
                              >
                                <Text type="secondary">{p.description || '（无描述）'}</Text>
                              </Card>
                            ))}
                            {personas.length === 0 && <Text type="secondary">暂无人设</Text>}
                          </div>
                        )
                      }
                    ]}
                  />
                </Card>
              </Space>
            )
          },
          {
            key: 'templates',
            label: '提示词模板',
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Text type="secondary">
                    常用指令库。使用 <Text code>{'{{selection}}'}</Text> 代表选中文本。
                  </Text>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => handleEditTemplate()}>
                    新增模板
                  </Button>
                </Space>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {templates.map((t) => (
                    <Card
                      key={t.id}
                      size="small"
                      title={
                        <Space>
                          {t.name} {t.is_built_in && <Tag>内置</Tag>}
                        </Space>
                      }
                      extra={
                        <Space>
                          {!t.is_built_in && (
                            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditTemplate(t)} />
                          )}
                          {!t.is_built_in && (
                            <Popconfirm title="确定删除？" onConfirm={() => handleDeleteTemplate(t.id)}>
                              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          )}
                        </Space>
                      }
                    >
                      <Text type="secondary">分类：{t.category}</Text>
                      <Divider style={{ margin: '8px 0' }} />
                      <Typography.Paragraph ellipsis={{ rows: 3 }} style={{ marginBottom: 0 }}>
                        {t.content}
                      </Typography.Paragraph>
                    </Card>
                  ))}
                </div>
              </Space>
            )
          }
        ]}
      />

      <Modal
        title={editingPersona ? '编辑人设' : '新增人设'}
        open={personaModalOpen}
        onOk={handleSavePersona}
        onCancel={() => {
          setPersonaModalOpen(false)
          setEditingPersona(null)
        }}
        width={640}
      >
        <Form form={personaForm} layout="vertical">
          <Form.Item label="名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="简介" name="description">
            <Input />
          </Form.Item>
          <Form.Item
            label="系统提示词 (System Prompt)"
            name="system_prompt"
            rules={[{ required: true, message: '请输入系统提示词' }]}
          >
            <Input.TextArea rows={6} placeholder="例如：你是一位专业的小说创作助手…" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingTemplate ? '编辑模板' : '新增模板'}
        open={templateModalOpen}
        onOk={handleSaveTemplate}
        onCancel={() => {
          setTemplateModalOpen(false)
          setEditingTemplate(null)
        }}
        width={680}
      >
        <Form form={templateForm} layout="vertical" initialValues={{ category: 'general' }}>
          <Form.Item label="模板名称" name="name" rules={[{ required: true, message: '请输入模板名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="分类" name="category" rules={[{ required: true, message: '请输入分类' }]}>
            <Input placeholder="general / rewrite / brainstorm" />
          </Form.Item>
          <Form.Item label="模板内容" name="content" rules={[{ required: true, message: '请输入模板内容' }]}>
            <Input.TextArea rows={8} placeholder="可以使用 {{selection}} 作为占位符" />
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  )
}

