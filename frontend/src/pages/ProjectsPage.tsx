// src/pages/ProjectsPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  FolderKanban,
  Trash2,
  Edit,
  Calendar,
  RefreshCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { projectsApi } from '@/services/api';
import type { ApiError, Project, ProjectStatus } from '@/types';
import { formatDate } from '@/lib/utils';
import CreateProjectModal from '@/components/CreateProjectModal';
import { useDebounce } from '../hooks/useDebounce';

/* -------------------------------- Skeletons -------------------------------- */

function ProjectsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="h-28 bg-gray-200" />
          <div className="p-6 space-y-4">
            <div className="h-4 bg-gray-200 rounded w-2/3" />
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
            <div className="h-2 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------- Page -------------------------------- */

export default function ProjectsPage() {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 400);

  const {
    data: projectsData,
    isLoading,
    isFetching,
    isError,
    refetch
  } = useQuery({
    queryKey: [
      'projects',
      {
        search: debouncedSearch,
        status: statusFilter !== 'all' ? statusFilter : undefined
      }
    ],
    queryFn: () =>
      projectsApi.getAll({
        search: debouncedSearch || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
      }),
    placeholderData: (previousData) => previousData
  });

  const deleteMutation = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to delete project');
    }
  });

  const projects: Project[] = projectsData?.data?.data || [];

  /* ------------------------------ Error State ------------------------------ */

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm">
          <h2 className="text-xl font-semibold text-gray-900">
            Unable to load projects
          </h2>
          <p className="text-gray-600 mt-2">
            Something went wrong. Please try again.
          </p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <RefreshCcw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------ Stats ------------------------------ */

  const stats = {
    total: projects.length,
    inProgress: projects.filter(p => p.status === 'In Progress').length,
    completed: projects.filter(p => p.status === 'Completed').length,
    planning: projects.filter(p => p.status === 'Planning').length
  };

  const handleDelete = (id: string, name: string) => {
    toast.warning(
      `Delete "${name}"?`,
      {
        description:
          'This will permanently remove the project and all its data.',
        action: {
          label: 'Delete',
          onClick: () => deleteMutation.mutate(id)
        }
      }
    );
  };

  /* -------------------------------- Render -------------------------------- */

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600 mt-1">
              Track and manage all your projects
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-primary-700 transition"
          >
            <Plus className="w-5 h-5" />
            New Project
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e =>
                setStatusFilter(e.target.value as ProjectStatus | 'all')
              }
              className="px-4 py-3 border border-gray-200 rounded-lg bg-white font-medium"
            >
              <option value="all">All Status</option>
              <option value="Planning">Planning</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <ProjectsSkeleton />
        ) : projects.length === 0 ? (
          <div className="text-center bg-white rounded-xl p-12 border">
            <FolderKanban className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold">No projects found</h3>
            <p className="text-gray-600 mt-2">
              Try adjusting filters or create a new project.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <div
                key={project._id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition overflow-hidden"
              >
                <Link to={`/projects/${project._id}`} className="block p-6">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary-50 text-primary-700">
                    {project.status}
                  </span>

                  <h3 className="mt-3 text-lg font-bold text-gray-900 line-clamp-1">
                    {project.name}
                  </h3>

                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {project.description}
                  </p>

                  <div className="mt-4 text-xs text-gray-500 flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {formatDate(project.createdAt)}
                  </div>
                </Link>

                <div className="flex justify-end gap-2 px-6 py-3 border-t bg-gray-50">
                  <Link
                    to={`/projects/${project._id}`}
                    className="p-2 rounded-lg hover:bg-white"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </Link>
                  <button
                    onClick={() => handleDelete(project._id, project.name)}
                    className="p-2 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isFetching && (
          <div className="text-center text-xs text-gray-500 mt-4">
            Updating results…
          </div>
        )}
      </div>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
