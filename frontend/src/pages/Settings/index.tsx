/**
 * 设置页面 - 系统配置
 *
 * 占位页面，后续实现：
 * - 数据库配置
 * - 技能管理（markitdown/five-elements-ontology）
 * - 通知配置
 * - 导入导出
 */
import React from 'react';
import { Card, Typography, Empty } from 'antd';

const { Title, Paragraph } = Typography;

const Settings: React.FC = () => {
  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <Title level={4} style={{ color: '#FFFFFF', marginBottom: 24 }}>设置</Title>

      <Card style={{ borderColor: '#2D2D2D', marginBottom: 16 }}>
        <Title level={5} style={{ color: '#E5E5E5' }}>系统配置</Title>
        <Paragraph style={{ color: '#525252' }}>系统配置功能待实现</Paragraph>
      </Card>

      <Card style={{ borderColor: '#2D2D2D', marginBottom: 16 }}>
        <Title level={5} style={{ color: '#E5E5E5' }}>技能管理</Title>
        <Paragraph style={{ color: '#525252' }}>markitdown / five-elements-ontology 技能配置待实现</Paragraph>
      </Card>

      <Card style={{ borderColor: '#2D2D2D', marginBottom: 16 }}>
        <Title level={5} style={{ color: '#E5E5E5' }}>数据导入导出</Title>
        <Paragraph style={{ color: '#525252' }}>JSON-LD / RDF / OWL 格式导入导出待实现</Paragraph>
      </Card>
    </div>
  );
};

export default Settings;
