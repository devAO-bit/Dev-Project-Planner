// src/pages/DashboardPage.tsx
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
  Calendar
} from 'lucide-react';
import type { Project } from '@/types';
import { getStatusColor, calculateDaysRemaining } from '@/lib/utils';

export default function DashboardPage() {
  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll(),
  });

  const projects = projectsData?.data.data || [];

  // Calculate statistics
  const stats = {
    total: projects.length,
    inProgress: projects.filter((p: Project) => p.status === 'In Progress').length,
    completed: projects.filter((p: Project) => p.status === 'Completed').length,
    planning: projects.filter((p: Project) => p.status === 'Planning').length,
  };

  // Calculate overall progress
  const totalProgress = projects.reduce((sum: number, p: Project) => sum + p.progress, 0);
  const avgProgress = projects.length > 0 ? Math.round(totalProgress / projects.length) : 0;

  const recentProjects = projects.slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 rounded-full" />
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-8 md:p-12 shadow-2xl animate-fadeIn">
          {/* Decorative Background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
              <div className="flex-1 min-w-[300px]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-primary-100 text-sm font-medium">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                  Welcome Back! 👋
                </h1>
                <p className="text-xl text-primary-100 leading-relaxed">
                  Here's an overview of your projects and progress
                </p>
              </div>

              <Link
                to="/projects"
                className="group flex items-center gap-2 bg-white text-primary-700 px-6 py-3 rounded-xl font-semibold hover:bg-primary-50 transition-all hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                New Project
              </Link>
            </div>

            {/* Overall Progress */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-primary-100">Overall Progress</span>
                <span className="text-2xl font-bold text-white">{avgProgress}%</span>
              </div>
              <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-white to-primary-200 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                  style={{ width: `${avgProgress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slideUp" style={{ animationDelay: '100ms' }}>
          <div className="group bg-white rounded-2xl border-2 border-gray-100 p-6 hover:border-primary-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <FolderKanban className="w-7 h-7 text-blue-600" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-xs text-gray-500 font-medium mt-1">Projects</div>
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-700">Total Projects</p>
            <div className="mt-4 flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-2xl border-2 border-gray-100 p-6 hover:border-yellow-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-7 h-7 text-yellow-600" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-yellow-600">{stats.inProgress}</div>
                <div className="text-xs text-gray-500 font-medium mt-1">Active</div>
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-700">In Progress</p>
            <div className="mt-4 flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full transition-all duration-1000" 
                  style={{ width: stats.total > 0 ? `${(stats.inProgress / stats.total) * 100}%` : '0%' }} 
                />
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-2xl border-2 border-gray-100 p-6 hover:border-green-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-xs text-gray-500 font-medium mt-1">Done</div>
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-700">Completed</p>
            <div className="mt-4 flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-1000" 
                  style={{ width: stats.total > 0 ? `${(stats.completed / stats.total) * 100}%` : '0%' }} 
                />
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-2xl border-2 border-gray-100 p-6 hover:border-purple-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Clock className="w-7 h-7 text-purple-600" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-purple-600">{stats.planning}</div>
                <div className="text-xs text-gray-500 font-medium mt-1">Pending</div>
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-700">Planning</p>
            <div className="mt-4 flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-1000" 
                  style={{ width: stats.total > 0 ? `${(stats.planning / stats.total) * 100}%` : '0%' }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Projects Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-slideUp" style={{ animationDelay: '200ms' }}>
          <div className="bg-gradient-to-r from-gray-50 to-transparent px-8 py-6 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-xl">
                <Target className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Recent Projects</h2>
                <p className="text-sm text-gray-600 mt-0.5">Your latest active projects</p>
              </div>
            </div>
            <Link
              to="/projects"
              className="group flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-all"
            >
              View all
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <FolderKanban className="w-12 h-12 text-primary-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No projects yet</h3>
              <p className="text-gray-600 mb-8 text-lg">Get started by creating your first project</p>
              <Link
                to="/projects"
                className="inline-flex items-center gap-2 bg-primary-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-primary-700 transition-all hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5" />
                Create Project
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {recentProjects.map((project: Project, index: number) => {
                const daysRemaining = calculateDaysRemaining(project.endDate);
                const isOverdue = daysRemaining < 0;
                
                return (
                  <Link
                    key={project._id}
                    to={`/projects/${project._id}`}
                    className="block p-6 hover:bg-gradient-to-r hover:from-primary-50 hover:to-transparent transition-all duration-300 group"
                    style={{ animationDelay: `${300 + index * 100}ms` }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                            {project.name}
                          </h3>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.status)}`}>
                            {project.status}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">{project.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <div className="p-1.5 bg-green-100 rounded-lg">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          </div>
                          <span className="font-medium">
                            {project.stats.completedTasks}/{project.stats.totalTasks} tasks
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${isOverdue ? 'bg-red-100' : 'bg-blue-100'}`}>
                            <Clock className={`w-4 h-4 ${isOverdue ? 'text-red-600' : 'text-blue-600'}`} />
                          </div>
                          <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
                            {daysRemaining > 0 ? `${daysRemaining} days left` : 'Overdue'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Enhanced Progress bar */}
                      <div className="flex items-center gap-3">
                        <div className="w-40 h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-1000 relative overflow-hidden"
                            style={{ width: `${project.progress}%` }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                          </div>
                        </div>
                        <span className="text-sm font-bold text-primary-600 min-w-[3rem] text-right">
                          {project.progress}%
                        </span>
                      </div>
                    </div>

                    {/* Category and Date Info */}
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
                          {project.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slideUp" style={{ animationDelay: '300ms' }}>
            <Link
              to="/projects"
              className="group bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <FolderKanban className="w-8 h-8 text-white mb-3" />
                <h3 className="text-xl font-bold text-white mb-2">All Projects</h3>
                <p className="text-primary-100 text-sm mb-4">View and manage all your projects</p>
                <div className="flex items-center gap-2 text-white font-semibold">
                  <span>Go to projects</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 hover:border-primary-300 hover:shadow-xl transition-all duration-300">
              <Target className="w-8 h-8 text-primary-600 mb-3" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Total Features</h3>
              <p className="text-gray-600 text-sm mb-4">Across all projects</p>
              <div className="text-3xl font-bold text-primary-600">
                {projects.reduce((sum: number, p: Project) => sum + p.stats.totalFeatures, 0)}
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 hover:border-primary-300 hover:shadow-xl transition-all duration-300">
              <CheckCircle2 className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Total Tasks</h3>
              <p className="text-gray-600 text-sm mb-4">Across all projects</p>
              <div className="text-3xl font-bold text-green-600">
                {projects.reduce((sum: number, p: Project) => sum + p.stats.totalTasks, 0)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add custom animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }

        .animate-slideUp {
          animation: slideUp 0.6s ease-out forwards;
          opacity: 0;
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}