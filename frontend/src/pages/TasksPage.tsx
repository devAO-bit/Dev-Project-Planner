// src/pages/TasksPage.tsx
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';

export default function TasksPage() {
  const { projectId } = useParams();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <Link
          to={`/projects/${projectId}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Project
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-600 mt-1">Manage and track individual tasks</p>
          </div>
          <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition">
            <Plus className="w-5 h-5" />
            New Task
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="max-w-md mx-auto">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Task Management</h3>
          <p className="text-gray-600 mb-6">
            This page will allow you to create and manage tasks for your project. 
            Tasks can be assigned to features, prioritized, and tracked through different statuses.
          </p>
          <p className="text-sm text-gray-500">
            Coming soon in the next update!
          </p>
        </div>
      </div>
    </div>
  );
}