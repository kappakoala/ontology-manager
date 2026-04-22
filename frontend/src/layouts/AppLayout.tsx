/**
 * AppLayout - 主布局
 *
 * 基于 DESIGN.md 的 Dark Professional 主题
 * 顶部导航栏 + 全宽内容区
 */
import React from 'react';
import { Layout, Menu, Typography } from 'antd';
import {
  DatabaseOutlined,
  BuildOutlined,
  ApartmentOutlined,
  AimOutlined,
  DashboardOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header, Content } = Layout;
const { Text } = Typography;

const NAV_ITEMS = [
  { key: '/browse', icon: <DatabaseOutlined />, label: '本体浏览' },
  { key: '/modeling', icon: <BuildOutlined />, label: '本体建模' },
  { key: '/graph', icon: <ApartmentOutlined />, label: '知识图谱' },
  { key: '/problems', icon: <AimOutlined />, label: '问题目标' },
  { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
];

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // 匹配当前路由到导航项
  const selectedKey = NAV_ITEMS.find((item) =>
    location.pathname.startsWith(item.key)
  )?.key || '/browse';

  return (
    <Layout style={{ height: '100vh', background: '#0D0D0D' }}>
      {/* 顶部导航 */}
      <Header
        style={{
          height: 48,
          lineHeight: '48px',
          padding: '0 16px',
          background: '#171717',
          borderBottom: '1px solid #2D2D2D',
          display: 'flex',
          alignItems: 'center',
          gap: 0,
        }}
      >
        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginRight: 24,
          flexShrink: 0,
        }}>
          <div style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            background: 'linear-gradient(135deg, #3B82F6 0%, #A78BFA 100%)',
          }} />
          <Text strong style={{ color: '#FFFFFF', fontSize: 14, marginLeft: 8, whiteSpace: 'nowrap' }}>
            本体管理
          </Text>
        </div>

        {/* 导航菜单 */}
        <Menu
          mode="horizontal"
          selectedKeys={[selectedKey]}
          onClick={({ key }) => navigate(key)}
          items={NAV_ITEMS.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
          }))}
          style={{
            background: 'transparent',
            borderBottom: 'none',
            flex: 1,
            minWidth: 0,
            lineHeight: '46px',
          }}
          theme="dark"
        />

        {/* 右侧设置 */}
        <Menu
          mode="horizontal"
          selectable={false}
          items={[
            {
              key: '/settings',
              icon: <SettingOutlined />,
            },
          ]}
          onClick={() => navigate('/settings')}
          style={{
            background: 'transparent',
            borderBottom: 'none',
            lineHeight: '46px',
            minWidth: 'auto',
          }}
          theme="dark"
        />
      </Header>

      {/* 内容区 - 全宽 */}
      <Content style={{ height: 'calc(100vh - 48px)', overflow: 'auto' }}>
        {children}
      </Content>
    </Layout>
  );
};

export default AppLayout;
