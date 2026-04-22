/**
 * 本体建模页面 - 五步骤建模流程
 *
 * 功能规格 §3.2：
 * 步骤1：文档上传（多格式支持）
 * 步骤2：文档预览与解析
 * 步骤3：要素提取（AI辅助）
 * 步骤4：关系建立
 * 步骤5：保存与验证
 *
 * 技术架构：Hermes agent 协调 markitdown + five-elements-ontology 技能
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Steps, Button, Space, Typography, message, Upload, Tag, Card, Select,
  Input, Progress, Empty, Popconfirm, Drawer, Form, Slider, Tooltip, Divider, Flex,
} from 'antd';
import {
  UploadOutlined, FileSearchOutlined, ThunderboltOutlined,
  ApartmentOutlined, SaveOutlined, DeleteOutlined, CheckOutlined,
  EditOutlined, PlusOutlined, ArrowRightOutlined, FileTextOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useModelingStore } from '../../stores/modeling';
import {
  ELEMENT_CONFIG, RELATION_TYPE_CONFIG, SYSTEM_ROLE_LABELS,
} from '../../types';
import type {
  ModelingStep, CandidateConcept, CandidateRelation, ExtendedElementType,
  RelationType, SystemRoleWithUniversal,
} from '../../types';

const { Text, Title } = Typography;

// ─── 步骤配置 ───
const STEP_CONFIG: { key: ModelingStep; title: string; icon: React.ReactNode; desc: string }[] = [
  { key: 'upload', title: '文档上传', icon: <UploadOutlined />, desc: '上传待解析的领域文档' },
  { key: 'preview', title: '预览解析', icon: <FileSearchOutlined />, desc: '查看文档转换结果' },
  { key: 'extract', title: '要素提取', icon: <ThunderboltOutlined />, desc: 'AI 辅助提取五要素' },
  { key: 'relation', title: '关系建立', icon: <ApartmentOutlined />, desc: '确认概念间关系' },
  { key: 'save', title: '保存验证', icon: <SaveOutlined />, desc: '保存到知识库' },
];

const STEP_INDEX: Record<ModelingStep, number> = {
  upload: 0, preview: 1, extract: 2, relation: 3, save: 4,
};

// ─── 主题变量 ───
const THEME = {
  bgPrimary: '#171717',
  bgSecondary: '#1F1F1F',
  bgCard: '#1A1A1A',
  borderDefault: '#2D2D2D',
  textPrimary: '#FFFFFF',
  textSecondary: '#A3A3A3',
  textTertiary: '#525252',
  accent: '#3B82F6',
  accentHover: '#2563EB',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#FBBF24',
};

// ─── 主组件 ───
const Modeling: React.FC = () => {
  const store = useModelingStore();
  const {
    currentStep, uploadedFiles, candidateConcepts, candidateRelations,
    extracting, buildingRelations, saving, error, previewMarkdown,
    currentFileId, relationTypes,
    setStep, resetFlow, uploadFile, removeFile, previewFile,
    extractElements, toggleConceptConfirmed, confirmAllConcepts,
    updateCandidateConcept, removeCandidateConcept,
    fetchRelationTypes, buildRelations, toggleRelationConfirmed,
    confirmAllRelations, removeCandidateRelation, saveModel,
  } = store;

  const currentStepIndex = STEP_INDEX[currentStep];
  const confirmedConcepts = candidateConcepts.filter((c) => c.confirmed);
  const confirmedRelations = candidateRelations.filter((r) => r.confirmed);

  // 局部状态
  const [domainName, setDomainName] = useState('');
  const [addRelationOpen, setAddRelationOpen] = useState(false);
  const [editingConcept, setEditingConcept] = useState<string | null>(null);

  // 加载关系类型
  useEffect(() => {
    if (currentStep === 'relation' || currentStep === 'extract') {
      fetchRelationTypes();
    }
  }, [currentStep, fetchRelationTypes]);

  // 步骤2 进入时自动预览
  useEffect(() => {
    if (currentStep === 'preview' && currentFileId && !previewMarkdown) {
      previewFile(currentFileId);
    }
  }, [currentStep, currentFileId, previewMarkdown, previewFile]);

  // ─── 流转逻辑 ───
  const handleNext = useCallback(async () => {
    const steps: ModelingStep[] = ['upload', 'preview', 'extract', 'relation', 'save'];

    if (currentStep === 'upload') {
      if (uploadedFiles.length === 0) {
        message.warning('请先上传文档');
        return;
      }
      setStep('preview');
    } else if (currentStep === 'preview') {
      // 进入要素提取
      const file = uploadedFiles[0];
      if (!file) return;
      await extractElements(file.fileId, file.markdown, domainName);
    } else if (currentStep === 'extract') {
      if (confirmedConcepts.length === 0) {
        message.warning('请至少确认一个概念');
        return;
      }
      // 进入关系建立
      await buildRelations();
    } else if (currentStep === 'relation') {
      // 直接进入保存
      setStep('save');
    }
  }, [currentStep, uploadedFiles, domainName, confirmedConcepts, setStep, extractElements, buildRelations]);

  const handlePrev = () => {
    const steps: ModelingStep[] = ['upload', 'preview', 'extract', 'relation', 'save'];
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

  const handleSave = async () => {
    if (!domainName.trim()) {
      message.warning('请输入领域名称');
      return;
    }
    const resultDomainId = await saveModel({
      domainName: domainName.trim(),
      concepts: confirmedConcepts,
      relations: confirmedRelations,
    });
    if (resultDomainId) {
      message.success(`已保存 ${confirmedConcepts.length} 个概念、${confirmedRelations.length} 条关系到领域「${domainName}」`);
    }
  };

  // ─── 文件上传处理 ───
  const handleUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string)?.split(',')[1];
      if (base64) {
        uploadFile({ filename: file.name, base64 });
      }
    };
    reader.readAsDataURL(file);
    return false; // 阻止 Ant Design 默认上传
  }, [uploadFile]);

  const handleTextUpload = useCallback(() => {
    const text = window.prompt('请粘贴文本内容：');
    if (text && text.trim()) {
      uploadFile({ filename: '粘贴文本.txt', text: text.trim() });
    }
  }, [uploadFile]);

  // ─── 渲染函数 ───
  const renderUploadStep = () => (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <Text style={{ color: THEME.textSecondary, fontSize: 13, display: 'block', marginBottom: 16 }}>
        上传领域文档，系统将自动解析并提取五要素。支持 Office、PDF、图片、音视频等格式。
      </Text>

      <Upload.Dragger
        multiple={false}
        showUploadList={false}
        beforeUpload={handleUpload}
        accept=".doc,.docx,.pdf,.xlsx,.xls,.pptx,.ppt,.txt,.md,.csv,.jpg,.jpeg,.png,.gif,.mp3,.wav,.mp4,.avi"
        style={{
          background: THEME.bgSecondary,
          border: `2px dashed ${THEME.borderDefault}`,
          borderRadius: 8,
          padding: '32px 24px',
        }}
      >
        <UploadOutlined style={{ fontSize: 36, color: THEME.accent, marginBottom: 12 }} />
        <div><Text style={{ color: THEME.textSecondary, fontSize: 14 }}>点击或拖拽文件到此区域上传</Text></div>
        <div style={{ marginTop: 6 }}>
          <Text style={{ color: THEME.textTertiary, fontSize: 12 }}>
            支持 .docx .pdf .xlsx .pptx .txt .md .jpg .mp3 .mp4
          </Text>
        </div>
      </Upload.Dragger>

      <Button
        type="link"
        icon={<FileTextOutlined />}
        onClick={handleTextUpload}
        style={{ marginTop: 8, color: THEME.accent, padding: 0 }}
      >
        或直接粘贴文本内容
      </Button>

      {uploadedFiles.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Text style={{ color: THEME.textSecondary, fontSize: 12, marginBottom: 8, display: 'block' }}>
            已上传文件
          </Text>
          {uploadedFiles.map((f) => (
            <div key={f.fileId} style={{
              padding: '10px 14px',
              background: THEME.bgSecondary,
              border: `1px solid ${THEME.borderDefault}`,
              borderRadius: 6,
              marginBottom: 6,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileTextOutlined style={{ color: THEME.accent }} />
                <Text style={{ color: THEME.textPrimary, fontSize: 13 }}>{f.filename}</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: THEME.textTertiary, fontSize: 12 }}>{f.charCount} 字</Text>
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeFile(f.fileId)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 领域名称输入 */}
      <div style={{ marginTop: 20 }}>
        <Text style={{ color: THEME.textSecondary, fontSize: 12, marginBottom: 6, display: 'block' }}>
          领域名称（可选，保存时使用）
        </Text>
        <Input
          value={domainName}
          onChange={(e) => setDomainName(e.target.value)}
          placeholder="例如：石油勘探、政务审批、医疗诊断"
          style={{
            background: THEME.bgSecondary,
            borderColor: THEME.borderDefault,
            color: THEME.textPrimary,
          }}
        />
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {uploadedFiles.length > 0 && (
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileTextOutlined style={{ color: THEME.accent }} />
          <Text style={{ color: THEME.textSecondary, fontSize: 13 }}>
            {uploadedFiles[0]?.filename} · {uploadedFiles[0]?.charCount} 字
          </Text>
        </div>
      )}

      <div style={{
        background: THEME.bgSecondary,
        border: `1px solid ${THEME.borderDefault}`,
        borderRadius: 8,
        padding: 20,
        maxHeight: 'calc(100vh - 260px)',
        overflow: 'auto',
      }}>
        {previewMarkdown || uploadedFiles[0]?.markdown ? (
          <div className="markdown-body" style={{ color: THEME.textPrimary, fontSize: 14, lineHeight: 1.7 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {previewMarkdown || uploadedFiles[0]?.markdown || ''}
            </ReactMarkdown>
          </div>
        ) : (
          <Empty description="正在解析文档..." />
        )}
      </div>

      <Text style={{ color: THEME.textTertiary, fontSize: 12, marginTop: 8, display: 'block' }}>
        点击「下一步」将自动调用 AI 提取五要素概念
      </Text>
    </div>
  );

  const renderExtractStep = () => {
    if (extracting) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <ThunderboltOutlined style={{ fontSize: 48, color: THEME.accent, marginBottom: 16 }} />
          <Title level={4} style={{ color: THEME.textPrimary, marginBottom: 8 }}>AI 正在提取五要素...</Title>
          <Text style={{ color: THEME.textSecondary }}>
            优先使用 five-elements-ontology 技能，回退到规则基线提取
          </Text>
          <Progress percent={100} status="active" style={{ maxWidth: 300, margin: '20px auto' }} />
        </div>
      );
    }

    return (
      <div>
        {/* 统计栏 */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16, padding: '10px 16px',
          background: THEME.bgSecondary, borderRadius: 6,
          border: `1px solid ${THEME.borderDefault}`,
        }}>
          <Space>
            <Text style={{ color: THEME.textSecondary, fontSize: 13 }}>
              候选概念 {confirmedConcepts.length}/{candidateConcepts.length} 已确认
            </Text>
            {candidateConcepts.length > 0 && (
              <Text style={{ color: THEME.textTertiary, fontSize: 12 }}>
                （按要素类型分组展示）
              </Text>
            )}
          </Space>
          <Space>
            <Button size="small" onClick={confirmAllConcepts} icon={<CheckOutlined />}>
              全部确认
            </Button>
          </Space>
        </div>

        {candidateConcepts.length === 0 ? (
          <Empty description="暂无候选概念，请先上传文档并提取" />
        ) : (
          /* 按要素类型分组 */
          (() => {
            const groups = new Map<ExtendedElementType, CandidateConcept[]>();
            candidateConcepts.forEach((c) => {
              const list = groups.get(c.element_type) || [];
              list.push(c);
              groups.set(c.element_type, list);
            });

            return Array.from(groups.entries()).map(([elementType, concepts]) => {
              const config = ELEMENT_CONFIG[elementType];
              return (
                <div key={elementType} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Tag color={config.color} style={{ margin: 0 }}>{config.label}</Tag>
                    <Text style={{ color: THEME.textTertiary, fontSize: 12 }}>
                      {concepts.filter((c) => c.confirmed).length}/{concepts.length}
                    </Text>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 8,
                  }}>
                    {concepts.map((c) => (
                      <ConceptCard
                        key={c.id}
                        concept={c}
                        isEditing={editingConcept === c.id}
                        onToggleConfirm={() => toggleConceptConfirmed(c.id)}
                        onEdit={() => setEditingConcept(editingConcept === c.id ? null : c.id)}
                        onUpdate={(updates) => {
                          updateCandidateConcept(c.id, updates);
                          setEditingConcept(null);
                        }}
                        onRemove={() => removeCandidateConcept(c.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            });
          })()
        )}
      </div>
    );
  };

  const renderRelationStep = () => {
    if (buildingRelations) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <ApartmentOutlined style={{ fontSize: 48, color: THEME.accent, marginBottom: 16 }} />
          <Title level={4} style={{ color: THEME.textPrimary, marginBottom: 8 }}>正在建立关系...</Title>
          <Progress percent={100} status="active" style={{ maxWidth: 300, margin: '20px auto' }} />
        </div>
      );
    }

    return (
      <div>
        {/* 统计栏 */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16, padding: '10px 16px',
          background: THEME.bgSecondary, borderRadius: 6,
          border: `1px solid ${THEME.borderDefault}`,
        }}>
          <Space>
            <Text style={{ color: THEME.textSecondary, fontSize: 13 }}>
              候选关系 {confirmedRelations.length}/{candidateRelations.length} 已确认
            </Text>
          </Space>
          <Space>
            <Button size="small" onClick={confirmAllRelations} icon={<CheckOutlined />}>
              全部确认
            </Button>
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddRelationOpen(true)}
            >
              添加关系
            </Button>
          </Space>
        </div>

        {candidateRelations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Empty
              description={
                <Space direction="vertical">
                  <Text style={{ color: THEME.textSecondary }}>暂无候选关系</Text>
                  <Text style={{ color: THEME.textTertiary, fontSize: 12 }}>
                    AI 关系提取功能开发中，可手动添加概念间关系
                  </Text>
                </Space>
              }
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddRelationOpen(true)}
              style={{ marginTop: 16 }}
            >
              手动添加关系
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {candidateRelations.map((r) => (
              <RelationCard
                key={r.id}
                relation={r}
                onToggleConfirm={() => toggleRelationConfirmed(r.id)}
                onRemove={() => removeCandidateRelation(r.id)}
              />
            ))}
          </div>
        )}

        {/* 添加关系抽屉 */}
        <AddRelationDrawer
          open={addRelationOpen}
          onClose={() => setAddRelationOpen(false)}
          concepts={confirmedConcepts}
          onAdd={(rel) => {
            // 手动添加的关系直接放入 store
            useModelingStore.setState((state) => ({
              candidateRelations: [...state.candidateRelations, { ...rel, confirmed: true }],
            }));
            setAddRelationOpen(false);
            message.success('关系已添加');
          }}
        />
      </div>
    );
  };

  const renderSaveStep = () => (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {store.currentStep === 'save' && !saving && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(34, 197, 94, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <SaveOutlined style={{ fontSize: 32, color: THEME.success }} />
          </div>

          <Title level={4} style={{ color: THEME.textPrimary, marginBottom: 12 }}>
            确认保存
          </Title>

          <div style={{
            background: THEME.bgSecondary, borderRadius: 8,
            border: `1px solid ${THEME.borderDefault}`,
            padding: 20, marginBottom: 20, textAlign: 'left',
          }}>
            <div style={{ marginBottom: 16 }}>
              <Text style={{ color: THEME.textSecondary, fontSize: 12, display: 'block', marginBottom: 6 }}>
                领域名称 *
              </Text>
              <Input
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                placeholder="输入领域名称"
                style={{
                  background: THEME.bgCard,
                  borderColor: THEME.borderDefault,
                  color: THEME.textPrimary,
                }}
              />
            </div>

            <Divider style={{ borderColor: THEME.borderDefault, margin: '16px 0' }} />

            <Flex gap={24} justify="center">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: THEME.accent }}>
                  {confirmedConcepts.length}
                </div>
                <Text style={{ color: THEME.textTertiary, fontSize: 12 }}>已确认概念</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: THEME.success }}>
                  {confirmedRelations.length}
                </div>
                <Text style={{ color: THEME.textTertiary, fontSize: 12 }}>已确认关系</Text>
              </div>
            </Flex>

            {/* 要素分布 */}
            {confirmedConcepts.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Text style={{ color: THEME.textTertiary, fontSize: 12, display: 'block', marginBottom: 8 }}>
                  要素分布
                </Text>
                <Flex wrap="wrap" gap={6}>
                  {(() => {
                    const dist = new Map<ExtendedElementType, number>();
                    confirmedConcepts.forEach((c) => {
                      dist.set(c.element_type, (dist.get(c.element_type) || 0) + 1);
                    });
                    return Array.from(dist.entries()).map(([type, count]) => (
                      <Tag key={type} color={ELEMENT_CONFIG[type].color}>
                        {ELEMENT_CONFIG[type].label} {count}
                      </Tag>
                    ));
                  })()}
                </Flex>
              </div>
            )}
          </div>

          <Button
            type="primary"
            size="large"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            disabled={!domainName.trim() || confirmedConcepts.length === 0}
            style={{ minWidth: 160 }}
          >
            保存到知识库
          </Button>
        </div>
      )}

      {/* 保存中 */}
      {saving && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <SaveOutlined style={{ fontSize: 48, color: THEME.accent, marginBottom: 16 }} />
          <Title level={4} style={{ color: THEME.textPrimary }}>正在保存...</Title>
          <Progress percent={100} status="active" style={{ maxWidth: 300, margin: '20px auto' }} />
        </div>
      )}
    </div>
  );

  // ─── 主渲染 ───
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 步骤指示器 */}
      <div style={{
        padding: '12px 24px',
        borderBottom: `1px solid ${THEME.borderDefault}`,
        background: THEME.bgPrimary,
      }}>
        <Steps
          current={currentStepIndex}
          items={STEP_CONFIG.map((s) => ({
            title: s.title,
            icon: s.icon,
            description: currentStepIndex === STEP_INDEX[s.key] ? s.desc : undefined,
          }))}
          size="small"
        />
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {error && (
          <div style={{
            padding: '10px 16px',
            marginBottom: 16,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 6,
            color: THEME.danger,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <ExclamationCircleOutlined />
            {error}
          </div>
        )}

        {currentStep === 'upload' && renderUploadStep()}
        {currentStep === 'preview' && renderPreviewStep()}
        {currentStep === 'extract' && renderExtractStep()}
        {currentStep === 'relation' && renderRelationStep()}
        {currentStep === 'save' && renderSaveStep()}
      </div>

      {/* 底部操作栏 */}
      <div style={{
        padding: '12px 24px',
        borderTop: `1px solid ${THEME.borderDefault}`,
        background: THEME.bgPrimary,
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <Popconfirm
          title="确定重置建模流程？"
          description="所有已上传的文件和提取结果将被清除"
          onConfirm={resetFlow}
          okText="确定"
          cancelText="取消"
        >
          <Button>重置</Button>
        </Popconfirm>
        <Space>
          {currentStepIndex > 0 && (
            <Button onClick={handlePrev}>上一步</Button>
          )}
          {currentStepIndex < 4 && (
            <Button
              type="primary"
              onClick={handleNext}
              loading={extracting || buildingRelations}
            >
              {currentStep === 'preview' ? '开始提取' :
               currentStep === 'extract' ? '建立关系' :
               currentStep === 'relation' ? '去保存' : '下一步'}
            </Button>
          )}
        </Space>
      </div>
    </div>
  );
};

// ─── 候选概念卡片 ───
interface ConceptCardProps {
  concept: CandidateConcept;
  isEditing: boolean;
  onToggleConfirm: () => void;
  onEdit: () => void;
  onUpdate: (updates: Partial<CandidateConcept>) => void;
  onRemove: () => void;
}

const ConceptCard: React.FC<ConceptCardProps> = ({
  concept, isEditing, onToggleConfirm, onEdit, onUpdate, onRemove,
}) => {
  const config = ELEMENT_CONFIG[concept.element_type];
  const [editName, setEditName] = useState(concept.name);
  const [editType, setEditType] = useState<ExtendedElementType>(concept.element_type);
  const [editRole, setEditRole] = useState<SystemRoleWithUniversal>(concept.system_role);
  const [editDef, setEditDef] = useState(concept.definition || '');

  return (
    <div style={{
      padding: 12,
      background: concept.confirmed ? `${config.color}08` : THEME.bgSecondary,
      border: `1px solid ${concept.confirmed ? `${config.color}40` : THEME.borderDefault}`,
      borderRadius: 6,
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {isEditing ? (
            <Input
              size="small"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              style={{ marginBottom: 4, background: THEME.bgCard, borderColor: THEME.borderDefault, color: THEME.textPrimary }}
            />
          ) : (
            <Text style={{
              color: THEME.textPrimary, fontSize: 13, fontWeight: 500,
              display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {concept.name}
            </Text>
          )}
        </div>
        <Space size={4}>
          <Tooltip title={concept.confirmed ? '取消确认' : '确认'}>
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined />}
              style={{
                color: concept.confirmed ? THEME.success : THEME.textTertiary,
                background: concept.confirmed ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
              }}
              onClick={onToggleConfirm}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={onEdit}
              style={{ color: THEME.textTertiary }} />
          </Tooltip>
          <Tooltip title="删除">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={onRemove} />
          </Tooltip>
        </Space>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {isEditing ? (
          <>
            <Select
              size="small"
              value={editType}
              onChange={(v) => setEditType(v)}
              style={{ width: 80 }}
              options={Object.entries(ELEMENT_CONFIG).map(([key, cfg]) => ({
                value: key, label: cfg.label,
              }))}
            />
            <Select
              size="small"
              value={editRole}
              onChange={(v) => setEditRole(v)}
              style={{ width: 90 }}
              options={Object.entries(SYSTEM_ROLE_LABELS).map(([key, label]) => ({
                value: key, label,
              }))}
            />
          </>
        ) : (
          <>
            <Tag color={config.color} style={{ margin: 0, fontSize: 11 }}>{config.label}</Tag>
            <Tag style={{
              margin: 0, fontSize: 11,
              color: concept.system_role === 'active_system' ? '#60A5FA' :
                     concept.system_role === 'object_system' ? '#F472B6' : THEME.textTertiary,
              background: concept.system_role === 'active_system' ? 'rgba(96,165,250,0.1)' :
                          concept.system_role === 'object_system' ? 'rgba(244,114,182,0.1)' : 'transparent',
              border: `1px solid ${concept.system_role === 'active_system' ? 'rgba(96,165,250,0.3)' :
                       concept.system_role === 'object_system' ? 'rgba(244,114,182,0.3)' : THEME.borderDefault}`,
            }}>
              {SYSTEM_ROLE_LABELS[concept.system_role]}
            </Tag>
          </>
        )}
      </div>

      {/* 置信度 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Text style={{ color: THEME.textTertiary, fontSize: 11 }}>置信度</Text>
        <div style={{ flex: 1, maxWidth: 80 }}>
          <Slider
            min={0} max={1} step={0.1}
            value={concept.confidence}
            disabled={!isEditing}
            onChange={(v) => onUpdate({ confidence: v })}
            styles={{
              track: { background: concept.confidence > 0.6 ? THEME.success : THEME.warning },
            }}
          />
        </div>
        <Text style={{
          color: concept.confidence > 0.6 ? THEME.success : THEME.warning,
          fontSize: 11, fontWeight: 500,
        }}>
          {Math.round(concept.confidence * 100)}%
        </Text>
      </div>

      {/* 定义 / 来源 */}
      {(concept.definition || concept.source_text) && !isEditing && (
        <Text style={{
          color: THEME.textTertiary, fontSize: 11,
          display: 'block', marginTop: 4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {concept.definition || concept.source_text}
        </Text>
      )}

      {/* 编辑模式：定义输入 */}
      {isEditing && (
        <div style={{ marginTop: 6 }}>
          <Input.TextArea
            size="small"
            value={editDef}
            onChange={(e) => setEditDef(e.target.value)}
            placeholder="概念定义"
            rows={2}
            style={{ background: THEME.bgCard, borderColor: THEME.borderDefault, color: THEME.textPrimary }}
          />
          <div style={{ marginTop: 6, display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
            <Button size="small" onClick={onEdit}>取消</Button>
            <Button
              size="small"
              type="primary"
              onClick={() => onUpdate({
                name: editName,
                element_type: editType,
                system_role: editRole,
                definition: editDef,
              })}
            >
              保存
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── 候选关系卡片 ───
interface RelationCardProps {
  relation: CandidateRelation;
  onToggleConfirm: () => void;
  onRemove: () => void;
}

const RelationCard: React.FC<RelationCardProps> = ({ relation, onToggleConfirm, onRemove }) => {
  const relConfig = RELATION_TYPE_CONFIG[relation.relation_type];
  const isDynamic = relConfig?.kind === 'dynamic';

  return (
    <div style={{
      padding: '10px 14px',
      background: relation.confirmed ? 'rgba(34, 197, 94, 0.04)' : THEME.bgSecondary,
      border: `1px solid ${relation.confirmed ? 'rgba(34, 197, 94, 0.2)' : THEME.borderDefault}`,
      borderRadius: 6,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <Button
        type="text"
        size="small"
        icon={<CheckOutlined />}
        style={{
          color: relation.confirmed ? THEME.success : THEME.textTertiary,
          background: relation.confirmed ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
          flexShrink: 0,
        }}
        onClick={onToggleConfirm}
      />

      {/* 源概念 */}
      <Tag style={{ margin: 0, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {relation.source_name}
      </Tag>

      {/* 关系类型 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        flexShrink: 0,
      }}>
        <ArrowRightOutlined style={{ color: isDynamic ? '#4B7EB8' : THEME.textTertiary, fontSize: 10 }} />
        <Tag
          color={isDynamic ? 'blue' : 'default'}
          style={{ margin: 0, fontSize: 11 }}
        >
          {relation.relation_type}
        </Tag>
        <ArrowRightOutlined style={{ color: isDynamic ? '#4B7EB8' : THEME.textTertiary, fontSize: 10 }} />
      </div>

      {/* 目标概念 */}
      <Tag style={{ margin: 0, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {relation.target_name}
      </Tag>

      {/* 置信度 */}
      <Text style={{
        color: relation.confidence > 0.6 ? THEME.success : THEME.warning,
        fontSize: 11, flexShrink: 0,
      }}>
        {Math.round(relation.confidence * 100)}%
      </Text>

      <div style={{ flex: 1 }} />

      <Tooltip title="删除">
        <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={onRemove} />
      </Tooltip>
    </div>
  );
};

// ─── 添加关系抽屉 ───
interface AddRelationDrawerProps {
  open: boolean;
  onClose: () => void;
  concepts: CandidateConcept[];
  onAdd: (rel: CandidateRelation) => void;
}

const AddRelationDrawer: React.FC<AddRelationDrawerProps> = ({ open, onClose, concepts, onAdd }) => {
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [relationType, setRelationType] = useState<RelationType>('利用');

  const handleAdd = () => {
    if (!sourceId || !targetId) {
      message.warning('请选择源概念和目标概念');
      return;
    }
    if (sourceId === targetId) {
      message.warning('源概念和目标概念不能相同');
      return;
    }

    const source = concepts.find((c) => c.id === sourceId);
    const target = concepts.find((c) => c.id === targetId);
    if (!source || !target) return;

    onAdd({
      id: 'tmp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      source_id: source.id,
      source_name: source.name,
      target_id: target.id,
      target_name: target.name,
      relation_type: relationType,
      confidence: 1.0,
      confirmed: true,
    });

    setSourceId(null);
    setTargetId(null);
    setRelationType('利用');
  };

  const conceptOptions = concepts.map((c) => ({
    value: c.id,
    label: `${c.name}（${ELEMENT_CONFIG[c.element_type].label}）`,
  }));

  return (
    <Drawer
      title="添加关系"
      open={open}
      onClose={onClose}
      width={400}
      styles={{
        header: { background: THEME.bgPrimary, borderBottom: `1px solid ${THEME.borderDefault}` },
        body: { background: THEME.bgPrimary },
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <Text style={{ color: THEME.textSecondary, fontSize: 12, display: 'block', marginBottom: 6 }}>
            源概念
          </Text>
          <Select
            showSearch
            style={{ width: '100%' }}
            placeholder="选择源概念"
            value={sourceId}
            onChange={setSourceId}
            options={conceptOptions}
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase()) ?? false
            }
          />
        </div>

        <div>
          <Text style={{ color: THEME.textSecondary, fontSize: 12, display: 'block', marginBottom: 6 }}>
            关系类型
          </Text>
          <Select
            style={{ width: '100%' }}
            value={relationType}
            onChange={(v) => setRelationType(v)}
            options={Object.entries(RELATION_TYPE_CONFIG).map(([type, cfg]) => ({
              value: type,
              label: `${type} — ${cfg.desc}`,
            }))}
          />
        </div>

        <div>
          <Text style={{ color: THEME.textSecondary, fontSize: 12, display: 'block', marginBottom: 6 }}>
            目标概念
          </Text>
          <Select
            showSearch
            style={{ width: '100%' }}
            placeholder="选择目标概念"
            value={targetId}
            onChange={setTargetId}
            options={conceptOptions}
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase()) ?? false
            }
          />
        </div>

        <Button type="primary" block icon={<PlusOutlined />} onClick={handleAdd}>
          添加关系
        </Button>
      </div>
    </Drawer>
  );
};

export default Modeling;
