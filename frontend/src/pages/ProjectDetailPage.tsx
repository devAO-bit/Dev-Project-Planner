// src/pages/ProjectDetailPage.tsx
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  ListTodo,
  Layers,
  Calendar,
  Tag,
  TrendingUp,
  Clock,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { projectsApi } from '@/services/api';
import { formatDate } from '@/lib/utils';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.getById(id!),
    enabled: !!id,
  });

  const project = data?.data?.data;

  /* ---------------------------------- */
  /* Derived & guarded values            */
  /* ---------------------------------- */
  const {
    completedItems,
    remainingItems,
    featureProgress,
    taskProgress,
  } = useMemo(() => {
    if (!project) {
      return {
        completedItems: 0,
        remainingItems: 0,
        featureProgress: 0,
        taskProgress: 0,
      };
    }

    const completed =
      project.stats.completedFeatures + project.stats.completedTasks;

    const total =
      project.stats.totalFeatures + project.stats.totalTasks;

    return {
      completedItems: completed,
      remainingItems: total - completed,
      featureProgress:
        project.stats.totalFeatures === 0
          ? 0
          : (project.stats.completedFeatures /
              project.stats.totalFeatures) *
            100,
      taskProgress:
        project.stats.totalTasks === 0
          ? 0
          : (project.stats.completedTasks /
              project.stats.totalTasks) *
            100,
    };
  }, [project]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-gray-200 rounded-full relative">
            <div className="absolute inset-0 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="mt-4 text-sm text-gray-500 animate-pulse">
            Loading project details…
          </p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Layers className="w-12 h-12 mx-auto text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-900">
            Project not found
          </h2>
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 text-primary-600 font-medium hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to projects
          </Link>
        </div>
      </div>
    );
  }

  const isCompleted = project.status === 'completed';
  const isInProgress = project.status === 'in_progress';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-12">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 p-10 text-white">
          <div className="flex flex-wrap gap-8 items-center justify-between">
            <div className="max-w-3xl">
              <div className="flex gap-3 mb-4">
                <span
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full ${
                    isCompleted
                      ? 'bg-green-500/20'
                      : isInProgress
                      ? 'bg-blue-500/20'
                      : 'bg-yellow-500/20'
                  }`}
                >
                  {project.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className="px-4 py-1.5 text-xs font-semibold rounded-full bg-white/10">
                  {project.difficulty}
                </span>
              </div>

              <h1 className="text-4xl font-bold mb-3">
                {project.name}
              </h1>
              <p className="text-primary-100 text-lg">
                {project.description}
              </p>
            </div>

            {/* Progress ring */}
            <div className="relative w-28 h-28">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-white/20"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  className="text-white"
                  style={{
                    strokeDasharray: 2 * Math.PI * 48,
                    strokeDashoffset:
                      2 *
                      Math.PI *
                      48 *
                      (1 - project.progress / 100),
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">
                  {project.progress}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* META INFO */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Meta icon={Tag} label="Category" value={project.category} />
          <Meta icon={Calendar} label="Created" value={formatDate(project.createdAt)} />
          <Meta icon={Clock} label="Due Date" value={formatDate(project.endDate)} />
          <Meta icon={TrendingUp} label="Difficulty" value={project.difficulty} />
        </div>

        {/* STATS */}
        <div className="grid md:grid-cols-3 gap-6">
          <NavCard
            title="Features"
            icon={Layers}
            total={project.stats.totalFeatures}
            completed={project.stats.completedFeatures}
            progress={featureProgress}
            to={`/projects/${id}/features`}
            color="primary"
          />
          <NavCard
            title="Tasks"
            icon={ListTodo}
            total={project.stats.totalTasks}
            completed={project.stats.completedTasks}
            progress={taskProgress}
            to={`/projects/${id}/tasks`}
            color="blue"
          />

          <div className="rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 p-6 text-white">
            <BarChart3 className="w-8 h-8 mb-4" />
            <h3 className="text-xl font-bold mb-2">Analytics</h3>
            <p className="text-purple-100 text-sm mb-6">
              Overall project health
            </p>
            <div className="flex justify-between text-sm">
              <span>Done</span>
              <span>{completedItems}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Pending</span>
              <span>{remainingItems}</span>
            </div>
          </div>
        </div>

        {/* OVERALL PROGRESS */}
        <div className="bg-white rounded-2xl p-8 shadow border">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold">Overall Progress</h2>
              <p className="text-sm text-gray-500">
                Completed {completedItems} of{' '}
                {completedItems + remainingItems}
              </p>
            </div>
            <span className="text-4xl font-bold text-primary-600">
              {project.progress}%
            </span>
          </div>

          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- */
/* Reusable components                  */
/* ---------------------------------- */

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl p-4 border shadow-sm">
      <Icon className="w-5 h-5 text-primary-600" />
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="font-semibold text-gray-900">{value}</div>
      </div>
    </div>
  );
}

function NavCard({
  title,
  icon: Icon,
  total,
  completed,
  progress,
  to,
}: any) {
  return (
    <Link
      to={to}
      className="group bg-white rounded-2xl p-6 border shadow hover:shadow-lg transition"
    >
      <Icon className="w-8 h-8 text-primary-600 mb-4" />
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">
        {completed} of {total} completed
      </p>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-primary-600 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center gap-2 text-sm font-medium text-primary-600">
        View details
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}
