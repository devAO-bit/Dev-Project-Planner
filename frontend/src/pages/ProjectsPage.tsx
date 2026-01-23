// src/pages/ProjectsPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, FolderKanban, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { projectsApi } from '@/services/api';
import type { ApiError, Project, ProjectStatus } from '@/types';
import { getStatusColor, formatDate } from '@/lib/utils';
import CreateProjectModal from '@/components/CreateProjectModal';

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects', { search: searchQuery, status: statusFilter !== 'all' ? statusFilter : undefined }],
    queryFn: () => projectsApi.getAll({
      search: searchQuery || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to delete project');
    },
  });

  const projects = projectsData?.data.data || [];

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This will also delete all features and tasks.`)) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600 mt-1">Manage and track all your development projects</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition"
          >
            <Plus className="w-5 h-5" />
            New Project
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="all">All Status</option>
            <option value="Planning">Planning</option>
            <option value="In Progress">In Progress</option>
            <option value="On Hold">On Hold</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FolderKanban className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects found</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by creating your first project'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition"
            >
              <Plus className="w-5 h-5" />
              Create Your First Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: Project) => (
            <div
              key={project._id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition overflow-hidden group"
            >
              <Link to={`/projects/${project._id}`} className="block p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition line-clamp-1">
                    {project.name}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium text-gray-900">{project.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-600 rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Features</p>
                      <p className="text-sm font-medium text-gray-900">
                        {project.stats.completedFeatures}/{project.stats.totalFeatures}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Tasks</p>
                      <p className="text-sm font-medium text-gray-900">
                        {project.stats.completedTasks}/{project.stats.totalTasks}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                    <span>{project.category}</span>
                    <span>{formatDate(project.createdAt)}</span>
                  </div>
                </div>
              </Link>

              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2">
                <Link
                  to={`/projects/${project._id}`}
                  className="p-2 text-gray-600 hover:text-primary-600 hover:bg-white rounded-lg transition"
                  title="Edit project"
                >
                  <Edit className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleDelete(project._id, project.name)}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-white rounded-lg transition"
                  title="Delete project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}