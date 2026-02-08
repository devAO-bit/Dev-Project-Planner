// src/pages/FeaturesPage.tsx
import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Filter,
  Layers,
  CheckCircle2,
  Clock,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';

import { featuresApi, projectsApi } from '@/services/api';
import type {
  Feature,
  FeatureType,
  FeatureStatus,
  Priority,
} from '@/types';

import CreateFeatureModal from '@/components/CreateFeatureModal';
import EditFeatureModal from '@/components/EditFeatureModal';
import FeatureCard from '@/components/FeatureCard';

export default function FeaturesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] =
    useState<Feature | null>(null);

  const [typeFilter, setTypeFilter] =
    useState<FeatureType | 'all'>('all');
  const [statusFilter, setStatusFilter] =
    useState<FeatureStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] =
    useState<Priority | 'all'>('all');

  /* ---------------------------------- */
  /* Queries                            */
  /* ---------------------------------- */

  const { data: projectData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.getById(projectId!),
    enabled: !!projectId,
  });

  const { data: featuresData, isLoading } = useQuery({
    queryKey: ['features', projectId, typeFilter, statusFilter],
    queryFn: () =>
      featuresApi.getByProject(projectId!, {
        type: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
    enabled: !!projectId,
  });

  const features = featuresData?.data?.data ?? [];
  const project = projectData?.data?.data;

  /* ---------------------------------- */
  /* Derived data (memoized)             */
  /* ---------------------------------- */

  const filteredFeatures = useMemo(() => {
    if (priorityFilter === 'all') return features;
    return features.filter(
      (f) => f.priority === priorityFilter
    );
  }, [features, priorityFilter]);

  const stats = useMemo(() => {
    const total = features.length;
    const completed = features.filter(
      (f) => f.status === 'Completed'
    ).length;
    const inProgress = features.filter(
      (f) => f.status === 'In Progress'
    ).length;
    const core = features.filter(
      (f) => f.type === 'core'
    ).length;

    return {
      total,
      completed,
      inProgress,
      core,
      completionRate:
        total === 0 ? 0 : Math.round((completed / total) * 100),
    };
  }, [features]);

  /* ---------------------------------- */
  /* Mutations                          */
  /* ---------------------------------- */

  const deleteMutation = useMutation({
    mutationFn: featuresApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['features', projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ['project', projectId],
      });
      toast.success('Feature deleted');
    },
    onError: () => {
      toast.error('Failed to delete feature');
    },
  });

  /* ---------------------------------- */
  /* Handlers                           */
  /* ---------------------------------- */

  const handleEdit = (feature: Feature) => {
    setSelectedFeature(feature);
    setIsEditModalOpen(true);
  };

  const handleDelete = (feature: Feature) => {
    deleteMutation.mutate(feature._id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-200 rounded-full relative">
          <div className="absolute inset-0 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  /* ---------------------------------- */
  /* Render                             */
  /* ---------------------------------- */

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link
            to={`/projects/${projectId}`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Project
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 p-8 text-white">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                {project?.name}
              </h1>
              <p className="text-purple-100">
                Manage and track project features
              </p>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 bg-white text-purple-700 px-6 py-3 rounded-xl font-semibold hover:bg-purple-50 transition"
            >
              <Plus className="w-5 h-5" />
              New Feature
            </button>
          </div>

          {/* Progress */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Completion</span>
              <span>{stats.completionRate}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{
                  width: `${stats.completionRate}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total" value={stats.total} icon={Layers} />
          <Stat label="Core" value={stats.core} icon={Target} />
          <Stat
            label="In Progress"
            value={stats.inProgress}
            icon={Clock}
          />
          <Stat
            label="Completed"
            value={stats.completed}
            icon={CheckCircle2}
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold">Filters</h2>

            {(typeFilter !== 'all' ||
              statusFilter !== 'all' ||
              priorityFilter !== 'all') && (
              <button
                onClick={() => {
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                }}
                className="ml-auto text-sm text-purple-600 hover:underline"
              >
                Reset
              </button>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Select
              label="Type"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                ['all', 'All'],
                ['core', 'Core'],
                ['nice-to-have', 'Nice to have'],
                ['stretch', 'Stretch'],
              ]}
            />
            <Select
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                ['all', 'All'],
                ['Planned', 'Planned'],
                ['In Progress', 'In Progress'],
                ['Testing', 'Testing'],
                ['Completed', 'Completed'],
                ['Blocked', 'Blocked'],
              ]}
            />
            <Select
              label="Priority"
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={[
                ['all', 'All'],
                ['Critical', 'Critical'],
                ['High', 'High'],
                ['Medium', 'Medium'],
                ['Low', 'Low'],
              ]}
            />
          </div>
        </div>

        {/* Features */}
        {filteredFeatures.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border">
            <Layers className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold mb-2">
              No features found
            </h3>
            <p className="text-gray-600 mb-6">
              Add features or adjust filters
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold"
            >
              <Plus className="w-4 h-4" />
              Add Feature
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFeatures.map((feature) => (
              <FeatureCard
                key={feature._id}
                feature={feature}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

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

/* ---------------------------------- */
/* Reusable UI                         */
/* ---------------------------------- */

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: any;
}) {
  return (
    <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
      <Icon className="w-5 h-5 text-purple-600" />
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-lg font-bold">{value}</div>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: any) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-xl px-4 py-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
      >
        {options.map(([val, text]: any) => (
          <option key={val} value={val}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}
