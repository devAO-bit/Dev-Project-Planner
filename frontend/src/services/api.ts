// src/services/api.ts
import { apiClient } from '@/lib/api-client';
import type {
  ApiResponse,
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  User,
  Project,
  CreateProjectData,
  UpdateProjectData,
  Feature,
  CreateFeatureData,
  UpdateFeatureData,
  Task,
  CreateTaskData,
  UpdateTaskData,
  ProjectStats
} from '@/types';

// Auth API
export const authApi = {
  register: (credentials: RegisterCredentials) =>
    apiClient.post<AuthResponse>('/auth/register', credentials),

  login: (credentials: LoginCredentials) =>
    apiClient.post<AuthResponse>('/auth/login', credentials),

  getMe: () =>
    apiClient.get<ApiResponse<User>>('/auth/me'),

  updateDetails: (data: { name?: string; email?: string }) =>
    apiClient.put<ApiResponse<User>>('/auth/updatedetails', data),

  updatePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.put<ApiResponse<{ token: string }>>('/auth/updatepassword', data),
};

// Projects API
export const projectsApi = {
  getAll: (params?: { status?: string; category?: string; search?: string }) =>
    apiClient.get<ApiResponse<Project[]>>('/projects', { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Project>>(`/projects/${id}`),

  create: (data: CreateProjectData) =>
    apiClient.post<ApiResponse<Project>>('/projects', data),

  update: (id: string, data: UpdateProjectData) =>
    apiClient.put<ApiResponse<Project>>(`/projects/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/projects/${id}`),

  getStats: (id: string) =>
    apiClient.get<ApiResponse<ProjectStats>>(`/projects/${id}/stats`),
};

// Features API
export const featuresApi = {
  getByProject: (projectId: string, params?: { type?: string; status?: string }) =>
    apiClient.get<ApiResponse<Feature[]>>(`/features/project/${projectId}`, { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Feature>>(`/features/${id}`),

  create: (data: CreateFeatureData) =>
    apiClient.post<ApiResponse<Feature>>('/features', data),

  update: (id: string, data: UpdateFeatureData) =>
    apiClient.put<ApiResponse<Feature>>(`/features/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/features/${id}`),

  reorder: (features: Array<{ id: string; order: number }>) =>
    apiClient.put<ApiResponse<null>>('/features/reorder', { features }),
};

// Tasks API
export const tasksApi = {
  getByProject: (projectId: string, params?: { status?: string; priority?: string; featureId?: string }) =>
    apiClient.get<ApiResponse<Task[]>>(`/tasks/project/${projectId}`, { params }),

  getByFeature: (featureId: string) =>
    apiClient.get<ApiResponse<Task[]>>(`/tasks/feature/${featureId}`),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Task>>(`/tasks/${id}`),

  create: (data: CreateTaskData) =>
    apiClient.post<ApiResponse<Task>>('/tasks', data),

  update: (id: string, data: UpdateTaskData) =>
    apiClient.put<ApiResponse<Task>>(`/tasks/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/tasks/${id}`),

  reorder: (tasks: Array<{ id: string; order: number }>) =>
    apiClient.put<ApiResponse<null>>('/tasks/reorder', { tasks }),
};