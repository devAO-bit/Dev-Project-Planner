// src/pages/ProjectDetailPage.tsx
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, ListTodo, Layers } from 'lucide-react';
import { projectsApi } from '@/services/api';
import { formatDate, getStatusColor } from '@/lib/utils';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: projectData, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.getById(id!),
    enabled: !!id,
  });

  const project = projectData?.data.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Project not found</p>
        <Link to="/projects" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-600 mt-2">{project.description}</p>
          </div>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(project.status)}`}>
            {project.status}
          </span>
        </div>

        <div className="flex items-center gap-6 mt-6 text-sm text-gray-600">
          <span>Category: {project.category}</span>
          <span>Difficulty: {project.difficulty}</span>
          <span>Created: {formatDate(project.createdAt)}</span>
          <span>Due: {formatDate(project.endDate)}</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          to={`/projects/${id}/features`}
          className="bg-white p-6 rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition group"
        >
          <Layers className="w-8 h-8 text-primary-600 mb-3" />
          <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition">
            Features
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {project.stats.completedFeatures}/{project.stats.totalFeatures} completed
          </p>
        </Link>

        <Link
          to={`/projects/${id}/tasks`}
          className="bg-white p-6 rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition group"
        >
          <ListTodo className="w-8 h-8 text-primary-600 mb-3" />
          <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition">
            Tasks
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {project.stats.completedTasks}/{project.stats.totalTasks} completed
          </p>
        </Link>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <BarChart3 className="w-8 h-8 text-primary-600 mb-3" />
          <h3 className="font-semibold text-gray-900">Progress</h3>
          <p className="text-2xl font-bold text-primary-600 mt-2">{project.progress}%</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Overall Progress</h2>
        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-600 rounded-full transition-all"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}