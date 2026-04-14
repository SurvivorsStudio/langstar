/**
 * Workflow Storage Store
 * 
 * 워크플로우 저장/로드 관련 기능을 관리하는 Zustand 스토어입니다.
 * MongoDB를 통한 워크플로우 CRUD 작업을 처리합니다.
 */

import { create } from 'zustand';
import { Workflow } from '../types/workflow';
import * as storageService from '../services/storageService';

export interface WorkflowStorageState {
  // 상태
  availableWorkflows: Workflow[];
  isLoading: boolean;
  loadError: string | null;
  
  // 함수
  fetchAvailableWorkflows: () => Promise<void>;
  deleteWorkflow: (projectName: string) => Promise<void>;
  renameWorkflow: (oldName: string, newName: string) => Promise<void>;
}

export const useWorkflowStorageStore = create<WorkflowStorageState>((set, get) => ({
  // 초기 상태
  availableWorkflows: [],
  isLoading: false,
  loadError: null,
  
  // 사용 가능한 워크플로우 목록 가져오기
  fetchAvailableWorkflows: async () => {
    set({ isLoading: true, loadError: null });
    console.log('[WorkflowStorageStore/fetch] 🔄 워크플로우 목록 로딩을 시작합니다..');
    try {
      const workflows = await storageService.getAllWorkflows();
      console.log('[WorkflowStorageStore/fetch] ✅ MongoDB에서 가져온 워크플로우:', workflows);

      // 마이그레이션: manuallySelectedEdges가 없는 워크플로우에 빈 객체 추가
      const migratedWorkflows = workflows.map(workflow => {
        if (!workflow.manuallySelectedEdges) {
          return {
            ...workflow,
            manuallySelectedEdges: {}
          };
        }
        return workflow;
      });

      set({ availableWorkflows: migratedWorkflows, isLoading: false, loadError: null });
      console.log(`[WorkflowStorageStore/fetch] ✅ 상태 업데이트 완료. 최종 워크플로우 목록:`, migratedWorkflows);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadError: errorMessage || 'Failed to fetch workflows', isLoading: false });
      console.error('[WorkflowStorageStore/fetch] ❌ 워크플로우 목록 로딩 실패:', error);
    }
  },

  // 워크플로우 삭제
  deleteWorkflow: async (projectName: string) => {
    try {
      await storageService.deleteWorkflow(projectName);
      console.log(`WorkflowStorageStore: Workflow "${projectName}" deleted successfully.`);
      // 삭제 후 워크플로우 목록 새로고침
      get().fetchAvailableWorkflows();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`WorkflowStorageStore: Failed to delete workflow "${projectName}":`, error);
      throw new Error(errorMessage);
    }
  },

  // 워크플로우 이름 변경
  renameWorkflow: async (oldName: string, newName: string) => {
    try {
      await storageService.renameWorkflow(oldName, newName);
      console.log(`WorkflowStorageStore: Workflow renamed from "${oldName}" to "${newName}".`);
      get().fetchAvailableWorkflows();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`WorkflowStorageStore: Failed to rename workflow from "${oldName}" to "${newName}":`, error);
      throw new Error(errorMessage);
    }
  },
}));
