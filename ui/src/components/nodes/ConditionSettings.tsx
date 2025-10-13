import React, { useEffect, useState } from 'react';
import { useFlowStore } from '../../store/flowStore';
import { Edge } from 'reactflow';
import { AlertCircle } from 'lucide-react';

interface ConditionSettingsProps {
  nodeId: string; // ID of the conditionNode
}

const ConditionSettings: React.FC<ConditionSettingsProps> = ({ nodeId }) => {
  const { edges, nodes, updateEdgeLabel, updateEdgeDescription, updateEdgeData } = useFlowStore();
  const nodeEdges = edges.filter(edge => edge.source === nodeId);
  const startNode = nodes.find(node => node.type === 'startNode');
  const className = startNode?.data.config?.className || '';

  const [orderedEdgeIds, setOrderedEdgeIds] = useState<string[]>([]);
  const [draggedEdgeId, setDraggedEdgeId] = useState<string | null>(null);

  const getTargetNodeName = (targetId: string) => {
    const targetNode = nodes.find(node => node.id === targetId);
    return targetNode?.data.label || targetId;
  };

  const validateCondition = (condition: string) => {
    if (!className) {
      return { isValid: false, error: 'Class Name is not defined in Start Node' };
    }

    // Simple string check instead of regex
    const classNamePattern = `${className}['`;
    if (!condition.includes(classNamePattern)) {
      return { 
        isValid: false, 
        error: `Condition must contain at least one reference to ${className}['propertyName']` 
      };
    }

    return { isValid: true, error: null };
  };

  // Helper to parse condition text from label, ignoring the type prefix
  const getConditionTextFromLabel = (label: string = ''): string => {
    const match = label.match(/^(if|elif|else)\s+(.*)/);
    if (match && match[2]) {
      return match[2]; // "if condition_text", "elif condition_text"
    }
    if (label.toLowerCase() === 'else') {
      return ''; // "else"
    }
    // If no prefix or only "if" without space (legacy or direct input)
    if (label.toLowerCase().startsWith('if ')) return label.substring(3);
    if (label.toLowerCase().startsWith('elif ')) return label.substring(5);
    
    // Default to returning the whole label if it doesn't match known patterns,
    // or if it's a simple condition without an explicit "if" prefix.
    // This might happen if labels were set before this logic.
    return label;
  };

  const handleConditionTextChange = (edge: Edge, newConditionText: string, determinedType: 'if' | 'elif' | 'else') => {
    let newLabel = '';
    if (determinedType === 'else') {
      newLabel = 'else';
    } else {
      newLabel = `${determinedType} ${newConditionText}`;
    }
    updateEdgeLabel(edge.id, newLabel);
  };

  useEffect(() => {
    // Initialize or update orderedEdgeIds when nodeEdges from store changes
    // This effect ensures that the local `orderedEdgeIds` state is synchronized
    // with the edges from the store, and also updates the store (labels, order index)
    // if the derived if/elif/else types or order change.

    const currentEdgesFromStore = edges.filter(edge => edge.source === nodeId);
    const currentEdgeIdsFromStore = currentEdgesFromStore.map(edge => edge.id);

    // Reconcile local orderedEdgeIds with currentEdgeIdsFromStore
    // Preserve existing DND order, append new edges, remove deleted ones.
    const validOrderedIdsFromState = orderedEdgeIds.filter(id => currentEdgeIdsFromStore.includes(id));
    const newStoreIdsNotYetInOrder = currentEdgeIdsFromStore.filter(id => !validOrderedIdsFromState.includes(id));
    const reconciledOrder = [...validOrderedIdsFromState, ...newStoreIdsNotYetInOrder];

    // If the reconciled order is different from the current local state, update the local state.
    if (JSON.stringify(reconciledOrder) !== JSON.stringify(orderedEdgeIds)) {
      setOrderedEdgeIds(reconciledOrder);
    }

    // After reconciling local order, update the store for all edges from this node
    // to ensure their labels (if/elif/else) and conditionOrderIndex are correct.
    // This is important when edges are added/removed outside of DND operations in this component.
    reconciledOrder.forEach((edgeId, index) => {
      const edge = currentEdgesFromStore.find(e => e.id === edgeId);
      if (!edge) return;

      const determinedType = reconciledOrder.length === 1 ? 'if' : (index === 0 ? 'if' : (index === reconciledOrder.length - 1 ? 'else' : 'elif'));
      const currentConditionText = getConditionTextFromLabel(edge.data?.label);
      let newLabel = '';
      let conditionTextForNewLabel = currentConditionText;

      if (determinedType === 'else') {
        newLabel = 'else';
      } else {
        const oldLabel = edge.data?.label || '';
        const wasElse = oldLabel.trim().toLowerCase() === 'else';
        if (wasElse) { // Transitioned from else to if/elif
          conditionTextForNewLabel = `${className}['value'] > 0`; // Provide a default condition
        }
        newLabel = `${determinedType} ${conditionTextForNewLabel}`;
      }

      const dataToUpdate: Partial<Edge['data']> = {};
      if (edge.data?.label !== newLabel) {
        dataToUpdate.label = newLabel;
      }
      if (edge.data?.conditionOrderIndex !== index) {
        dataToUpdate.conditionOrderIndex = index;
      }

      if (Object.keys(dataToUpdate).length > 0) {
        updateEdgeData(edge.id, dataToUpdate);
      }
    });
  }, [edges, nodeId, className, updateEdgeData, orderedEdgeIds, getConditionTextFromLabel]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, edgeId: string) => {
    setDraggedEdgeId(edgeId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', edgeId); // Necessary for Firefox
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetEdgeId: string) => {
    e.preventDefault();
    if (!draggedEdgeId || draggedEdgeId === targetEdgeId) {
      setDraggedEdgeId(null);
      return;
    }

    const currentIndex = orderedEdgeIds.indexOf(draggedEdgeId);
    const targetIndex = orderedEdgeIds.indexOf(targetEdgeId);

    if (currentIndex === -1 || targetIndex === -1) {
      setDraggedEdgeId(null);
      return;
    }

    const newOrderedIds = [...orderedEdgeIds];
    const [removed] = newOrderedIds.splice(currentIndex, 1);
    newOrderedIds.splice(targetIndex, 0, removed);

    setOrderedEdgeIds(newOrderedIds); // Update local visual order first

    // Update actual edge data in the store based on this new order
    newOrderedIds.forEach((edgeId, index) => {
      const edge = edges.find(e => e.id === edgeId); // Use edges from store for fresh data
      if (!edge) return;

      const newDeterminedType = newOrderedIds.length === 1 ? 'if' : (index === 0 ? 'if' : (index === newOrderedIds.length - 1 ? 'else' : 'elif'));
      const currentConditionText = getConditionTextFromLabel(edge.data?.label);
      let conditionTextForNewLabel = currentConditionText;
      const oldLabel = edge.data?.label || '';
      const wasElse = oldLabel.trim().toLowerCase() === 'else';

      if (newDeterminedType === 'else') {
        // No condition text for 'else'
      } else if (wasElse) { // Transitioned from else to if/elif
        conditionTextForNewLabel = `${className}['value'] > 0`; // Default for was-else-now-if/elif
      }

      const newLabel = newDeterminedType === 'else' ? 'else' : `${newDeterminedType} ${conditionTextForNewLabel}`;
      
      // Update description
      const currentDescription = edge.data?.conditionDescription;
      const newDefaultRuleName = `Rule #${index + 1}`;
      let finalNewDescription = newDefaultRuleName; // Default to the new standard "Rule #N"
      if (currentDescription) {
        const isOldDefaultRuleNamePattern = /^Rule #\d+$/;
        // Preserve if it's custom (not "Default Fallback Rule" and not like "Rule #X")
        if (currentDescription !== "Default Fallback Rule" && !isOldDefaultRuleNamePattern.test(currentDescription)) {
          finalNewDescription = currentDescription;
        }
      }

      const dataToUpdate: Partial<Edge['data']> = {
        conditionOrderIndex: index, // Always update the order index
      };
      if (edge.data?.label !== newLabel) {
        dataToUpdate.label = newLabel;
      }
      if (edge.data?.conditionDescription !== finalNewDescription) {
        dataToUpdate.conditionDescription = finalNewDescription;
      }
      // Only call updateEdgeData if there's something to update beyond just the index, or if index itself changed
      if (Object.keys(dataToUpdate).length > 1 || dataToUpdate.conditionOrderIndex !== edge.data?.conditionOrderIndex) {
        updateEdgeData(edge.id, dataToUpdate);
      }
    });

    setDraggedEdgeId(null);
  };

  const handleDragEnd = () => {
    setDraggedEdgeId(null);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Conditions</h3>
      {nodeEdges.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No connections yet. Connect this node to others to set conditions.</p>
      ) : (
        orderedEdgeIds.map((edgeId) => {
          const edge = nodeEdges.find(e => e.id === edgeId);
          if (!edge) return null;

          const index = orderedEdgeIds.indexOf(edgeId); // Get current index from ordered list

          let determinedType: 'if' | 'elif' | 'else';
          // Determine type based on the ordered list
          if (orderedEdgeIds.length === 1) {
            determinedType = 'if';
          } else {
            if (index === 0) {
              determinedType = 'if';
            } else if (index === orderedEdgeIds.length - 1) {
              determinedType = 'else';
            } else {
              determinedType = 'elif';
            }
          }

          const defaultRuleName = `Rule #${index + 1}`;

          const conditionText = getConditionTextFromLabel(edge.data?.label);
          const validation = validateCondition(conditionText);
          
          return (
            <div 
              key={edge.id} 
              draggable 
              onDragStart={(e) => handleDragStart(e, edge.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, edge.id)}
              onDragEnd={handleDragEnd}
              className={`space-y-2 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 cursor-grab ${draggedEdgeId === edge.id ? 'opacity-50 shadow-lg' : ''}`}
            >
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                Rule for connection to{' '}
                <span className="font-semibold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded-md">
                  {getTargetNodeName(edge.target)}
                </span>
              </label>
              <input
                type="text"
                value={edge.data?.conditionDescription ?? defaultRuleName}
                onChange={(e) => updateEdgeDescription(edge.id, e.target.value)}
                // disabled prop removed to allow editing for 'else'
                placeholder={defaultRuleName} // Consistent placeholder
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mb-2"
              />
              <div className="flex gap-2">
                <span className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-md font-medium w-20 text-center">
                  {determinedType.toUpperCase()}
                </span>
                {determinedType !== 'else' && (
                  <input
                    type="text"
                    value={conditionText}
                    onChange={(e) => handleConditionTextChange(edge, e.target.value, determinedType)}
                    placeholder={`${className}['value'] > 100`}
                    className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm bg-white dark:bg-gray-800 ${
                      !validation.isValid 
                        ? 'border-red-300 dark:border-red-500 focus:ring-red-500 text-red-600 dark:text-red-400' 
                        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 text-gray-900 dark:text-gray-100'
                    }`}
                  />
                )}
              </div>
              {determinedType !== 'else' && !validation.isValid && (
                <div className="flex items-center mt-1 text-red-500 text-xs">
                  <AlertCircle size={12} className="mr-1" />
                  {validation.error}
                </div>
              )}
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {determinedType !== 'else' ? 'Enter a Python condition expression.' : 'This is the default path if other conditions are not met.'}
              </div>
            </div>
          );
        })
      )}
      {nodeEdges.length > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
          <p>Tips:</p>
          <ul className="list-disc pl-4 mt-1 space-y-1">
            <li>Use Python comparison operators: ==, !=, &gt;, &lt;, &gt;=, &lt;=</li>
            <li>Access input data using the class name from Start Node</li>
            <li>Example: {className}['value'] &gt; 100</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ConditionSettings;