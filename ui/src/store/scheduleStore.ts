import { create } from 'zustand';
import {
  Schedule,
  ScheduleStatus,
  CreateScheduleRequest,
  UpdateScheduleRequest,
} from '../types/schedule';
import { apiService } from '../services/apiService';

interface ScheduleStore {
  schedules: Schedule[];
  selectedSchedule: Schedule | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSchedules: () => Promise<void>;
  fetchSchedulesByDeployment: (deploymentId: string) => Promise<void>;
  fetchSchedule: (scheduleId: string) => Promise<void>;
  createSchedule: (request: CreateScheduleRequest) => Promise<Schedule>;
  updateSchedule: (scheduleId: string, request: UpdateScheduleRequest) => Promise<Schedule>;
  deleteSchedule: (scheduleId: string) => Promise<void>;
  pauseSchedule: (scheduleId: string) => Promise<Schedule>;
  resumeSchedule: (scheduleId: string) => Promise<Schedule>;
  setSelectedSchedule: (schedule: Schedule | null) => void;
  clearError: () => void;
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  schedules: [],
  selectedSchedule: null,
  isLoading: false,
  error: null,

  fetchSchedules: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.getSchedules();
      set({ schedules: response.schedules, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch schedules', isLoading: false });
      throw error;
    }
  },

  fetchSchedulesByDeployment: async (deploymentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.getSchedulesByDeployment(deploymentId);
      set({ schedules: response.schedules, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch schedules', isLoading: false });
      throw error;
    }
  },

  fetchSchedule: async (scheduleId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.getSchedule(scheduleId);
      set({ selectedSchedule: response.schedule, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch schedule', isLoading: false });
      throw error;
    }
  },

  createSchedule: async (request: CreateScheduleRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.createSchedule(request);
      const newSchedule = response.schedule;
      set((state) => ({
        schedules: [newSchedule, ...state.schedules],
        isLoading: false,
      }));
      return newSchedule;
    } catch (error: any) {
      set({ error: error.message || 'Failed to create schedule', isLoading: false });
      throw error;
    }
  },

  updateSchedule: async (scheduleId: string, request: UpdateScheduleRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.updateSchedule(scheduleId, request);
      const updatedSchedule = response.schedule;
      set((state) => ({
        schedules: state.schedules.map((s) =>
          s.id === scheduleId ? updatedSchedule : s
        ),
        selectedSchedule:
          state.selectedSchedule?.id === scheduleId
            ? updatedSchedule
            : state.selectedSchedule,
        isLoading: false,
      }));
      return updatedSchedule;
    } catch (error: any) {
      set({ error: error.message || 'Failed to update schedule', isLoading: false });
      throw error;
    }
  },

  deleteSchedule: async (scheduleId: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.deleteSchedule(scheduleId);
      set((state) => ({
        schedules: state.schedules.filter((s) => s.id !== scheduleId),
        selectedSchedule:
          state.selectedSchedule?.id === scheduleId ? null : state.selectedSchedule,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete schedule', isLoading: false });
      throw error;
    }
  },

  pauseSchedule: async (scheduleId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.pauseSchedule(scheduleId);
      const updatedSchedule = response.schedule;
      set((state) => ({
        schedules: state.schedules.map((s) =>
          s.id === scheduleId ? updatedSchedule : s
        ),
        selectedSchedule:
          state.selectedSchedule?.id === scheduleId
            ? updatedSchedule
            : state.selectedSchedule,
        isLoading: false,
      }));
      return updatedSchedule;
    } catch (error: any) {
      set({ error: error.message || 'Failed to pause schedule', isLoading: false });
      throw error;
    }
  },

  resumeSchedule: async (scheduleId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.resumeSchedule(scheduleId);
      const updatedSchedule = response.schedule;
      set((state) => ({
        schedules: state.schedules.map((s) =>
          s.id === scheduleId ? updatedSchedule : s
        ),
        selectedSchedule:
          state.selectedSchedule?.id === scheduleId
            ? updatedSchedule
            : state.selectedSchedule,
        isLoading: false,
      }));
      return updatedSchedule;
    } catch (error: any) {
      set({ error: error.message || 'Failed to resume schedule', isLoading: false });
      throw error;
    }
  },

  setSelectedSchedule: (schedule: Schedule | null) => {
    set({ selectedSchedule: schedule });
  },

  clearError: () => {
    set({ error: null });
  },
}));




