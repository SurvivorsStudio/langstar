import React, { memo, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  Handle,
  MiniMap,
  Node,
  NodeProps,
  Position,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  ArrowLeft, Loader2, Square, CheckCircle2, XCircle, PauseCircle, Clock, MinusCircle,
  Bot, Split, Play, MessageSquare, Group, GitMerge, Database, Check, X, Pause, RotateCcw,
} from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useThemeStore } from '../../store/themeStore';
import * as workflowRunApi from '../../services/workflowRunApi';
import type { NodeRunState, WorkflowRun, EdgeRunState } from '../../services/workflowRunApi';

interface WorkflowRunViewerProps {
  runId: string;
  onBack: () => void;
  onStop: (runId: string) => void;
  /** 실패/중지된 Run 을 실패 지점부터 이어서 실행 */
  onResume?: (runId: string) => void;
  /** 다른 Run 이 실행 중이 아니어서 새로 실행할 수 있는지 */
  canStartRun?: boolean;
}

interface SnapshotNode {
  id: string;
  type?: string;
  position?: { x: number; y: number };
  data?: { label?: string };
}

interface SnapshotEdge {
  id: string;
  source: string;
  target: string;
  data?: { label?: string; conditionDescription?: string; edgeNodePosition?: { x: number; y: number } };
}

interface RunNodeData {
  label: string;
  nodeType: string;
  state?: NodeRunState;
  runFinished: boolean;
}

interface RunEdgeData {
  state?: EdgeRunState;
  conditionText?: string;
  edgeNodePosition?: { x: number; y: number };
  isSelected: boolean;
}

// 빌더(CustomNode)와 동일한 노드 타입별 색상/아이콘
const NODE_TYPE_COLORS: Record<string, string> = {
  startNode: '#10b981',
  endNode: '#10b981',
  promptNode: '#F7CB15',
  functionNode: '#5B5F97',
  agentNode: '#3b82f6',
  conditionNode: '#f59e0b',
  mergeNode: '#FF6B6C',
  userNode: '#8b5cf6',
  loopNode: '#10b981',
  toolsMemoryNode: '#6b7280',
};

const NODE_TYPE_ICONS: Record<string, React.ReactNode> = {
  startNode: <Play size={20} />,
  endNode: <Square size={20} />,
  promptNode: <MessageSquare size={20} />,
  functionNode: <Database size={20} />,
  agentNode: <Bot size={20} />,
  conditionNode: <Split size={20} />,
  mergeNode: <GitMerge size={20} />,
  userNode: <Database size={20} />,
  toolsMemoryNode: <Group size={20} />,
};

const STATUS_COLORS: Record<string, string> = {
  succeeded: '#10b981',
  failed: '#ef4444',
  running: '#3b82f6',
  waiting: '#eab308',
  cancelled: '#f97316',
  pending: '#9ca3af',
};

const formatDuration = (ms: number | null | undefined) => {
  if (ms === null || ms === undefined) return '';
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
};

const toJson = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const StatusIcon: React.FC<{ status: string; className?: string }> = ({ status, className = 'h-4 w-4' }) => {
  const style = { color: STATUS_COLORS[status] || STATUS_COLORS.pending };
  switch (status) {
    case 'succeeded': return <CheckCircle2 className={className} style={style} />;
    case 'failed': return <XCircle className={className} style={style} />;
    case 'running': return <Loader2 className={`${className} animate-spin`} style={style} />;
    case 'waiting': return <Clock className={className} style={style} />;
    case 'cancelled': return <PauseCircle className={className} style={style} />;
    default: return <MinusCircle className={className} style={style} />;
  }
};

/** 노드 우상단 상태 배지 (빌더의 실행 버튼 자리) */
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const color = STATUS_COLORS[status] || STATUS_COLORS.pending;
  const icon = status === 'succeeded' ? <Check className="w-4 h-4" />
    : status === 'failed' ? <X className="w-4 h-4" />
    : status === 'running' ? <Loader2 className="w-4 h-4 animate-spin" />
    : status === 'waiting' ? <Clock className="w-4 h-4" />
    : status === 'cancelled' ? <Pause className="w-4 h-4" />
    : <MinusCircle className="w-4 h-4" />;
  return (
    <div className="p-1.5 rounded-full shadow-md text-white" style={{ backgroundColor: color }}>
      {icon}
    </div>
  );
};

