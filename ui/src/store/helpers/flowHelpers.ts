import type { Node } from 'reactflow';
import type { NodeData } from '../flowStore';

export const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key: string, value: any) => {
    if (key === 'icon' || typeof value === 'function') {
      return undefined;
    }
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  };
};

export const safeCompare = (obj1: any, obj2: any): boolean => {
  try {
    return JSON.stringify(obj1, getCircularReplacer()) === JSON.stringify(obj2, getCircularReplacer());
  } catch {
    return false;
  }
};

export const getUniqueNodeName = (nodes: Node<NodeData>[], baseLabel: string): string => {
  const existingNames = nodes.map(node => node.data.label);
  const sanitizedBaseLabel = baseLabel.replace(/\s+/g, '_');
  let newName = sanitizedBaseLabel;
  let counter = 1;
  while (existingNames.includes(newName)) {
    newName = `${sanitizedBaseLabel}_${counter}`;
    counter++;
  }
  return newName;
};


