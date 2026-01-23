export interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export type ProjectCategory =
  | "Web App"
  | "Mobile"
  | "API"
  | "Tool"
  | "Library"
  | "Other";
export type ProjectStatus =
  | "Planning"
  | "In Progress"
  | "On Hold"
  | "Completed"
  | "Cancelled";
export type ProjectDifficulty = "Easy" | "Medium" | "Hard";

export interface ProjectStats {
  totalFeatures: number;
  completedFeatures: number;
  totalTasks: number;
  completedTasks: number;
}

export interface Project {
  _id: string;
  name: string;
  description: string;
  category: ProjectCategory;
  status: ProjectStatus;
  difficulty: ProjectDifficulty;
  targetTimeline: number;
  startDate: string;
  endDate: string;
  userId: string;
  progress: number;
  stats: ProjectStats;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectData {
  name: string;
  description: string;
  category: ProjectCategory;
  targetTimeline: number;
  difficulty?: ProjectDifficulty;
  status?: ProjectStatus;
}

export type UpdateProjectData = Partial<CreateProjectData>;

export type FeatureType = "core" | "nice-to-have" | "stretch";
export type FeatureStatus =
  | "Planned"
  | "In Progress"
  | "Testing"
  | "Completed"
  | "Blocked";
export type Priority = "Critical" | "High" | "Medium" | "Low";

export interface Feature {
  _id: string;
  projectId: string;
  name: string;
  description: string;
  type: FeatureType;
  status: FeatureStatus;
  priority: Priority;
  taskCount: number;
  completedTaskCount: number;
  progress: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeatureData {
  projectId: string;
  name: string;
  description: string;
  type: FeatureType;
  priority?: Priority;
  status?: FeatureStatus;
}

export type UpdateFeatureData = Partial<Omit<CreateFeatureData, "projectId">>;

export type TaskStatus = "Todo" | "In Progress" | "Review" | "Done";

export interface Task {
  _id: string;
  projectId: string;
  featureId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskData {
  projectId: string;
  featureId?: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string;
}

export type UpdateTaskData = Partial<Omit<CreateTaskData, "projectId">>;

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  count?: number;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}
