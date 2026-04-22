/**
 * 知识图谱页面 - D3 力导向图可视化
 *
 * 设计方案：统一圆形节点 + 色彩编码 + 双环系统角色 + 药丸边标签
 * - 节点：圆形 + 要素色填充/描边 + 系统角色外环 + 内部类型缩写
 * - 边：动态实线/静态虚线 + 药丸标签 + 箭头
 * - 交互：拖拽/缩放/悬停高亮/点击详情
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Select,
  Button,
  Space,
  Tooltip,
  Typography,
  Tag,
  Segmented,
  Empty,
  Spin,
  Drawer,
  Descriptions,
} from 'antd';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  FullscreenOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import * as d3 from 'd3';
import { graphApi } from '../../services/api';
import { ELEMENT_CONFIG, SYSTEM_ROLE_LABELS, RELATION_TYPE_CONFIG } from '../../types';
import type { GraphViewMode, GraphLayout } from '../../types';

const { Text } = Typography;

// ─────────────────────────────────────────────
// 视图模式和布局选项
// ─────────────────────────────────────────────
const VIEW_MODES: { label: string; value: GraphViewMode }[] = [
  { label: '全系统', value: 'full' },
  { label: '五要素', value: 'elements' },
  { label: '两系统', value: 'systems' },
  { label: '问题目标', value: 'problem-goal' },
];

const LAYOUT_OPTIONS: { label: string; value: GraphLayout }[] = [
  { label: '力导向', value: 'force' },
  { label: '层次', value: 'hierarchy' },
  { label: '径向', value: 'radial' },
];

// ─────────────────────────────────────────────
// 节点/边数据类型（从后端 graph API 来）
// ─────────────────────────────────────────────
interface GraphNodeData {
  id: string;
  name: string;
  element_type: string;
  system_role: string;
  is_universal: number;
}

interface GraphEdgeData {
  id: string;
  source_id: string;
  target_id: string;
  relation_type: string;
  rel_kind: string;
  source_name?: string;
  target_name?: string;
}

// D3 内部节点/边类型
interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  element_type: string;
  system_role: string;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  id: string;
  relation_type: string;
  rel_kind: string;
}

// ─────────────────────────────────────────────
// 视图模式过滤逻辑
// ─────────────────────────────────────────────
const ELEMENT_TYPES_BY_VIEW: Record<string, string[]> = {
  full: ['subject', 'behavior', 'object', 'time', 'space', 'problem', 'goal', 'indicator'],
  elements: ['subject', 'behavior', 'object', 'time', 'space'],
  systems: ['subject', 'behavior', 'object', 'time', 'space'],
  'problem-goal': ['problem', 'goal', 'indicator', 'subject'],
};

// ─────────────────────────────────────────────
// 节点样式常量
// ─────────────────────────────────────────────
const NODE_R = 20; // 节点半径
const SYSTEM_RING_R = 26; // 系统角色外环半径
const SYSTEM_RING_DASH = '4 3'; // 外环虚线

/** 要素类型缩写（节点内部显示） */
const ELEMENT_ABBR: Record<string, string> = {
  subject: '主',
  behavior: '行',
  object: '客',
  time: '时',
  space: '空',
  problem: '问',
  goal: '目',
  indicator: '指',
};

/** 系统角色对应的外环颜色 */
function getSystemRingColor(role: string): string | null {
  switch (role) {
    case 'active_system': return '#60A5FA'; // 蓝色
    case 'object_system': return '#F472B6'; // 粉色
    default: return null; // 通用不加外环
  }
}

