import type { Node, Edge } from 'reactflow';
import type { NodeData } from './flowStore';
import { createNode } from './nodes/nodeFactory';

const _start = createNode({
  type: 'startNode',
  position: { x: 100, y: 100 },
  data: { label: 'Start', description: 'Starting point of the workflow' } as NodeData,
  existingNodes: [],
});
const _end = createNode({
  type: 'endNode',
  position: { x: 400, y: 100 },
  data: { label: 'End', description: 'End point of the workflow' } as NodeData,
  existingNodes: [_start],
});
export const initialNodes: Node<NodeData>[] = [_start, _end];

export const emptyInitialNodes: Node<NodeData>[] = [_start, _end];

export const emptyInitialEdges: Edge[] = [];
export const initialEdges: Edge[] = [];


