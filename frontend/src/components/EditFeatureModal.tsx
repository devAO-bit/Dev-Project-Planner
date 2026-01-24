// src/components/EditFeatureModal.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { featuresApi } from '@/services/api';
import type { Feature } from '@/types';
import { useEffect } from 'react';

const featureSchema = z.object({
  name: z.string().min(1, 'Feature name is required').max(200),
  description: z.string().min(1, 'Description is required').max(1000),
  type: z.enum(['core', 'nice-to-have', 'stretch']),
  status: z.enum(['Planned', 'In Progress', 'Testing', 'Completed', 'Blocked']),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']),
});

type FeatureFormData = z.infer<typeof featureSchema>;

interface EditFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: Feature | null;
  projectId: string;
}

export default function EditFeatureModal({ isOpen, onClose, feature, projectId }: EditFeatureModalProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FeatureFormData>({
    resolver: zodResolver(featureSchema),
  });

  // Reset form when feature changes
  useEffect(() => {
    if (feature) {
      reset({
        name: feature.name,
        description: feature.description,
        type: feature.type,
        status: feature.status,
        priority: feature.priority,
      });
    }
  }, [feature, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: FeatureFormData) => 
      featuresApi.update(feature!._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Feature updated successfully!');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update feature');
    },
  });

  const onSubmit = (data: FeatureFormData) => {
    updateMutation.mutate(data);
  };

  if (!isOpen || !feature) return null;

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
            <h2 className="text-2xl font-bold text-gray-900">Edit Feature</h2>
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
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Feature Name *
              </label>
              <input
                {...register('name')}
                id="name"
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                {...register('description')}
                id="description"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition resize-none"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Feature Type *
                </label>
                <select
                  {...register('type')}
                  id="type"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                >
                  <option value="core">Core (Must Have)</option>
                  <option value="nice-to-have">Nice to Have</option>
                  <option value="stretch">Stretch Goal</option>
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  {...register('status')}
                  id="status"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                >
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Testing">Testing</option>
                  <option value="Completed">Completed</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Priority *
              </label>
              <select
                {...register('priority')}
                id="priority"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Progress Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Tasks</p>
                  <p className="font-semibold text-gray-900">
                    {feature.completedTaskCount}/{feature.taskCount}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Progress</p>
                  <p className="font-semibold text-gray-900">{feature.progress}%</p>
                </div>
              </div>
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
                {updateMutation.isPending ? 'Updating...' : 'Update Feature'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}