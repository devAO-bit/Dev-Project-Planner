// src/components/FeatureCard.tsx
import type { Feature } from '@/types';
import { getStatusColor, getPriorityColor, getFeatureTypeColor } from '@/lib/utils';
import { Edit, Trash2, ListTodo } from 'lucide-react';

interface FeatureCardProps {
  feature: Feature;
  onEdit: (feature: Feature) => void;
  onDelete: (feature: Feature) => void;
}

export default function FeatureCard({ feature, onEdit, onDelete }: FeatureCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${feature.name}"? This will also delete all associated tasks.`)) {
      onDelete(feature);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(feature);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate mb-2">
              {feature.name}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getFeatureTypeColor(feature.type)}`}>
                {feature.type === 'nice-to-have' ? 'Nice to Have' : 
                 feature.type === 'stretch' ? 'Stretch Goal' : 'Core'}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(feature.status)}`}>
                {feature.status}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(feature.priority)}`}>
                {feature.priority}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {feature.description}
        </p>

        {/* Progress */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium text-gray-900">{feature.progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 rounded-full transition-all"
              style={{ width: `${feature.progress}%` }}
            />
          </div>
        </div>

        {/* Tasks Info */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <ListTodo className="w-4 h-4" />
          <span>
            {feature.completedTaskCount}/{feature.taskCount} tasks completed
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 my-4" />

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={handleEdit}
            className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
            title="Edit feature"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Delete feature"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}