/** 읽기 전용 실행 결과 노드 - 빌더 CustomNode 와 같은 모양 */
const RunNode = memo(({ data, selected }: NodeProps<RunNodeData>) => {
  const { t } = useTranslation();
  const { isDarkMode } = useThemeStore();
  const status = data.state?.status || 'pending';
  const notExecuted = status === 'pending';
  const typeColor = NODE_TYPE_COLORS[data.nodeType] || NODE_TYPE_COLORS.functionNode;
  const backgroundColor = isDarkMode ? '#1f2937' : '#ffffff';
  const textColor = isDarkMode ? '#d1d5db' : '#374151';
  const isStartNode = data.nodeType === 'startNode';
  const isEndNode = data.nodeType === 'endNode';
  const handleStyle: React.CSSProperties = {
    backgroundColor: typeColor,
    borderColor: '#ffffff',
    borderWidth: '2px',
    borderStyle: 'solid',
    top: '50%',
    transform: 'translateY(-50%)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  };
  const glow = selected
    ? 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.8))'
    : status === 'failed'
      ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))'
      : status === 'running'
        ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))'
        : 'none';

  return (
    <div
      className="relative transition-all duration-200"
      style={{ filter: glow, opacity: notExecuted && data.runFinished ? 0.45 : 1 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div
          className="rounded-lg shadow-lg relative overflow-visible cursor-pointer"
          style={{ backgroundColor, borderColor: typeColor, borderWidth: '2px', borderStyle: 'solid' }}
        >
          {status === 'running' && (
            <div className="absolute inset-0 bg-blue-500 bg-opacity-10 rounded-lg z-20 animate-pulse" />
          )}
          {!notExecuted && (
            <div className="absolute -top-2 -right-2 z-10">
              <StatusBadge status={status} />
            </div>
          )}
          <div className="p-2 flex flex-col items-center justify-center text-center h-full">
            <div
              className="w-16 h-16 rounded-md flex items-center justify-center shadow-sm"
              style={{ backgroundColor: typeColor, border: `2px solid ${typeColor}` }}
            >
              <div style={{ color: '#ffffff' }}>{NODE_TYPE_ICONS[data.nodeType] || <Database size={20} />}</div>
            </div>
          </div>
          {!isStartNode && (
            <Handle type="target" position={Position.Left} isConnectable={false} className="w-3 h-3 shadow-sm" style={handleStyle} />
          )}
          {!isEndNode && (
            <Handle type="source" position={Position.Right} isConnectable={false} className="w-3 h-3 shadow-sm" style={handleStyle} />
          )}
        </div>

        <div
          className="mt-2 px-6 py-1.5 rounded-lg shadow-md border relative"
          style={{ minWidth: 'fit-content', textAlign: 'center', backgroundColor, borderColor: typeColor }}
        >
          <div className="font-medium text-sm truncate" style={{ color: textColor }}>{data.label}</div>
        </div>
        {data.state?.reused ? (
          <div className="mt-1 flex items-center gap-0.5 text-[11px] whitespace-nowrap text-teal-600 dark:text-teal-400">
            <RotateCcw className="w-3 h-3" />
            {t('workflowRun.reused')}
          </div>
        ) : !notExecuted && (
          <div className="mt-1 text-[11px] whitespace-nowrap" style={{ color: STATUS_COLORS[status] }}>
            {formatDuration(data.state?.duration_ms)}
            {(data.state?.exec_count || 0) > 1 ? ` · x${data.state?.exec_count}` : ''}
          </div>
        )}
      </div>
    </div>
  );
});
RunNode.displayName = 'RunNode';

