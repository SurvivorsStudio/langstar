/**
 * AI Connection Store
 * 
 * AI 모델 연결 정보를 관리하는 Zustand 스토어입니다.
 * AWS Bedrock, OpenAI, Google, Anthropic 등의 AI 모델 연결을 저장하고 관리합니다.
 */

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { AIConnection } from '../types/aiConnection';
import * as storageService from '../services/storageService';

export interface AIConnectionState {
  // 상태
  aiConnections: AIConnection[];
  isLoadingAIConnections: boolean;
  loadErrorAIConnections: string | null;
  
  // 함수
  fetchAIConnections: () => Promise<void>;
  addAIConnection: (connection: Omit<AIConnection, 'id' | 'lastModified'>) => Promise<AIConnection>;
  updateAIConnection: (connectionId: string, updates: Partial<Omit<AIConnection, 'id' | 'lastModified'>>) => Promise<AIConnection>;
  deleteAIConnection: (connectionId: string) => Promise<void>;
}

export const useAIConnectionStore = create<AIConnectionState>((set, get) => ({
  // 초기 상태
  aiConnections: [],
  isLoadingAIConnections: false,
  loadErrorAIConnections: null,
  
  // AI 연결 목록 가져오기
  fetchAIConnections: async () => {
    set({ isLoadingAIConnections: true, loadErrorAIConnections: null });
    console.log('AIConnectionStore: Fetching AI connections...');
    try {
      const connections = await storageService.getAllAIConnections();
      
      // 마이그레이션: type 필드 소문자화 및 기본값 보정
      const normalized = connections.map(conn => {
        let type = (conn.type || '').toLowerCase();
        if (type !== 'language' && type !== 'embedding') {
          type = 'embedding'; // 잘못된 값이면 기본값
        }
        return { ...conn, type: type as 'language' | 'embedding' };
      });
      
      set({ aiConnections: normalized, isLoadingAIConnections: false, loadErrorAIConnections: null });
      console.log(`AIConnectionStore: Found ${normalized.length} AI connections:`, normalized);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorAIConnections: errorMessage || 'Failed to fetch AI connections list', isLoadingAIConnections: false });
      console.error('AIConnectionStore: Error fetching AI connections list:', error);
    }
  },
  
  // AI 연결 추가
  addAIConnection: async (connectionData: Omit<AIConnection, 'id' | 'lastModified'>) => {
    set({ isLoadingAIConnections: true, loadErrorAIConnections: null });
    const newConnection: AIConnection = {
      ...connectionData,
      id: nanoid(),
      lastModified: new Date().toISOString(),
    };
    console.log('AIConnectionStore: Adding new AI connection:', newConnection);

    try {
      await storageService.createAIConnection(newConnection);
      console.log('AIConnectionStore: AI connection added successfully.');
      get().fetchAIConnections(); // 목록 새로고침
      return newConnection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorAIConnections: errorMessage, isLoadingAIConnections: false });
      console.error('AIConnectionStore: Failed to add AI connection:', error);
      throw error;
    }
  },
  
  // AI 연결 업데이트
  updateAIConnection: async (connectionId: string, updates: Partial<Omit<AIConnection, 'id' | 'lastModified'>>) => {
    set({ isLoadingAIConnections: true, loadErrorAIConnections: null });
    console.log(`AIConnectionStore: Updating AI connection ID ${connectionId} with:`, updates);

    try {
      // 기존 연결 정보 가져오기
      const existingConnection = await storageService.getAIConnectionById(connectionId);
      if (!existingConnection) {
        const errorMsg = `AI connection with ID ${connectionId} not found.`;
        set({ loadErrorAIConnections: errorMsg, isLoadingAIConnections: false });
        throw new Error(errorMsg);
      }

      const updatedConnection: AIConnection = {
        ...existingConnection,
        ...updates,
        lastModified: new Date().toISOString(),
      };

      await storageService.updateAIConnection(connectionId, updatedConnection);
      console.log('AIConnectionStore: AI connection updated successfully.');
      get().fetchAIConnections(); // 목록 새로고침
      return updatedConnection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorAIConnections: errorMessage, isLoadingAIConnections: false });
      console.error('AIConnectionStore: Failed to update AI connection:', error);
      throw error;
    }
  },
  
  // AI 연결 삭제
  deleteAIConnection: async (connectionId: string) => {
    set({ isLoadingAIConnections: true, loadErrorAIConnections: null });
    console.log(`AIConnectionStore: Deleting AI connection ID ${connectionId}...`);
    try {
      await storageService.deleteAIConnection(connectionId);
      console.log('AIConnectionStore: AI connection deleted successfully.');
      get().fetchAIConnections(); // 목록 새로고침
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorAIConnections: errorMessage, isLoadingAIConnections: false });
      console.error('AIConnectionStore: Failed to delete AI connection:', error);
      throw error;
    }
  },
}));
