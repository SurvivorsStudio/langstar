import { nanoid } from 'nanoid';
import type { FlowState, Workflow, NodeData } from '../flowStore';
import type { Edge, Viewport, Node } from 'reactflow';
import * as storageService from '../../services/storageService';

type PersistenceKeys =
  | 'isSaving'
  | 'saveError'
  | 'lastSaved'
  | 'isLoading'
  | 'loadError'
  | 'availableWorkflows'
  | 'saveWorkflow'
  | 'loadWorkflow'
  | 'fetchAvailableWorkflows'
  | 'deleteWorkflow'
  | 'renameWorkflow';

export const createPersistenceSlice = (
  set: (partial: Partial<FlowState> | ((state: FlowState) => Partial<FlowState>), replace?: boolean) => void,
  get: () => FlowState,
  _api?: unknown
): Pick<FlowState, PersistenceKeys> => ({
  // persistence state
  isSaving: false,
  saveError: null,
  lastSaved: null,
  isLoading: false,
  loadError: null,
  availableWorkflows: [],

  saveWorkflow: async () => {
    set({ isSaving: true, saveError: null });
    const { projectName, nodes, edges, viewport, manuallySelectedEdges, workflowVersion } = get();

    if (!projectName || projectName.trim() === "") {
      const errorMsg = "Project name cannot be empty.";
      set({ isSaving: false, saveError: errorMsg });
      console.error("FlowStore: Project name is empty. Cannot save.");
      throw new Error(errorMsg);
    }
    
    console.log(`FlowStore: Saving workflow "${projectName}" (version ${workflowVersion}) to MongoDB...`);

    const nodesToSave = nodes.map((node: Node<NodeData>) => {
      const { icon, ...restOfData } = node.data;
      return {
        ...node,
        data: restOfData,
      };
    });

    try {
      // 첫 저장(버전 0)일 경우: GET 없이 upsert로 바로 저장하여 404를 회피
      if (!workflowVersion || workflowVersion === 0) {
        const firstVersion = 1;
        const workflowData = {
          projectName,
          nodes: nodesToSave,
          edges,
          viewport,
          manuallySelectedEdges,
          lastModified: new Date().toISOString(),
          version: firstVersion
        };
        await storageService.updateWorkflow(projectName, workflowData);
        set({
          isSaving: false,
          lastSaved: new Date(),
          saveError: null,
          workflowVersion: firstVersion
        });
        console.log(`FlowStore: Workflow "${projectName}" saved successfully (version ${firstVersion})`);
        get().fetchAvailableWorkflows();
        return;
      }

      // 이후 저장(버전 > 0): 서버 버전 조회 후 충돌 검사 → 업데이트
      let existingWorkflow: any = null;
      try {
        existingWorkflow = await storageService.getWorkflowByName(projectName);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // 404는 예외로 두지 않음(정상 흐름에서 존재해야 하므로) → 그대로 전파
        if (msg.includes('API Error 404')) {
          throw err;
        }
        throw err;
      }
      const serverVersion = existingWorkflow?.version || 0;
      if (serverVersion !== workflowVersion) {
        console.warn(`[Collaboration] Version conflict detected! Local: ${workflowVersion}, Server: ${serverVersion}`);
        set({ isSaving: false });
        window.dispatchEvent(new CustomEvent('workflowVersionConflict', {
          detail: {
            localVersion: workflowVersion,
            serverVersion: serverVersion,
            serverWorkflow: existingWorkflow
          }
        }));
        throw new Error(`Version conflict: Your version (${workflowVersion}) is outdated. Server version: ${serverVersion}. Please reload the workflow.`);
      }

      const newVersion = workflowVersion + 1;
      const workflowData = {
        projectName,
        nodes: nodesToSave,
        edges,
        viewport,
        manuallySelectedEdges,
        lastModified: new Date().toISOString(),
        version: newVersion
      };
      await storageService.updateWorkflow(projectName, workflowData);
      set({
        isSaving: false,
        lastSaved: new Date(),
        saveError: null,
        workflowVersion: newVersion
      });
      console.log(`FlowStore: Workflow "${projectName}" saved successfully (version ${newVersion})`);
      get().fetchAvailableWorkflows();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ isSaving: false, saveError: errorMessage });
      console.error('FlowStore: Failed to save workflow to MongoDB:', error);
      throw error;
    }
  },

  loadWorkflow: async (projectName: string) => {
    set({ isLoading: true, loadError: null });
    console.log(`FlowStore: Loading workflow "${projectName}" from MongoDB...`);

    try {
      const workflowData = await storageService.getWorkflowByName(projectName);
      
      if (workflowData) {
        const version = workflowData.version || 0;
        set({
          projectName: workflowData.projectName,
          nodes: (workflowData.nodes || []) as Node<NodeData>[],
          edges: (workflowData.edges || []) as Edge[],
          viewport: (workflowData.viewport || { x: 0, y: 0, zoom: 1 }) as Viewport,
          manuallySelectedEdges: workflowData.manuallySelectedEdges || {},
          workflowVersion: version,
          isLoading: false, 
          loadError: null,
          lastSaved: workflowData.lastModified ? new Date(workflowData.lastModified) : null,
        });
        console.log(`FlowStore: Workflow "${projectName}" (version ${version}) loaded successfully.`);
        
        const { collaborationService } = get();
        if (collaborationService && projectName !== get().projectName) {
          await get().connectCollaboration();
        }
      } else {
        const errorMsg = `Workflow "${projectName}" not found.`;
        set({ isLoading: false, loadError: errorMsg });
        console.warn(`FlowStore: ${errorMsg}`);
        throw new Error(errorMsg);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ isLoading: false, loadError: errorMessage });
      console.error('FlowStore: Failed to load workflow from MongoDB:', error);
      throw error;
    }
  },

  fetchAvailableWorkflows: async () => {
    set({ isLoading: true, loadError: null });
    console.log('[FlowStore/fetch] ➡️ 워크플로우 목록 로딩을 시작합니다...');
    try {
      const workflows = await storageService.getAllWorkflows();
      console.log(`[FlowStore/fetch] ✅ MongoDB에서 데이터를 성공적으로 가져왔습니다. (총 ${workflows.length}개)`);
      console.table(workflows.map((wf: any) => ({ projectName: wf.projectName, projectId: wf.projectId || 'N/A', lastModified: wf.lastModified })));

      const migratedWorkflows = workflows.map((wf: any) => {
        if (!wf.projectId) {
          console.warn(`[FlowStore/fetch] ⚠️ 워크플로우 "${wf.projectName}"에 projectId가 없습니다. 새로 할당합니다.`);
          const newWf = { ...wf, projectId: nanoid() };
          storageService.updateWorkflow(wf.projectName, newWf).catch(err => 
            console.error('Failed to update workflow with projectId:', err)
          );
          return newWf;
        }
        return wf;
      });

      set({ availableWorkflows: migratedWorkflows as Workflow[], isLoading: false, loadError: null });
      console.log(`[FlowStore/fetch] ✅ 상태 업데이트 완료. 최종 워크플로우 목록:`, migratedWorkflows);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadError: errorMessage || 'Failed to fetch workflow list', isLoading: false });
      console.error('[FlowStore/fetch] ❌ 워크플로우 목록을 가져오는 중 오류 발생:', error);
    }
  },

  deleteWorkflow: async (projectName: string) => {
    try {
      await storageService.deleteWorkflow(projectName);
      await get().fetchAvailableWorkflows();
    } catch (error) {
      console.error('FlowStore: Failed to delete workflow:', error);
      throw error;
    }
  },

  renameWorkflow: async (oldName: string, newName: string) => {
    try {
      await storageService.renameWorkflow(oldName, newName);
      await get().fetchAvailableWorkflows();
      set({ projectName: newName });
    } catch (error) {
      console.error('FlowStore: Failed to rename workflow:', error);
      throw error;
    }
  },
});