/** 읽기 전용 실행 결과 엣지 - 빌더 CustomEdge 와 같은 모양 (중앙 데이터 원 포함) */
const RunEdge = memo(({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data,
}: EdgeProps<RunEdgeData>) => {
  const { isDarkMode } = useThemeStore();
  const status = data?.state?.status || 'idle';
  const output = data?.state?.output;
  const isSuccess = status === 'success';
  const isFailure = status === 'failure';
  const isExecuting = status === 'executing';
  const hasData = output !== null && output !== undefined && output !== 'PENDING'
    && !(typeof output === 'object' && Object.keys(output as object).length === 0);

  const centerX = data?.edgeNodePosition?.x ?? (sourceX + targetX) / 2;
  const centerY = data?.edgeNodePosition?.y ?? (sourceY + targetY) / 2;

  const [inputPath] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX: centerX - 30, targetY: centerY, targetPosition: Position.Left,
  });
  const [outputPath] = getBezierPath({
    sourceX: centerX + 30, sourceY: centerY, sourcePosition: Position.Right,
    targetX, targetY, targetPosition,
  });

  const stroke = isSuccess ? '#10b981' : isFailure ? '#ef4444' : isExecuting ? '#f59e0b' : '#97A2B6';
  const pathStyle: React.CSSProperties = {
    strokeWidth: isExecuting ? 5 : (isSuccess || isFailure) ? 3 : 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    stroke,
    filter: isSuccess ? 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.7))'
      : isFailure ? 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.7))'
      : isExecuting ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.7))'
      : 'none',
  };
  const dash = isSuccess || isFailure ? '0' : isExecuting ? '8,4' : '5,5';
  const ringColor = !hasData ? 'bg-gray-300' : (isExecuting || isSuccess) ? 'bg-teal-500' : isFailure ? 'bg-red-500' : 'bg-purple-500';
  const coreColor = !hasData ? 'bg-gray-400' : (isExecuting || isSuccess) ? 'bg-teal-600' : isFailure ? 'bg-red-600' : 'bg-purple-600';
  const markerId = `run-arrow-${id}`;

  return (
    <>
      <defs>
        <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="10" markerHeight="10"
          markerUnits="userSpaceOnUse" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={stroke} />
        </marker>
      </defs>
      <path className="react-flow__edge-path" d={inputPath} fill="none" strokeDasharray={dash} style={pathStyle} />
      <path className="react-flow__edge-path" d={outputPath} fill="none" strokeDasharray={dash} style={pathStyle}
        markerEnd={`url(#${markerId})`} />
      {/* 클릭 영역을 넓히기 위한 투명 경로 */}
      <path d={inputPath} fill="none" stroke="transparent" strokeWidth={16} className="react-flow__edge-interaction" />
      <path d={outputPath} fill="none" stroke="transparent" strokeWidth={16} className="react-flow__edge-interaction" />

      <foreignObject width={64} height={64} x={centerX - 32} y={centerY - 32} className="overflow-visible"
        requiredExtensions="http://www.w3.org/1999/xhtml">
        <div
          className={`relative w-16 h-16 cursor-pointer transition-transform ${data?.isSelected ? 'scale-105' : ''}`}
          style={{ pointerEvents: 'all', outline: data?.isSelected ? '2px solid #3b82f6' : 'none', borderRadius: '9999px' }}
        >
          <div className="absolute inset-0 rounded-full shadow-lg border-2"
            style={{ backgroundColor: isDarkMode ? '#374151' : '#ffffff', borderColor: isDarkMode ? '#6b7280' : '#e5e7eb' }} />
          <div className={`absolute inset-2 rounded-full ${ringColor}`} />
          <div className={`absolute inset-4 rounded-full flex items-center justify-center ${coreColor}`}>
            <Database size={20} className="text-white" />
          </div>
          {isExecuting && <div className="absolute inset-0 rounded-full bg-orange-400 opacity-50 animate-pulse" />}
        </div>
      </foreignObject>

      {data?.conditionText && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${centerX}px,${centerY - 35}px)`,
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '10px',
              fontWeight: 600,
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.07), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
              backgroundColor: isDarkMode ? '#1e3a8a' : '#dbeafe',
              color: isDarkMode ? '#93c5fd' : '#1e40af',
              border: `1px solid ${isDarkMode ? '#3b82f6' : '#93c5fd'}`,
            }}
            className="nodrag nopan"
          >
            {data.conditionText}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
RunEdge.displayName = 'RunEdge';

const nodeTypes = { runNode: RunNode };
const edgeTypes = { runEdge: RunEdge };

type Selection = { kind: 'node'; id: string } | { kind: 'edge'; id: string } | null;

const WorkflowRunViewerInner: React.FC<WorkflowRunViewerProps> = ({ runId, onBack, onStop, onResume, canStartRun = true }) => {
  const { t } = useTranslation();
  const { isDarkMode } = useThemeStore();
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(null);

  const isActive = run ? !workflowRunApi.isTerminalRunStatus(run.status) : false;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await workflowRunApi.getWorkflowRun(runId);
        if (!cancelled) {
          setRun(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    };
    load();
    // 실행 중이면 계속 갱신
    const timer = setInterval(() => {
      if (!run || !workflowRunApi.isTerminalRunStatus(run.status)) load();
    }, 1500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [runId, run?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const snapshotNodes = useMemo(() => (run?.snapshot?.nodes || []) as SnapshotNode[], [run?.snapshot]);
  const snapshotEdges = useMemo(() => (run?.snapshot?.edges || []) as SnapshotEdge[], [run?.snapshot]);

  const nodes: Node<RunNodeData>[] = useMemo(() => {
    if (!run) return [];
    const finished = workflowRunApi.isTerminalRunStatus(run.status);
    return snapshotNodes.map(node => ({
      id: node.id,
      type: 'runNode',
      position: node.position || { x: 0, y: 0 },
      selected: selection?.kind === 'node' && selection.id === node.id,
      data: {
        label: node.data?.label || node.type || node.id,
        nodeType: node.type || '',
        state: run.node_states[node.id],
        runFinished: finished,
      },
    }));
  }, [run, snapshotNodes, selection]);

  const edges: Edge<RunEdgeData>[] = useMemo(() => {
    if (!run) return [];
    const nodeTypeById = new Map(snapshotNodes.map(n => [n.id, n.type]));
    return snapshotEdges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'runEdge',
      data: {
        state: run.edge_states[edge.id],
        conditionText: nodeTypeById.get(edge.source) === 'conditionNode'
          ? (edge.data?.conditionDescription || edge.data?.label)
          : undefined,
        edgeNodePosition: edge.data?.edgeNodePosition,
        isSelected: selection?.kind === 'edge' && selection.id === edge.id,
      },
    }));
  }, [run, snapshotNodes, snapshotEdges, selection]);

  const selectedNodeState = selection?.kind === 'node' ? run?.node_states[selection.id] : undefined;
  const selectedEdge = selection?.kind === 'edge' ? snapshotEdges.find(e => e.id === selection.id) : undefined;
  const selectedEdgeState = selection?.kind === 'edge' ? run?.edge_states[selection.id] : undefined;
  const labelOf = (nodeId: string) => snapshotNodes.find(n => n.id === nodeId)?.data?.label || nodeId;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onBack}
          className="flex items-center text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('workflowRun.backToList')}
        </button>
        {run && (
          <>
            <span className="flex items-center gap-1 text-sm" style={{ color: STATUS_COLORS[run.status] || STATUS_COLORS.pending }}>
              <StatusIcon status={run.status === 'queued' ? 'pending' : run.status} />
              {t(`workflowRun.status.${run.status}`)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(run.started_at || run.created_at).toLocaleString()}
              {run.duration_ms !== null ? ` · ${formatDuration(run.duration_ms)}` : ''}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {t('workflowRun.readOnly')}
            </span>
            {isActive && (
              <button
                onClick={() => onStop(run.id)}
                disabled={run.cancel_requested}
                className="ml-auto flex items-center px-2 py-1 text-xs rounded-md bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
              >
                <Square className="h-3 w-3 mr-1" />
                {run.cancel_requested ? t('header.stopping') : t('workflowRun.stop')}
              </button>
            )}
            {onResume && (run.status === 'failed' || run.status === 'cancelled') && (
              <button
                onClick={() => onResume(run.id)}
                disabled={!canStartRun}
                className="ml-auto flex items-center px-2 py-1 text-xs rounded-md bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50"
                title={t('workflowRun.resumeHint')}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                {t('workflowRun.resume')}
              </button>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="mx-4 mt-2 px-3 py-2 rounded bg-red-50 dark:bg-red-900/30 text-sm text-red-700 dark:text-red-300">{error}</div>
      )}

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          {!run ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              nodesDraggable={false}
              nodesConnectable={false}
              edgesUpdatable={false}
              elementsSelectable
              deleteKeyCode={null}
              onNodeClick={(_, node) => setSelection({ kind: 'node', id: node.id })}
              onEdgeClick={(_, edge) => setSelection({ kind: 'edge', id: edge.id })}
              onPaneClick={() => setSelection(null)}
              proOptions={{ hideAttribution: true }}
              className={isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}
            >
              <Background variant={BackgroundVariant.Dots} gap={16} size={1} color={isDarkMode ? '#374151' : '#d1d5db'} />
              <Controls showInteractive={false} />
              <MiniMap
                pannable
                zoomable
                nodeColor={node => STATUS_COLORS[(node.data as RunNodeData).state?.status || 'pending']}
                className={isDarkMode ? '!bg-gray-800' : ''}
              />
            </ReactFlow>
          )}
        </div>

        <div className="w-80 shrink-0 border-l border-gray-200 dark:border-gray-700 overflow-y-auto p-3 text-sm">
          {selection === null && run && (
            <div className="space-y-3">
              <p className="text-gray-500 dark:text-gray-400">{t('workflowRun.selectHint')}</p>
              {run.error && (
                <div className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">{run.error}</div>
              )}
              {run.final_output !== null && run.final_output !== undefined && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('workflowRun.finalOutput')}</div>
                  <pre className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-2 max-h-96 overflow-auto whitespace-pre-wrap break-all text-gray-800 dark:text-gray-200">{toJson(run.final_output)}</pre>
                </div>
              )}
            </div>
          )}

          {selection?.kind === 'node' && (
            <div className="space-y-2">
              <div className="font-semibold text-gray-900 dark:text-gray-100">{labelOf(selection.id)}</div>
              {selectedNodeState ? (
                <>
                  <div className="flex items-center gap-1 text-xs" style={{ color: STATUS_COLORS[selectedNodeState.status] }}>
                    <StatusIcon status={selectedNodeState.status} className="h-3.5 w-3.5" />
                    {selectedNodeState.status === 'pending' && run && workflowRunApi.isTerminalRunStatus(run.status)
                      ? t('workflowRun.notExecuted')
                      : t(`workflowRun.status.${selectedNodeState.status}`)}
                    <span className="text-gray-500 dark:text-gray-400 ml-1">
                      {selectedNodeState.type}
                      {selectedNodeState.duration_ms !== null ? ` · ${formatDuration(selectedNodeState.duration_ms)}` : ''}
                      {selectedNodeState.exec_count > 1 ? ` · x${selectedNodeState.exec_count}` : ''}
                    </span>
                  </div>
                  {selectedNodeState.reused && (
                    <div className="text-xs text-teal-700 dark:text-teal-300">{t('workflowRun.reusedHint')}</div>
                  )}
                  {selectedNodeState.error && (
                    <div className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">{selectedNodeState.error}</div>
                  )}
                  {selectedNodeState.exec_count > 0 && (
                    <>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('workflowRun.input')}</div>
                        <pre className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-2 max-h-64 overflow-auto whitespace-pre-wrap break-all text-gray-800 dark:text-gray-200">{toJson(selectedNodeState.input)}</pre>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('workflowRun.output')}</div>
                        <pre className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-2 max-h-64 overflow-auto whitespace-pre-wrap break-all text-gray-800 dark:text-gray-200">{toJson(selectedNodeState.output)}</pre>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('workflowRun.notExecuted')}</p>
              )}
            </div>
          )}

          {selection?.kind === 'edge' && selectedEdge && (
            <div className="space-y-2">
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {labelOf(selectedEdge.source)} → {labelOf(selectedEdge.target)}
              </div>
              {selectedEdge.data?.label && (
                <div className="text-xs text-gray-600 dark:text-gray-300 font-mono">{selectedEdge.data.label}</div>
              )}
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('workflowRun.edgeData')}</div>
              <pre className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-2 max-h-96 overflow-auto whitespace-pre-wrap break-all text-gray-800 dark:text-gray-200">
                {selectedEdgeState?.output === null || selectedEdgeState?.output === undefined || selectedEdgeState?.output === 'PENDING'
                  ? t('workflowRun.noEdgeData')
                  : toJson(selectedEdgeState.output)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/** 실행 이력을 실행 당시 워크플로우 모양 그대로 보여주는 읽기 전용 뷰어 */
const WorkflowRunViewer: React.FC<WorkflowRunViewerProps> = props => (
  // 편집 캔버스와 ReactFlow 상태가 섞이지 않도록 별도 Provider 사용
  <ReactFlowProvider>
    <WorkflowRunViewerInner {...props} />
  </ReactFlowProvider>
);

export default WorkflowRunViewer;
