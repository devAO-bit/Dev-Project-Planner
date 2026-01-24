// src/pages/FeaturesPage.tsx
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Filter, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { featuresApi, projectsApi } from '@/services/api';
import type { Feature, FeatureType, FeatureStatus, Priority } from '@/types';
import CreateFeatureModal from '@/components/CreateFeatureModal';
import EditFeatureModal from '@/components/EditFeatureModal';
import FeatureCard from '@/components/FeatureCard';

export default function FeaturesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [typeFilter, setTypeFilter] = useState<FeatureType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<FeatureStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');

  // Fetch project details
  const { data: projectData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.getById(projectId!),
    enabled: !!projectId,
  });

  const project = projectData?.data.data;

  // Fetch features
  const { data: featuresData, isLoading } = useQuery({
    queryKey: ['features', projectId, typeFilter, statusFilter],
    queryFn: () => featuresApi.getByProject(projectId!, {
      type: typeFilter !== 'all' ? typeFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
    enabled: !!projectId,
  });

  const features = featuresData?.data.data || [];

  // Filter by priority on client side
  const filteredFeatures = priorityFilter === 'all' 
    ? features 
    : features.filter((f: Feature) => f.priority === priorityFilter);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: featuresApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Feature deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete feature');
    },
  });

  const handleEdit = (feature: Feature) => {
    setSelectedFeature(feature);
    setIsEditModalOpen(true);
  };

  const handleDelete = (feature: Feature) => {
    deleteMutation.mutate(feature._id);
  };

  // Calculate statistics
  const stats = {
    total: features.length,
    core: features.filter((f: Feature) => f.type === 'core').length,
    niceToHave: features.filter((f: Feature) => f.type === 'nice-to-have').length,
    stretch: features.filter((f: Feature) => f.type === 'stretch').length,
    completed: features.filter((f: Feature) => f.status === 'Completed').length,
    inProgress: features.filter((f: Feature) => f.status === 'In Progress').length,
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
        <Link
          to={`/projects/${projectId}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Project
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project?.name}</h1>
            <p className="text-gray-600 mt-1">Manage project features and track progress</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition"
          >
            <Plus className="w-5 h-5" />
            New Feature
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Total Features</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Core Features</p>
            <p className="text-2xl font-bold text-purple-600">{stats.core}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">In Progress</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Completed</p>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filters:</span>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as FeatureType | 'all')}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="all">All Types</option>
            <option value="core">Core</option>
            <option value="nice-to-have">Nice to Have</option>
            <option value="stretch">Stretch Goal</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FeatureStatus | 'all')}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Planned">Planned</option>
            <option value="In Progress">In Progress</option>
            <option value="Testing">Testing</option>
            <option value="Completed">Completed</option>
            <option value="Blocked">Blocked</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {(typeFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all') && (
            <button
              onClick={() => {
                setTypeFilter('all');
                setStatusFilter('all');
                setPriorityFilter('all');
              }}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Features Grid */}
      {filteredFeatures.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {features.length === 0 ? 'No features yet' : 'No features match your filters'}
          </h3>
          <p className="text-gray-600 mb-6">
            {features.length === 0 
              ? 'Get started by adding features to organize your project development'
              : 'Try adjusting your filters to see more features'}
          </p>
          {features.length === 0 && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition"
            >
              <Plus className="w-5 h-5" />
              Add Your First Feature
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFeatures.map((feature: Feature) => (
            <FeatureCard
              key={feature._id}
              feature={feature}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateFeatureModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        projectId={projectId!}
      />

      <EditFeatureModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedFeature(null);
        }}
        feature={selectedFeature}
        projectId={projectId!}
      />
    </div>
  );
}