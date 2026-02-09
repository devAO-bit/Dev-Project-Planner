// src/pages/DashboardPage.tsx
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { projectsApi } from '@/services/api';
import {
  FolderKanban,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Target,
  Zap,
  Calendar,
} from 'lucide-react';
import type { Project } from '@/types';
import { getStatusColor, calculateDaysRemaining } from '@/lib/utils';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
  });

  const projects: Project[] = data?.data?.data ?? [];

  /* -------------------- Derived State -------------------- */
  const stats = useMemo(() => {
    return {
      total: projects.length,
      inProgress: projects.filter(p => p.status === 'In Progress').length,
      completed: projects.filter(p => p.status === 'Completed').length,
      planning: projects.filter(p => p.status === 'Planning').length,
    };
  }, [projects]);

  const avgProgress = useMemo(() => {
    if (!projects.length) return 0;
    return Math.round(
      projects.reduce((sum, p) => sum + p.progress, 0) / projects.length
    );
  }, [projects]);

  const recentProjects = projects.slice(0, 5);

  /* -------------------- Loading -------------------- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500 animate-pulse">
            Loading your dashboard…
          </p>
        </div>
      </div>
    );
  }

  /* -------------------- UI -------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">

        {/* ---------------- Hero ---------------- */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-10 shadow-2xl animate-fadeIn">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-white rounded-full blur-3xl" />
            <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row gap-10 items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-primary-100 text-sm">
                  {new Date().toLocaleDateString()}
                </span>
              </div>

              <h1 className="text-4xl font-bold text-white mb-3">
                Welcome back 👋
              </h1>
              <p className="text-primary-100 max-w-xl">
                Track progress, manage priorities, and move projects forward.
              </p>

              <Link
                to="/projects"
                className="inline-flex mt-6 items-center gap-2 bg-white text-primary-700 px-6 py-3 rounded-xl font-semibold hover:bg-primary-50 transition"
              >
                <Plus className="w-5 h-5" />
                New Project
              </Link>
            </div>

            {/* Progress */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 w-full max-w-sm">
              <div className="flex justify-between mb-3">
                <span className="text-primary-100 text-sm">
                  Overall Progress
                </span>
                <span className="text-white font-bold text-xl">
                  {avgProgress}%
                </span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-white to-primary-200 transition-all duration-700"
                  style={{ width: `${avgProgress}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Stats ---------------- */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-slideUp">
          {[
            {
              label: 'Projects',
              value: stats.total,
              icon: FolderKanban,
              color: 'blue',
            },
            {
              label: 'In Progress',
              value: stats.inProgress,
              icon: TrendingUp,
              color: 'yellow',
            },
            {
              label: 'Completed',
              value: stats.completed,
              icon: CheckCircle2,
              color: 'green',
            },
            {
              label: 'Planning',
              value: stats.planning,
              icon: Clock,
              color: 'purple',
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="bg-white rounded-2xl border p-6 hover:shadow-xl transition"
            >
              <Icon className={`w-8 h-8 text-${color}-600 mb-3`} />
              <div className="text-3xl font-bold">{value}</div>
              <div className="text-sm text-gray-500">{label}</div>
            </div>
          ))}
        </section>

        {/* ---------------- Recent Projects ---------------- */}
        <section className="bg-white rounded-2xl border shadow-lg overflow-hidden animate-slideUp">
          <header className="px-8 py-6 border-b flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-primary-600" />
              <h2 className="text-xl font-bold">Recent Projects</h2>
            </div>
            <Link
              to="/projects"
              className="text-primary-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </header>

          {projects.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600 mb-6">
                No projects yet. Start building something 🚀
              </p>
              <Link
                to="/projects"
                className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl"
              >
                <Plus className="w-4 h-4" />
                Create Project
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {recentProjects.map(project => {
                const hasEndDate = Boolean(project.endDate);
                const days = hasEndDate
                  ? calculateDaysRemaining(project.endDate)
                  : 0;
                const overdue = hasEndDate && days < 0;

                return (
                  <Link
                    key={project._id}
                    to={`/projects/${project._id}`}
                    className="block p-6 hover:bg-primary-50 transition"
                  >
                    <div className="flex justify-between mb-2">
                      <h3 className="font-semibold text-lg">
                        {project.name}
                      </h3>
                      <span
                        className={`px-3 py-1 text-xs rounded-full ${getStatusColor(
                          project.status
                        )}`}
                      >
                        {project.status}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {project.description}
                    </p>

                    <div className="flex justify-between items-center">
                      <span
                        className={`text-sm font-medium ${
                          overdue ? 'text-red-600' : 'text-gray-600'
                        }`}
                      >
                        {!hasEndDate
                          ? 'No due date'
                          : overdue
                          ? 'Overdue'
                          : `${days} days left`}
                      </span>

                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-100 rounded-full">
                          <div
                            className="h-full bg-primary-600 rounded-full"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold">
                          {project.progress}%
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Animations */}
      <style>{`
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out both;
        }
        .animate-slideUp {
          animation: slideUp 0.6s ease-out both;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
