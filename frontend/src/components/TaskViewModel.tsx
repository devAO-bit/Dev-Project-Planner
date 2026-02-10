import { X, Edit, CheckCircle2 } from 'lucide-react';
import type { Task } from '@/types';

interface Props {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
}

export default function TaskViewModal({ isOpen, task, onClose, onEdit }: Props) {
  if (!isOpen || !task) return null;

  const isCompleted = task.status === 'Done';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-xl rounded-xl shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {isCompleted && <CheckCircle2 className="w-5 h-5 text-green-600" />}
            Task Details
          </h2>
          <button onClick={onClose} className="ml-auto text-gray-500 hover:text-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          <Detail label="Title" value={task.title} />
          {task.description && <Detail label="Description" value={task.description} />}

          <div className="grid grid-cols-2 gap-4">
            <Detail label="Status" value={task.status} />
            <Detail label="Priority" value={task.priority} />
          </div>

          {task.dueDate && (
            <Detail
              label="Due Date"
              value={new Date(task.dueDate).toLocaleDateString()}
            />
          )}

          {isCompleted && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
              This task is completed. Editing it may affect project progress.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-50"
          >
            Close
          </button>

          <button
            onClick={() => onEdit(task)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit Task
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------- Small helper -------- */

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="font-medium text-gray-900">{value}</div>
    </div>
  );
}
