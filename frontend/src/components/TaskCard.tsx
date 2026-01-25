// src/components/TaskCard.tsx
import type { Task } from '@/types';
import { getStatusColor, getPriorityColor, formatDate } from '@/lib/utils';
import { Edit, Trash2, Calendar, CheckCircle2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/services/api';
import { toast } from 'sonner';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  projectId: string;
}

export default function TaskCard({ task, onEdit, onDelete, projectId }: TaskCardProps) {
  const queryClient = useQueryClient();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete task "${task.title}"?`)) {
      onDelete(task);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(task);
  };

  // Quick status toggle with proper invalidation
  const toggleStatusMutation = useMutation({
    mutationFn: () => {
      const newStatus = task.status === 'Done' ? 'Todo' : 'Done';
      return tasksApi.update(task._id, { status: newStatus });
    },
    onSuccess: async () => {
      // Invalidate all related queries to trigger refetch
      await queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['features', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      
      // Force refetch to ensure data is fresh
      queryClient.refetchQueries({ queryKey: ['tasks', projectId] });
      queryClient.refetchQueries({ queryKey: ['features', projectId] });
      queryClient.refetchQueries({ queryKey: ['project', projectId] });
      
      toast.success('Task status updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update task status');
    },
  });

  const handleToggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleStatusMutation.mutate();
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done';

  return (
    <div className={`bg-white rounded-lg border-2 transition-all ${
      task.status === 'Done' 
        ? 'border-green-200 bg-green-50/30' 
        : 'border-gray-200 hover:border-primary-200 hover:shadow-md'
    }`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Checkbox */}
          <button
            onClick={handleToggleStatus}
            disabled={toggleStatusMutation.isPending}
            className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
              toggleStatusMutation.isPending 
                ? 'opacity-50 cursor-not-allowed' 
                : task.status === 'Done'
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-300 hover:border-primary-500'
            }`}
          >
            {task.status === 'Done' && <CheckCircle2 className="w-4 h-4 text-white" />}
          </button>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h3 className={`text-base font-semibold mb-2 ${
              task.status === 'Done' ? 'text-gray-500 line-through' : 'text-gray-900'
            }`}>
              {task.title}
            </h3>

            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                {task.status}
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
            </div>

            {/* Description */}
            {task.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                {task.description}
              </p>
            )}

            {/* Due Date */}
            {task.dueDate && (
              <div className={`flex items-center gap-1.5 text-xs ${
                isOverdue ? 'text-red-600' : 'text-gray-500'
              }`}>
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  Due {formatDate(task.dueDate)}
                  {isOverdue && ' (Overdue)'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 my-3" />

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={handleEdit}
            className="p-1.5 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
            title="Edit task"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Delete task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}