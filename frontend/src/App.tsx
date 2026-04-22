import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppLayout from './layouts/AppLayout';
import Browse from './pages/Browse';
import Modeling from './pages/Modeling';
import Graph from './pages/Graph';
import ProblemGoal from './pages/ProblemGoal';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';

// Ant Design Theme Configuration - Dark Professional (OLED暗色主题)
const appTheme = {
  token: {
    colorPrimary: '#3B82F6',
    colorSuccess: '#22C55E',
    colorWarning: '#F59E0B',
    colorError: '#EF4444',
    colorInfo: '#3B82F6',
    colorTextBase: '#FFFFFF',
    colorTextSecondary: '#E5E5E5',
    colorTextTertiary: '#A3A3A3',
    colorTextDisabled: '#525252',
    colorBgBase: '#0D0D0D',
    colorBgContainer: '#171717',
    colorBgElevated: '#1F1F1F',
    colorBgLayout: '#000000',
    colorBorder: '#2D2D2D',
    colorBorderSecondary: '#404040',
    
    fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui",
    fontFamilyCode: "'JetBrains Mono', 'SF Mono', monospace",
    
    borderRadius: 6,
    borderRadiusSM: 4,
    borderRadiusLG: 8,
    borderRadiusXS: 4,
    
    motionDurationFast: '150ms',
    motionDurationMid: '200ms',
    motionDurationSlow: '300ms',
    
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
    boxShadowSecondary: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },
  algorithm: theme.darkAlgorithm,
  components: {
    Layout: {
      headerBg: '#171717',
      siderBg: '#171717',
      bodyBg: '#0D0D0D',
      triggerBg: '#262626',
      triggerColor: '#A3A3A3',
    },
    Card: {
      borderRadiusLG: 8,
      colorBorder: '#2D2D2D',
      colorBgContainer: '#171717',
    },
    Button: {
      borderRadius: 6,
      controlHeight: 32,
      paddingInline: 16,
    },
    Input: {
      borderRadius: 6,
      controlHeight: 32,
      colorBgContainer: '#0D0D0D',
      colorBorder: '#2D2D2D',
      colorTextPlaceholder: '#525252',
    },
    Select: {
      borderRadius: 6,
      controlHeight: 32,
      colorBgContainer: '#0D0D0D',
      colorBorder: '#2D2D2D',
      optionSelectedBg: 'rgba(59, 130, 246, 0.1)',
    },
    Modal: {
      borderRadiusLG: 12,
      contentBg: '#171717',
      headerBg: '#171717',
      colorText: '#FFFFFF',
    },
    Tree: {
      directoryNodeSelectedBg: 'rgba(59, 130, 246, 0.1)',
      directoryNodeSelectedColor: '#3B82F6',
      colorBgContainer: '#171717',
      colorBorder: '#2D2D2D',
    },
    Steps: {
      colorPrimary: '#3B82F6',
      colorTextDescription: '#A3A3A3',
      colorTextLabel: '#FFFFFF',
    },
    Tag: {
      borderRadiusSM: 4,
    },
    Table: {
      colorBgContainer: '#171717',
      colorBorder: '#2D2D2D',
      colorText: '#FFFFFF',
      colorTextHeading: '#A3A3A3',
      colorBgHeader: '#262626',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(59, 130, 246, 0.1)',
      darkItemHoverBg: 'rgba(59, 130, 246, 0.05)',
      darkItemColor: '#A3A3A3',
      darkItemSelectedColor: '#3B82F6',
    },
  },
};

function App() {
  return (
    <ConfigProvider locale={zhCN} theme={appTheme}>
      <AntdApp>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout><Navigate to="/browse" replace /></AppLayout>} />
            <Route path="/browse" element={<AppLayout><Browse /></AppLayout>} />
            <Route path="/modeling" element={<AppLayout><Modeling /></AppLayout>} />
            <Route path="/graph" element={<AppLayout><Graph /></AppLayout>} />
            <Route path="/problems" element={<AppLayout><ProblemGoal /></AppLayout>} />
            <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
            <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
          </Routes>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
