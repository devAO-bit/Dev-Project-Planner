// src/components/EditProjectModal.tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { projectsApi } from '@/services/api';
import type { ApiError, Project, UpdateProjectData } from '@/types';

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  description: z.string().min(1, 'Description is required').max(1000),
  category: z.enum(['Web App', 'Mobile', 'API', 'Tool', 'Library', 'Other']),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  dueDate: z.string().min(1, 'Due date is required'),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}

export default function EditProjectModal({
  isOpen,
  onClose,
  project,
}: EditProjectModalProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
  });

  // Populate form when project data is available
  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        description: project.description,
        category: project.category,
        difficulty: project.difficulty,
        dueDate: project.endDate
          ? new Date(project.endDate).toISOString().split('T')[0]
          : '',
      });
    }
  }, [project, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: ProjectFormData) => {
      if (!project) return Promise.reject(new Error('No project selected'));

      const startDate = new Date(project.startDate);
      const endDate = new Date(data.dueDate);

      // Calculate target timeline in weeks based on selected due date
      const diffInMs = endDate.getTime() - startDate.getTime();
      const weeks = Math.max(
        1,
        Math.ceil(diffInMs / (1000 * 60 * 60 * 24 * 7)),
      );

      const updateData: UpdateProjectData = {
        name: data.name,
        description: data.description,
        category: data.category,
        difficulty: data.difficulty,
        targetTimeline: weeks,
        endDate: endDate.toISOString(),
      };

      return projectsApi.update(project._id, updateData);
    },
    onSuccess: (_res, _variables, _context) => {
      if (!project) return;
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', project._id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Project updated successfully!');
      onClose();
    },
    onError: (error: ApiError | any) => {
      const message =
        (error as ApiError)?.message || 'Failed to update project';
      toast.error(message);
    },
  });

  if (!isOpen || !project) return null;

  const minDueDate = new Date(project.startDate)
    .toISOString()
    .split('T')[0];

  const onSubmit = (data: ProjectFormData) => {
    updateMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Edit Project
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Project Name *
              </label>
              <input
                {...register('name')}
                id="name"
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                placeholder="E-Commerce Platform"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description *
              </label>
              <textarea
                {...register('description')}
                id="description"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition resize-none"
                placeholder="Brief description of your project..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Category *
                </label>
                <select
                  {...register('category')}
                  id="category"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                >
                  <option value="Web App">Web App</option>
                  <option value="Mobile">Mobile</option>
                  <option value="API">API</option>
                  <option value="Tool">Tool</option>
                  <option value="Library">Library</option>
                  <option value="Other">Other</option>
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.category.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="difficulty"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Difficulty *
                </label>
                <select
                  {...register('difficulty')}
                  id="difficulty"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
                {errors.difficulty && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.difficulty.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="dueDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Due Date *
              </label>
              <input
                {...register('dueDate')}
                id="dueDate"
                type="date"
                min={minDueDate}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
              />
              {errors.dueDate && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.dueDate.message}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

