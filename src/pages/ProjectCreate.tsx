import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  App as AntdApp,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Steps,
  Typography,
  Space,
  Modal,
  Divider,
  Descriptions
} from 'antd'
import { ArrowLeftOutlined, ArrowRightOutlined, CheckOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { useElectronIPC } from '../hooks/useElectronIPC'
import HelpIcon from '../components/HelpIcon'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

interface ProjectFormData {
  name: string
  author: string
  genre: string
  description: string
  target_words: number
}

interface AIQuestionnaire {
  idea: string
  preferredGenre: string
  protagonistType: string
  tone: string
  targetWords: number
}

const genres = [
  '玄幻', '仙侠', '都市', '历史', '科幻', '游戏',
  '武侠', '军事', '悬疑', '灵异', '同人', '其他'
]

const protagonistTypes = [
  '热血少年', '腹黑智者', '重生归来', '穿越异界',
  '系统拥有者', '天赋异禀', '废柴逆袭', '隐世高人'
]

const tones = [
  '轻松搞笑', '热血爽文', '严肃沉重', '悬疑烧脑',
  '温馨治愈', '黑暗风格', '史诗宏大'
]

function ProjectCreate() {
  const navigate = useNavigate()
  const ipc = useElectronIPC()
  const { message } = AntdApp.useApp()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Partial<ProjectFormData>>({})
  const [loading, setLoading] = useState(false)
  const [aiAvailable, setAiAvailable] = useState(false)
  const [aiQuestionnaire, setAiQuestionnaire] = useState<Partial<AIQuestionnaire>>({
    idea: '',
    preferredGenre: '',
    protagonistType: '',
    tone: '',
    targetWords: 100000
  })
  const [aiGenerating, setAiGenerating] = useState(false)

  useEffect(() => {
    // 检查AI是否可用
    const checkAI = async () => {
      const result = await window.electronAPI.ai.isAvailable()
      setAiAvailable(result.data?.available || false)
    }
    checkAI()
  }, [])

  const handleAIGenerate = async () => {
    if (!aiQuestionnaire.idea?.trim()) {
      message.error('请先输入你的创作想法')
      return
    }

    setAiGenerating(true)

    try {
      const result = await window.electronAPI.ai.guidedProjectCreation({
        idea: aiQuestionnaire.idea,
        preferredGenre: aiQuestionnaire.preferredGenre,
        protagonistType: aiQuestionnaire.protagonistType,
        tone: aiQuestionnaire.tone,
        targetWords: aiQuestionnaire.targetWords
      })

      if (result.success && result.data) {
        const generated = result.data

        // 显示生成结果的Modal
        Modal.success({
          title: 'AI 生成完成！',
          width: 600,
          content: (
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="项目名称">{generated.name}</Descriptions.Item>
              <Descriptions.Item label="类型">{generated.genre}</Descriptions.Item>
              <Descriptions.Item label="简介">{generated.description}</Descriptions.Item>
              <Descriptions.Item label="目标字数">{generated.target_words.toLocaleString()} 字</Descriptions.Item>
              <Descriptions.Item label="主角设定">{generated.suggested_protagonist}</Descriptions.Item>
              <Descriptions.Item label="世界观">{generated.suggested_world_view}</Descriptions.Item>
            </Descriptions>
          ),
          okText: '使用这个设定',
          onOk: () => {
            // 填充表单数据
            setFormData({
              name: generated.name,
              genre: generated.genre,
              description: generated.description,
              target_words: generated.target_words
            })
            // 跳到确认步骤
            setCurrentStep(4)
          }
        })
      } else {
        message.error(result.error || 'AI 生成失败，请重试')
      }
    } catch (error) {
      message.error('AI 生成失败，请重试')
    } finally {
      setAiGenerating(false)
    }
  }

  const steps = [
    {
      title: 'AI 创意生成',
      content: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4}>🤖 让 AI 帮你生成小说设定</Title>
            <Text type="secondary">回答几个简单问题，AI 会为你生成完整的项目设定</Text>
          </div>

          {!aiAvailable ? (
            <Card style={{ background: 'var(--paper-surface-2)' }}>
              <Text type="secondary">AI 功能不可用，请先在 AI 设置中配置云端 API Key 或切换到本地 Ollama。</Text>
            </Card>
          ) : (
            <>
              <div>
                <Title level={5}>你的创作想法</Title>
                <Text type="secondary">用一句话描述你想写的故事</Text>
                <TextArea
                  placeholder="例如：一个被开除的程序员穿越到修仙世界，用代码写出了最强修仙功法..."
                  rows={3}
                  value={aiQuestionnaire.idea}
                  onChange={(e) => setAiQuestionnaire({ ...aiQuestionnaire, idea: e.target.value })}
                  style={{ marginTop: '8px' }}
                />
              </div>

              <div>
                <Title level={5}>偏好类型</Title>
                <Select
                  placeholder="选择你喜欢的类型"
                  style={{ width: '100%' }}
                  value={aiQuestionnaire.preferredGenre || undefined}
                  onChange={(value) => setAiQuestionnaire({ ...aiQuestionnaire, preferredGenre: value })}
                >
                  {genres.map((genre) => (
                    <Option key={genre} value={genre}>{genre}</Option>
                  ))}
                </Select>
              </div>

              <div>
                <Title level={5}>主角类型</Title>
                <Select
                  placeholder="选择主角类型"
                  style={{ width: '100%' }}
                  value={aiQuestionnaire.protagonistType || undefined}
                  onChange={(value) => setAiQuestionnaire({ ...aiQuestionnaire, protagonistType: value })}
                >
                  {protagonistTypes.map((type) => (
                    <Option key={type} value={type}>{type}</Option>
                  ))}
                </Select>
              </div>

              <div>
                <Title level={5}>故事基调</Title>
                <Select
                  placeholder="选择故事基调"
                  style={{ width: '100%' }}
                  value={aiQuestionnaire.tone || undefined}
                  onChange={(value) => setAiQuestionnaire({ ...aiQuestionnaire, tone: value })}
                >
                  {tones.map((tone) => (
                    <Option key={tone} value={tone}>{tone}</Option>
                  ))}
                </Select>
              </div>

              <div>
                <Title level={5}>目标字数</Title>
                <InputNumber
                  placeholder="目标字数"
                  style={{ width: '100%' }}
                  value={aiQuestionnaire.targetWords}
                  onChange={(value) => setAiQuestionnaire({ ...aiQuestionnaire, targetWords: value || 100000 })}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => Number((value || '').replace(/,/g, ''))}
                  min={10000}
                  step={10000}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<ThunderboltOutlined />}
                  loading={aiGenerating}
                  onClick={handleAIGenerate}
                  disabled={!aiQuestionnaire.idea?.trim()}
                  style={{ flex: 1 }}
                >
                  AI 生成项目设定
                </Button>
                <HelpIcon
                  title="AI 生成项目设定"
                  content={
                    <div style={{ lineHeight: 1.8 }}>
                      <div>会用到：你的想法 +（可选）类型/主角/基调/目标字数。</div>
                      <div>输出：项目名称、简介、类型、目标字数、主角与世界观。</div>
                    </div>
                  }
                />
              </div>
            </>
          )}

          <Divider>或</Divider>

          <Button
            size="large"
            block
            onClick={() => setCurrentStep(1)}
          >
            跳过，手动填写
          </Button>
        </Space>
      )
    },
    {
      title: '基本信息',
      content: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4}>项目名称 *</Title>
            <Text type="secondary">给你的小说起一个好听的名字吧～</Text>
            <Input
              placeholder="例如：修仙传说"
              size="large"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ marginTop: '8px' }}
            />
          </div>

          <div>
            <Title level={4}>作者笔名</Title>
            <Text type="secondary">你想用什么笔名发布这部作品？</Text>
            <Input
              placeholder="例如：笔名"
              size="large"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              style={{ marginTop: '8px' }}
            />
          </div>
        </Space>
      )
    },
    {
      title: '类型选择',
      content: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4}>小说类型 *</Title>
            <Text type="secondary">选择你的小说类型，这将帮助 AI 更好地理解创作方向</Text>
            <Select
              placeholder="请选择类型"
              size="large"
              style={{ width: '100%', marginTop: '8px' }}
              value={formData.genre}
              onChange={(value) => setFormData({ ...formData, genre: value })}
            >
              {genres.map((genre) => (
                <Option key={genre} value={genre}>
                  {genre}
                </Option>
              ))}
            </Select>
          </div>
        </Space>
      )
    },
    {
      title: '详细描述',
      content: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4}>作品简介</Title>
            <Text type="secondary">简单描述一下你的故事梗概，这将帮助 AI 辅助创作</Text>
            <TextArea
              placeholder="例如：一个少年意外穿越到修仙世界，开始了他传奇的修仙之路..."
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ marginTop: '8px' }}
            />
          </div>

          <div>
            <Title level={4}>目标字数</Title>
            <Text type="secondary">设定一个目标字数，激励自己完成创作</Text>
            <InputNumber
              placeholder="例如：100000"
              size="large"
              style={{ width: '100%', marginTop: '8px' }}
              value={formData.target_words}
              onChange={(value) => setFormData({ ...formData, target_words: value || 0 })}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => Number((value || '').replace(/,/g, ''))}
              min={0}
              step={10000}
            />
          </div>
        </Space>
      )
    },
    {
      title: '确认信息',
      content: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Title level={4}>请确认项目信息</Title>
          <Card>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div>
                <Text strong>项目名称：</Text>
                <Text>{formData.name || '未填写'}</Text>
              </div>
              <div>
                <Text strong>作者：</Text>
                <Text>{formData.author || '未填写'}</Text>
              </div>
              <div>
                <Text strong>类型：</Text>
                <Text>{formData.genre || '未选择'}</Text>
              </div>
              <div>
                <Text strong>简介：</Text>
                <Text>{formData.description || '未填写'}</Text>
              </div>
              <div>
                <Text strong>目标字数：</Text>
                <Text>{formData.target_words ? formData.target_words.toLocaleString() + ' 字' : '未设定'}</Text>
              </div>
            </Space>
          </Card>
        </Space>
      )
    }
  ]

  const handleNext = () => {
    // 验证当前步骤
    if (currentStep === 1 && !formData.name?.trim()) {
      message.error('请输入项目名称')
      return
    }
    if (currentStep === 2 && !formData.genre?.trim()) {
      message.error('请选择小说类型')
      return
    }
    setCurrentStep(Math.min(currentStep + 1, steps.length - 1))
  }

  const handlePrev = () => {
    setCurrentStep(Math.max(currentStep - 1, 0))
  }

  const handleFinish = async () => {
    setLoading(true)

    try {
      const project = await ipc.createProject({
        name: formData.name!,
        author: formData.author,
        genre: formData.genre,
        description: formData.description,
        target_words: formData.target_words || 0
      })

      if (project) {
        message.success('项目创建成功！')
        navigate(`/project/${project.id}`)
      }
    } catch (error) {
      message.error('创建项目失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/')}
        style={{ marginBottom: '24px' }}
      >
        返回
      </Button>

      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2}>创建新项目</Title>
            <Text type="secondary">跟随向导，一步步创建你的小说项目</Text>
          </div>

          <Steps current={currentStep} size="small">
            {steps.map((step, index) => (
              <Steps.Step key={index} title={step.title} />
            ))}
          </Steps>

          <div style={{ minHeight: '300px', padding: '24px 0' }}>
            {steps[currentStep].content}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              上一步
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button type="primary" onClick={handleNext} icon={<ArrowRightOutlined />}>
                下一步
              </Button>
            ) : (
              <Button
                type="primary"
                onClick={handleFinish}
                loading={loading}
                icon={<CheckOutlined />}
              >
                创建项目
              </Button>
            )}
          </div>
        </Space>
      </Card>
    </div>
  )
}

export default ProjectCreate
