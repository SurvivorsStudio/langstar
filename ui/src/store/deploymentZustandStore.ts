/**
 * Deployment Zustand Store
 * 
 * Manages deployment-related state using Zustand.
 * This store handles deployment CRUD operations, version management,
 * and deployment status updates using the apiService.
 * 
 * Note: This is separate from deploymentStore.ts (class-based, storageService)
 * which is used for different deployment operations.
 */

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { Deployment, DeploymentVersion, DeploymentFormData } from '../types/deployment';
import { Workflow } from '../types/workflow';
import { apiService } from '../services/apiService';

/**
 * Deployment state interface
 */
export interface DeploymentState {
  // State
  deployments: Deployment[];
  activeDeployment: Deployment | null;
  deploymentVersions: DeploymentVersion[];
  isLoadingDeployments: boolean;
  loadErrorDeployments: string | null;

  // Functions
  createDeployment: (deploymentData: DeploymentFormData, workflowSnapshot: Workflow) => Promise<Deployment>;
  updateDeployment: (id: string, updates: Partial<Omit<Deployment, 'id' | 'createdAt'>>) => Promise<Deployment>;
  deleteDeployment: (id: string) => Promise<void>;
  activateDeployment: (id: string) => Promise<void>;
  deactivateDeployment: (id: string) => Promise<void>;
  fetchDeployments: () => Promise<void>;
  getDeploymentVersions: (deploymentId: string) => Promise<DeploymentVersion[]>;
  createDeploymentVersion: (
    deploymentId: string,
    workflowSnapshot: Workflow,
    version: string,
    changelog?: string
  ) => Promise<DeploymentVersion>;
  activateDeploymentVersion: (deploymentId: string, versionId: string) => Promise<void>;
}

/**
 * Deployment Zustand Store
 * 
 * Provides state management for deployments using Zustand.
 * All operations use apiService for backend communication.
 */
export const useDeploymentStore = create<DeploymentState>((set, get) => ({
  // Initial state
  deployments: [],
  activeDeployment: null,
  deploymentVersions: [],
  isLoadingDeployments: false,
  loadErrorDeployments: null,

  /**
   * Create a new deployment
   * @param deploymentData - Deployment form data
   * @param workflowSnapshot - Current workflow snapshot
   * @returns Created deployment
   */
  createDeployment: async (deploymentData: DeploymentFormData, workflowSnapshot: Workflow) => {
    try {
      set({ isLoadingDeployments: true, loadErrorDeployments: null });

      // Create deployment via API
      const deployment = await apiService.createDeployment(deploymentData, workflowSnapshot);

      // Refresh deployment list
      await get().fetchDeployments();

      return deployment;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorDeployments: errorMessage, isLoadingDeployments: false });
      throw error;
    } finally {
      set({ isLoadingDeployments: false });
    }
  },

  /**
   * Update an existing deployment
   * @param id - Deployment ID
   * @param updates - Partial deployment updates (currently only status is supported)
   * @returns Updated deployment
   */
  updateDeployment: async (id: string, updates: Partial<Omit<Deployment, 'id' | 'createdAt'>>) => {
    try {
      set({ isLoadingDeployments: true, loadErrorDeployments: null });

      // API only supports status updates
      if (updates.status) {
        const deployment = await apiService.updateDeploymentStatus(id, updates.status);

        // Refresh deployment list
        await get().fetchDeployments();

        return deployment;
      } else {
        throw new Error('Only status updates are supported via API');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorDeployments: errorMessage, isLoadingDeployments: false });
      throw error;
    } finally {
      set({ isLoadingDeployments: false });
    }
  },

  /**
   * Delete a deployment
   * @param id - Deployment ID
   */
  deleteDeployment: async (id: string) => {
    try {
      set({ isLoadingDeployments: true, loadErrorDeployments: null });

      await apiService.deleteDeployment(id);

      // Refresh deployment list
      await get().fetchDeployments();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorDeployments: errorMessage, isLoadingDeployments: false });
      throw error;
    } finally {
      set({ isLoadingDeployments: false });
    }
  },

  /**
   * Activate a deployment
   * @param id - Deployment ID
   */
  activateDeployment: async (id: string) => {
    try {
      set({ isLoadingDeployments: true, loadErrorDeployments: null });

      await apiService.activateDeployment(id);

      // Refresh deployment list
      await get().fetchDeployments();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorDeployments: errorMessage, isLoadingDeployments: false });
      throw error;
    } finally {
      set({ isLoadingDeployments: false });
    }
  },

  /**
   * Deactivate a deployment
   * @param id - Deployment ID
   */
  deactivateDeployment: async (id: string) => {
    try {
      set({ isLoadingDeployments: true, loadErrorDeployments: null });

      await apiService.deactivateDeployment(id);

      // Refresh deployment list
      await get().fetchDeployments();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorDeployments: errorMessage, isLoadingDeployments: false });
      throw error;
    } finally {
      set({ isLoadingDeployments: false });
    }
  },

  /**
   * Fetch all deployments from the backend
   */
  fetchDeployments: async () => {
    try {
      set({ isLoadingDeployments: true, loadErrorDeployments: null });

      const deployments = await apiService.getDeployments();
      set({ deployments, isLoadingDeployments: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorDeployments: errorMessage, isLoadingDeployments: false });
      throw error;
    }
  },

  /**
   * Get all versions for a specific deployment
   * @param deploymentId - Deployment ID
   * @returns Array of deployment versions
   */
  getDeploymentVersions: async (deploymentId: string) => {
    try {
      const { versions } = await apiService.getDeploymentStatus(deploymentId);
      set({ deploymentVersions: versions });
      return versions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorDeployments: errorMessage });
      throw error;
    }
  },

  /**
   * Create a new deployment version
   * @param deploymentId - Deployment ID
   * @param workflowSnapshot - Workflow snapshot for this version
   * @param version - Version string
   * @param changelog - Optional changelog
   * @returns Created deployment version
   */
  createDeploymentVersion: async (
    deploymentId: string,
    workflowSnapshot: Workflow,
    version: string,
    changelog?: string
  ) => {
    try {
      set({ isLoadingDeployments: true, loadErrorDeployments: null });

      const deploymentVersion = await apiService.createDeploymentVersion(
        deploymentId,
        workflowSnapshot,
        version,
        changelog
      );

      // Refresh version list
      await get().getDeploymentVersions(deploymentId);

      return deploymentVersion;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorDeployments: errorMessage, isLoadingDeployments: false });
      throw error;
    } finally {
      set({ isLoadingDeployments: false });
    }
  },

  /**
   * Activate a specific deployment version (rollback)
   * @param deploymentId - Deployment ID
   * @param versionId - Version ID to activate
   */
  activateDeploymentVersion: async (deploymentId: string, versionId: string) => {
    try {
      set({ isLoadingDeployments: true, loadErrorDeployments: null });

      await apiService.rollbackDeployment(deploymentId, versionId);

      // Refresh version list
      await get().getDeploymentVersions(deploymentId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorDeployments: errorMessage, isLoadingDeployments: false });
      throw error;
    } finally {
      set({ isLoadingDeployments: false });
    }
  },
}));