// ─────────────────────────────────────────────
// 组件
// ─────────────────────────────────────────────
const Graph: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [viewMode, setViewMode] = useState<GraphViewMode>('full');
  const [layout, setLayout] = useState<GraphLayout>('force');
  const [loading, setLoading] = useState(false);
  const [nodeCount, setNodeCount] = useState(0);
  const [edgeCount, setEdgeCount] = useState(0);
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [graphData, setGraphData] = useState<{ nodes: GraphNodeData[]; edges: GraphEdgeData[] }>({ nodes: [], edges: [] });

  // ─────────────────────────────────────────────
  // 获取图谱数据
  // ─────────────────────────────────────────────
  const fetchGraphData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await graphApi.getData(undefined, 200);
      const data = res.data;
      setGraphData({ nodes: data.nodes || [], edges: data.edges || [] });
      setNodeCount((data.nodes || []).length);
      setEdgeCount((data.edges || []).length);
    } catch {
      setGraphData({ nodes: [], edges: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  // ─────────────────────────────────────────────
  // 视图模式过滤
  // ─────────────────────────────────────────────
  const getFilteredData = useCallback(() => {
    const allowedTypes = ELEMENT_TYPES_BY_VIEW[viewMode] || ELEMENT_TYPES_BY_VIEW.full;
    const filteredNodes = graphData.nodes.filter(n => allowedTypes.includes(n.element_type));
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = graphData.edges.filter(
      e => nodeIds.has(e.source_id) && nodeIds.has(e.target_id)
    );
    return { nodes: filteredNodes, edges: filteredEdges };
  }, [graphData, viewMode]);

  // ─────────────────────────────────────────────
  // D3 力导向图渲染
  // ─────────────────────────────────────────────
  const renderGraph = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    // 清除旧 SVG
    d3.select(container).select('svg').remove();

    const { nodes: rawNodes, edges: rawEdges } = getFilteredData();
    if (rawNodes.length === 0) return;

    // 构建 D3 数据
    const nodes: SimNode[] = rawNodes.map(n => ({
      id: n.id,
      name: n.name,
      element_type: n.element_type,
      system_role: n.system_role,
    }));

    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    const links: SimLink[] = rawEdges
      .filter(e => nodeMap.has(e.source_id) && nodeMap.has(e.target_id))
      .map(e => ({
        id: e.id,
        source: e.source_id,
        target: e.target_id,
        relation_type: e.relation_type,
        rel_kind: e.rel_kind,
      }));

    // 创建 SVG
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background', '#0D0D0D');

    svgRef.current = svg.node();

    // 缩放
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);
    zoomRef.current = zoom;

    const g = svg.append('g');

    // ── 箭头标记定义（每种关系类型一个颜色）──
    const defs = svg.append('defs');

    // 动态关系箭头（蓝色）
    defs.append('marker')
      .attr('id', 'arrow-dynamic')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 34)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', '#4B7EB8');

    // 静态关系箭头（灰色）
    defs.append('marker')
      .attr('id', 'arrow-static')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 34)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', '#505050');

    // 力模拟
    const simulation = d3.forceSimulation<SimNode>(nodes)
      .force('link', d3.forceLink<SimNode, SimLink>(links)
        .id(d => d.id)
        .distance(160)
      )
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(60));

    simulationRef.current = simulation;

    // ── 边 ──
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => {
        const cfg = RELATION_TYPE_CONFIG[d.relation_type as keyof typeof RELATION_TYPE_CONFIG];
        return cfg?.kind === 'static' ? '#3A3A3A' : '#4B7EB8';
      })
      .attr('stroke-width', d => {
        const cfg = RELATION_TYPE_CONFIG[d.relation_type as keyof typeof RELATION_TYPE_CONFIG];
        return cfg?.kind === 'static' ? 1 : 1.5;
      })
      .attr('stroke-dasharray', d => {
        const cfg = RELATION_TYPE_CONFIG[d.relation_type as keyof typeof RELATION_TYPE_CONFIG];
        return cfg?.kind === 'static' ? '6 4' : 'none';
      })
      .attr('stroke-opacity', 0.5)
      .attr('marker-end', d => {
        const cfg = RELATION_TYPE_CONFIG[d.relation_type as keyof typeof RELATION_TYPE_CONFIG];
        return cfg?.kind === 'static' ? 'url(#arrow-static)' : 'url(#arrow-dynamic)';
      });

    // ── 边标签（药丸 pill badge）──
    const linkLabelGroup = g.append('g')
      .selectAll<SVGGElement, SimLink>('g')
      .data(links)
      .join('g');

    // 药丸背景
    linkLabelGroup.each(function(d) {
      const el = d3.select(this);
      const cfg = RELATION_TYPE_CONFIG[d.relation_type as keyof typeof RELATION_TYPE_CONFIG];
      const label = cfg?.label || d.relation_type;
      const isDynamic = cfg?.kind !== 'static';
      const bgColor = isDynamic ? 'rgba(75,126,184,0.15)' : 'rgba(58,58,58,0.25)';
      const borderColor = isDynamic ? 'rgba(75,126,184,0.3)' : 'rgba(58,58,58,0.4)';
      const textColor = isDynamic ? '#8BB4E0' : '#7A7A7A';

      // 先添加文本以测量宽度
      const text = el.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('fill', textColor)
        .attr('font-size', 9)
        .attr('font-weight', 500)
        .text(label);

      // 获取文本边界来画药丸
      // 使用固定宽度估算（避免 getBBox 在 tick 前不可靠）
      const estimatedWidth = label.length * 9 + 10;
      const pillHeight = 16;

      el.insert('rect', 'text')
        .attr('x', -estimatedWidth / 2)
        .attr('y', -pillHeight / 2)
        .attr('width', estimatedWidth)
        .attr('height', pillHeight)
        .attr('rx', pillHeight / 2)
        .attr('ry', pillHeight / 2)
        .attr('fill', bgColor)
        .attr('stroke', borderColor)
        .attr('stroke-width', 0.5);
    });

    // ── 节点组 ──
    const node = g.append('g')
      .selectAll<SVGGElement, SimNode>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, SimNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // ── 节点渲染：统一圆形 + 色彩编码 + 系统角色外环 ──
    node.each(function(d) {
      const el = d3.select(this);
      const cfg = ELEMENT_CONFIG[d.element_type as keyof typeof ELEMENT_CONFIG];
      const color = cfg?.color || '#525252';
      const systemRingColor = getSystemRingColor(d.system_role);

      // 1. 系统角色外环（仅 active_system / object_system）
      if (systemRingColor) {
        el.append('circle')
          .attr('r', SYSTEM_RING_R)
          .attr('fill', 'none')
          .attr('stroke', systemRingColor)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', SYSTEM_RING_DASH)
          .attr('opacity', 0.6);
      }

      // 2. 主节点圆形（要素色填充 + 描边）
      el.append('circle')
        .attr('r', NODE_R)
        .attr('fill', color + '20')  // 12% 透明度填充
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.8);

      // 3. 节点内部类型缩写
      el.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('fill', color)
        .attr('font-size', 12)
        .attr('font-weight', 600)
        .text(ELEMENT_ABBR[d.element_type] || '?');
    });

    // 4. 概念名称标签（节点下方）
    node.append('text')
      .attr('dy', NODE_R + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', '#E5E5E5')
      .attr('font-size', 12)
      .attr('font-weight', 500)
      .text(d => d.name);

    // 5. 要素类型小标签（名称下方）
    node.append('text')
      .attr('dy', NODE_R + 28)
      .attr('text-anchor', 'middle')
      .attr('fill', d => {
        const cfg = ELEMENT_CONFIG[d.element_type as keyof typeof ELEMENT_CONFIG];
        return cfg?.color || '#525252';
      })
      .attr('font-size', 9)
      .attr('opacity', 0.7)
      .text(d => {
        const cfg = ELEMENT_CONFIG[d.element_type as keyof typeof ELEMENT_CONFIG];
        return cfg?.label || '';
      });

    // 点击节点
    node.on('click', (event, d) => {
      event.stopPropagation();
      setSelectedNode(d);
      setDrawerOpen(true);
    });

    // 悬停高亮
    node.on('mouseenter', (event, d) => {
      link.attr('stroke-opacity', l =>
        (l.source as SimNode).id === d.id || (l.target as SimNode).id === d.id ? 0.9 : 0.06
      );
      linkLabelGroup.attr('opacity', l =>
        (l.source as SimNode).id === d.id || (l.target as SimNode).id === d.id ? 1 : 0.06
      );
      node.attr('opacity', n => {
        if (n.id === d.id) return 1;
        const connected = links.some(l =>
          ((l.source as SimNode).id === d.id && (l.target as SimNode).id === n.id) ||
          ((l.target as SimNode).id === d.id && (l.source as SimNode).id === n.id)
        );
        return connected ? 1 : 0.12;
      });
    }).on('mouseleave', () => {
      link.attr('stroke-opacity', 0.5);
      linkLabelGroup.attr('opacity', 1);
      node.attr('opacity', 1);
    });

    // 点击空白取消选择
    svg.on('click', () => {
      setSelectedNode(null);
      setDrawerOpen(false);
    });

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as SimNode).x || 0)
        .attr('y1', d => (d.source as SimNode).y || 0)
        .attr('x2', d => (d.target as SimNode).x || 0)
        .attr('y2', d => (d.target as SimNode).y || 0);

      linkLabelGroup
        .attr('transform', d => {
          const sx = (d.source as SimNode).x || 0;
          const sy = (d.source as SimNode).y || 0;
          const tx = (d.target as SimNode).x || 0;
          const ty = (d.target as SimNode).y || 0;
          return `translate(${(sx + tx) / 2}, ${(sy + ty) / 2})`;
        });

      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });

    // 初始缩放适配
    setTimeout(() => {
      svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity.translate(width / 6, height / 6).scale(0.8)
      );
    }, 500);

  }, [getFilteredData]);

  // ─────────────────────────────────────────────
  // 数据变化时重新渲染
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!loading && graphData.nodes.length > 0) {
      renderGraph();
    }
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [graphData, loading, renderGraph]);

  // 视图模式变化时重新渲染
  useEffect(() => {
    if (graphData.nodes.length > 0 && !loading) {
      renderGraph();
    }
  }, [viewMode]);

  // 窗口大小变化时重新渲染
  useEffect(() => {
    const handleResize = () => {
      if (graphData.nodes.length > 0 && !loading) {
        renderGraph();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [graphData, loading, renderGraph]);

  // ─────────────────────────────────────────────
  // 工具栏操作
  // ─────────────────────────────────────────────
  const handleZoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(
        zoomRef.current.scaleBy, 1.3
      );
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(
        zoomRef.current.scaleBy, 0.7
      );
    }
  };

  const handleFitView = () => {
    if (svgRef.current && zoomRef.current && containerRef.current) {
      const { clientWidth: w, clientHeight: h } = containerRef.current;
      d3.select(svgRef.current).transition().duration(750).call(
        zoomRef.current.transform,
        d3.zoomIdentity.translate(w / 6, h / 6).scale(0.8)
      );
    }
  };

  const handleRelayout = () => {
    if (simulationRef.current) {
      simulationRef.current.alpha(1).restart();
    }
  };

  // ─────────────────────────────────────────────
  // 选中节点的关联边
  // ─────────────────────────────────────────────
  const selectedNodeRelations = selectedNode
    ? graphData.edges.filter(
        e => e.source_id === selectedNode.id || e.target_id === selectedNode.id
      )
    : [];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 工具栏 */}
      <div style={{
        padding: '8px 16px',
        borderBottom: '1px solid #2D2D2D',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#171717',
        flexShrink: 0,
      }}>
        <Space>
          <Segmented
            options={VIEW_MODES}
            value={viewMode}
            onChange={(v) => setViewMode(v as GraphViewMode)}
            size="small"
          />
          <Select
            value={layout}
            onChange={setLayout}
            options={LAYOUT_OPTIONS}
            size="small"
            style={{ width: 100 }}
          />
          <Text style={{ color: '#525252', fontSize: 12 }}>
            {nodeCount} 节点 · {edgeCount} 边
          </Text>
        </Space>
        <Space>
          <Tooltip title="放大"><Button type="text" size="small" icon={<ZoomInOutlined />} onClick={handleZoomIn} /></Tooltip>
          <Tooltip title="缩小"><Button type="text" size="small" icon={<ZoomOutOutlined />} onClick={handleZoomOut} /></Tooltip>
          <Tooltip title="适应画布"><Button type="text" size="small" icon={<FullscreenOutlined />} onClick={handleFitView} /></Tooltip>
          <Tooltip title="重新布局"><Button type="text" size="small" icon={<ReloadOutlined />} onClick={handleRelayout} /></Tooltip>
        </Space>
      </div>

      {/* 图例 */}
      <div style={{
        padding: '4px 16px',
        borderBottom: '1px solid #2D2D2D',
        background: '#131313',
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        flexShrink: 0,
        alignItems: 'center',
      }}>
        {/* 要素图例 */}
        {Object.entries(ELEMENT_CONFIG).map(([key, cfg]) => {
          const activeTypes = ELEMENT_TYPES_BY_VIEW[viewMode] || [];
          const isActive = activeTypes.includes(key);
          return (
            <Tag key={key} style={{
              background: isActive ? `${cfg.color}15` : 'transparent',
              color: isActive ? cfg.color : '#3A3A3A',
              border: `1px solid ${isActive ? cfg.color + '30' : '#2D2D2D'}`,
              margin: 0,
              fontSize: 11,
              opacity: isActive ? 1 : 0.4,
            }}>
              {ELEMENT_ABBR[key] || '?'} {cfg.label}
            </Tag>
          );
        })}
        {/* 系统角色图例 */}
        <span style={{ borderLeft: '1px solid #2D2D2D', paddingLeft: 8, marginLeft: 4, display: 'flex', gap: 8 }}>
          <Tag style={{ margin: 0, fontSize: 11, color: '#60A5FA', border: '1px dashed rgba(96,165,250,0.4)', background: 'rgba(96,165,250,0.06)' }}>
            ◯ 主动系统
          </Tag>
          <Tag style={{ margin: 0, fontSize: 11, color: '#F472B6', border: '1px dashed rgba(244,114,182,0.4)', background: 'rgba(244,114,182,0.06)' }}>
            ◯ 对象系统
          </Tag>
        </span>
        {/* 关系类型图例 */}
        <span style={{ borderLeft: '1px solid #2D2D2D', paddingLeft: 8, marginLeft: 4, display: 'flex', gap: 8 }}>
          <Tag style={{ margin: 0, fontSize: 11, color: '#4B7EB8', background: 'rgba(75,126,184,0.06)', border: '1px solid rgba(75,126,184,0.2)' }}>
            ── 动态关系
          </Tag>
          <Tag style={{ margin: 0, fontSize: 11, color: '#7A7A7A', background: 'rgba(58,58,58,0.12)', border: '1px solid rgba(58,58,58,0.3)' }}>
            ┈┈ 静态关系
          </Tag>
        </span>
      </div>

      {/* 图谱画布 */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', background: '#0D0D0D' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Spin />
          </div>
        ) : graphData.nodes.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Empty description={<span style={{ color: '#525252' }}>暂无图谱数据，请先进行本体建模</span>} />
          </div>
        ) : null}
      </div>

      {/* 节点详情抽屉 */}
      <Drawer
        title={selectedNode?.name || '节点详情'}
        placement="right"
        width={320}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        styles={{
          header: { background: '#171717', borderBottom: '1px solid #2D2D2D' },
          body: { background: '#171717', padding: 16 },
        }}
      >
        {selectedNode && (
          <div>
            <Descriptions column={1} size="small" labelStyle={{ color: '#525252' }} contentStyle={{ color: '#E5E5E5' }}>
              <Descriptions.Item label="名称">{selectedNode.name}</Descriptions.Item>
              <Descriptions.Item label="要素类型">
                <Tag style={{
                  margin: 0,
                  background: `${ELEMENT_CONFIG[selectedNode.element_type as keyof typeof ELEMENT_CONFIG]?.color || '#525252'}15`,
                  color: ELEMENT_CONFIG[selectedNode.element_type as keyof typeof ELEMENT_CONFIG]?.color || '#525252',
                  border: 'none',
                }}>
                  {ELEMENT_ABBR[selectedNode.element_type] || '?'} {ELEMENT_CONFIG[selectedNode.element_type as keyof typeof ELEMENT_CONFIG]?.label || selectedNode.element_type}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="系统角色">
                <Tag style={{
                  margin: 0,
                  background: selectedNode.system_role === 'active_system'
                    ? 'rgba(96,165,250,0.1)'
                    : selectedNode.system_role === 'object_system'
                      ? 'rgba(244,114,182,0.1)'
                      : 'rgba(82,82,82,0.1)',
                  color: selectedNode.system_role === 'active_system'
                    ? '#60A5FA'
                    : selectedNode.system_role === 'object_system'
                      ? '#F472B6'
                      : '#A3A3A3',
                  border: 'none',
                }}>
                  {SYSTEM_ROLE_LABELS[selectedNode.system_role as keyof typeof SYSTEM_ROLE_LABELS] || selectedNode.system_role}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="关联关系数">{selectedNodeRelations.length}</Descriptions.Item>
            </Descriptions>

            {selectedNodeRelations.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Text style={{ fontSize: 12, color: '#525252' }}>关联关系</Text>
                <div style={{ marginTop: 8 }}>
                  {selectedNodeRelations.map(rel => {
                    const isSource = rel.source_id === selectedNode.id;
                    const direction = isSource ? '→' : '←';
                    const otherName = isSource ? rel.target_name : rel.source_name;
                    const cfg = RELATION_TYPE_CONFIG[rel.relation_type as keyof typeof RELATION_TYPE_CONFIG];
                    const isDynamic = cfg?.kind !== 'static';
                    return (
                      <div key={rel.id} style={{
                        padding: '4px 8px',
                        borderRadius: 4,
                        background: '#1A1A1A',
                        border: '1px solid #2D2D2D',
                        marginBottom: 4,
                        fontSize: 12,
                        color: '#E5E5E5',
                      }}>
                        <Tag style={{
                          margin: 0,
                          padding: '0 4px',
                          fontSize: 10,
                          background: isDynamic ? 'rgba(75,126,184,0.12)' : 'rgba(58,58,58,0.2)',
                          color: isDynamic ? '#8BB4E0' : '#7A7A7A',
                          border: 'none',
                        }}>
                          {cfg?.label || rel.relation_type}
                        </Tag>
                        {` ${direction} ${otherName || '未知'}`}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Graph;
