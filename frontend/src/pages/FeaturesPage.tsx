// src/pages/FeaturesPage.tsx
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';

export default function FeaturesPage() {
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
            <h1 className="text-3xl font-bold text-gray-900">Features</h1>
            <p className="text-gray-600 mt-1">Manage project features and milestones</p>
          </div>
          <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition">
            <Plus className="w-5 h-5" />
            New Feature
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="max-w-md mx-auto">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Feature Management</h3>
          <p className="text-gray-600 mb-6">
            This page will allow you to create and manage features for your project. 
            Features can be categorized as Core, Nice-to-Have, or Stretch goals.
          </p>
          <p className="text-sm text-gray-500">
            Coming soon in the next update!
          </p>
        </div>
      </div>
    </div>
  );
}