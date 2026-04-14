/**
 * User Node Store
 * 
 * 사용자 정의 노드 정보를 관리하는 Zustand 스토어입니다.
 * 사용자가 생성한 커스텀 노드를 저장하고 관리합니다.
 */

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { UserNode } from '../types/userNode';
import * as storageService from '../services/storageService';

export interface UserNodeState {
  // 상태
  userNodes: UserNode[];
  isLoadingUserNodes: boolean;
  loadErrorUserNodes: string | null;
  
  // 함수
  fetchUserNodes: () => Promise<void>;
  addUserNode: (userNode: Omit<UserNode, 'id' | 'lastModified'>) => Promise<UserNode>;
  updateUserNode: (userNodeId: string, updates: Partial<Omit<UserNode, 'id' | 'lastModified'>>) => Promise<UserNode>;
  deleteUserNode: (userNodeId: string) => Promise<void>;
  exportUserNodes: (nodeIds?: string[], customFileName?: string) => Promise<any>;
  importUserNodes: (file: File) => Promise<any>;
}

export const useUserNodeStore = create<UserNodeState>((set, get) => ({
  // 초기 상태
  userNodes: [],
  isLoadingUserNodes: false,
  loadErrorUserNodes: null,
  
  // 사용자 노드 목록 가져오기
  fetchUserNodes: async () => {
    set({ isLoadingUserNodes: true, loadErrorUserNodes: null });
    console.log('UserNodeStore: Fetching user nodes...');
    try {
      const userNodes = await storageService.getAllUserNodes();
      set({ userNodes, isLoadingUserNodes: false, loadErrorUserNodes: null });
      console.log(`UserNodeStore: Found ${userNodes.length} user nodes:`, userNodes);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorUserNodes: errorMessage || 'Failed to fetch user nodes list', isLoadingUserNodes: false });
      console.error('UserNodeStore: Error fetching user nodes list:', error);
    }
  },

  // 사용자 노드 추가
  addUserNode: async (userNodeData: Omit<UserNode, 'id' | 'lastModified'>) => {
    set({ isLoadingUserNodes: true, loadErrorUserNodes: null });
    const newUserNode: UserNode = {
      ...userNodeData,
      id: nanoid(),
      lastModified: new Date().toISOString(),
    };
    console.log('UserNodeStore: Adding new user node:', newUserNode);

    try {
      await storageService.createUserNode(newUserNode);
      console.log('UserNodeStore: User node added successfully.');
      get().fetchUserNodes(); // 목록 새로고침
      return newUserNode;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorUserNodes: errorMessage, isLoadingUserNodes: false });
      console.error('UserNodeStore: Failed to add user node:', error);
      throw error;
    }
  },
  
  // 사용자 노드 업데이트
  updateUserNode: async (userNodeId: string, updates: Partial<Omit<UserNode, 'id' | 'lastModified'>>) => {
    set({ isLoadingUserNodes: true, loadErrorUserNodes: null });
    console.log(`UserNodeStore: Updating user node ID ${userNodeId} with:`, updates);

    try {
      // 기존 노드 정보 가져오기
      const existingUserNode = await storageService.getUserNodeById(userNodeId);
      if (!existingUserNode) {
        const errorMsg = `User node with ID ${userNodeId} not found.`;
        set({ loadErrorUserNodes: errorMsg, isLoadingUserNodes: false });
        throw new Error(errorMsg);
      }

      const updatedUserNode: UserNode = {
        ...existingUserNode,
        ...updates,
        lastModified: new Date().toISOString(),
      };

      await storageService.updateUserNode(userNodeId, updatedUserNode);
      console.log('UserNodeStore: User node updated successfully.');
      get().fetchUserNodes(); // 목록 새로고침
      return updatedUserNode;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorUserNodes: errorMessage, isLoadingUserNodes: false });
      console.error('UserNodeStore: Failed to update user node:', error);
      throw error;
    }
  },

  // 사용자 노드 삭제
  deleteUserNode: async (userNodeId: string) => {
    set({ isLoadingUserNodes: true, loadErrorUserNodes: null });
    console.log(`UserNodeStore: Deleting user node ID ${userNodeId}...`);
    try {
      await storageService.deleteUserNode(userNodeId);
      console.log('UserNodeStore: User node deleted successfully.');
      get().fetchUserNodes(); // 목록 새로고침
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorUserNodes: errorMessage, isLoadingUserNodes: false });
      console.error('UserNodeStore: Failed to delete user node:', error);
      throw error;
    }
  },

  // Export user nodes to JSON file
  exportUserNodes: async (nodeIds?: string[], customFileName?: string) => {
    try {
      const { userNodes } = get();
      
      // 특정 노드만 export하거나 모든 노드 export
      const nodesToExport = nodeIds 
        ? userNodes.filter(node => nodeIds.includes(node.id))
        : userNodes;

      if (nodesToExport.length === 0) {
        throw new Error('No nodes to export');
      }

      // export 데이터 구성 (id와 lastModified 제외)
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        nodes: nodesToExport.map(node => ({
          name: node.name,
          type: node.type,
          code: node.code,
          parameters: node.parameters,
          functionName: node.functionName,
          returnType: node.returnType,
          functionDescription: node.functionDescription
        }))
      };

      // 파일명 생성
      let fileName;
      if (customFileName) {
        fileName = `${customFileName}.json`;
      } else {
        fileName = `user-nodes-${new Date().toISOString().split('T')[0]}.json`;
      }

      // JSON 파일로 다운로드
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('UserNodeStore: User nodes exported successfully');
      return exportData;
    } catch (error) {
      console.error('UserNodeStore: Failed to export user nodes:', error);
      throw error;
    }
  },

  // Import user nodes from JSON file
  importUserNodes: async (file: File) => {
    try {
      const fileContent = await file.text();
      const importData = JSON.parse(fileContent);

      // 데이터 구조 검증
      if (!importData.nodes || !Array.isArray(importData.nodes)) {
        throw new Error('Invalid file format: nodes array not found');
      }

      const { userNodes, addUserNode } = get();
      const existingNames = userNodes.map(node => node.name);
      const importResults = [];

      for (const nodeData of importData.nodes) {
        // 필수 필드 검증
        if (!nodeData.name || !nodeData.code || !nodeData.functionName) {
          console.warn('Skipping invalid node data:', nodeData);
          continue;
        }

        // 이름 중복 처리
        let finalName = nodeData.name;
        let counter = 1;
        while (existingNames.includes(finalName)) {
          finalName = `${nodeData.name}_${counter}`;
          counter++;
        }

        try {
          const newNode = await addUserNode({
            name: finalName,
            type: 'UserNode',
            code: nodeData.code,
            parameters: nodeData.parameters || [],
            functionName: nodeData.functionName,
            returnType: nodeData.returnType || 'str',
            functionDescription: nodeData.functionDescription || ''
          });

          existingNames.push(finalName); // 추가된 이름을 목록에 추가
          importResults.push({
            originalName: nodeData.name,
            finalName: finalName,
            success: true,
            node: newNode
          });
        } catch (error) {
          importResults.push({
            originalName: nodeData.name,
            finalName: finalName,
            success: false,
            error: (error as Error).message
          });
        }
      }

      console.log('UserNodeStore: User nodes imported:', importResults);
      return {
        total: importData.nodes.length,
        successful: importResults.filter(r => r.success).length,
        failed: importResults.filter(r => !r.success).length,
        results: importResults
      };
    } catch (error) {
      console.error('UserNodeStore: Failed to import user nodes:', error);
      throw error;
    }
  },
}));
