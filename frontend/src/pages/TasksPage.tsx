// src/pages/TasksPage.tsx
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Filter, ListTodo } from 'lucide-react';
import { toast } from 'sonner';
import { tasksApi, featuresApi, projectsApi } from '@/services/api';
import type { Task, TaskStatus, Priority } from '@/types';
import CreateTaskModal from '@/components/CreateTaskModal';
import EditTaskModal from '@/components/EditTaskModal';
import TaskCard from '@/components/TaskCard';

export default function TasksPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [featureFilter, setFeatureFilter] = useState<string>('all');
  const [groupByFeature, setGroupByFeature] = useState(false);

  // Fetch project details
  const { data: projectData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.getById(projectId!),
    enabled: !!projectId,
  });

  const project = projectData?.data.data;

  // Fetch tasks
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', projectId, statusFilter, priorityFilter, featureFilter],
    queryFn: () => tasksApi.getByProject(projectId!, {
      status: statusFilter !== 'all' ? statusFilter : undefined,
      priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      featureId: featureFilter !== 'all' ? featureFilter : undefined,
    }),
    enabled: !!projectId,
  });

  const tasks = tasksData?.data.data || [];

  // Fetch features for filter dropdown
  const { data: featuresData } = useQuery({
    queryKey: ['features', projectId],
    queryFn: () => featuresApi.getByProject(projectId!),
    enabled: !!projectId,
  });

  const features = featuresData?.data.data || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['features', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Task deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete task');
    },
  });

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const handleDelete = (task: Task) => {
    deleteMutation.mutate(task._id);
  };

  // Calculate statistics
  const stats = {
    total: tasks.length,
    todo: tasks.filter((t: Task) => t.status === 'Todo').length,
    inProgress: tasks.filter((t: Task) => t.status === 'In Progress').length,
    review: tasks.filter((t: Task) => t.status === 'Review').length,
    done: tasks.filter((t: Task) => t.status === 'Done').length,
  };

  // Group tasks by feature if enabled
  const groupedTasks = groupByFeature
    ? tasks.reduce((acc: any, task: Task) => {
        const key = task.featureId || 'no-feature';
        if (!acc[key]) acc[key] = [];
        acc[key].push(task);
        return acc;
      }, {})
    : { all: tasks };

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
            <p className="text-gray-600 mt-1">Manage and track individual tasks</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition"
          >
            <Plus className="w-5 h-5" />
            New Task
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Total Tasks</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Todo</p>
            <p className="text-2xl font-bold text-gray-600">{stats.todo}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">In Progress</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Review</p>
            <p className="text-2xl font-bold text-purple-600">{stats.review}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Done</p>
            <p className="text-2xl font-bold text-green-600">{stats.done}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filters:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Todo">Todo</option>
            <option value="In Progress">In Progress</option>
            <option value="Review">Review</option>
            <option value="Done">Done</option>
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

          <select
            value={featureFilter}
            onChange={(e) => setFeatureFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="all">All Features</option>
            {features.map((feature: any) => (
              <option key={feature._id} value={feature._id}>
                {feature.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={groupByFeature}
              onChange={(e) => setGroupByFeature(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span>Group by Feature</span>
          </label>

          {(statusFilter !== 'all' || priorityFilter !== 'all' || featureFilter !== 'all') && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setPriorityFilter('all');
                setFeatureFilter('all');
              }}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Tasks Display */}
      {tasks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <ListTodo className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No tasks yet</h3>
          <p className="text-gray-600 mb-6">
            Get started by creating tasks to track your project progress
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition"
          >
            <Plus className="w-5 h-5" />
            Add Your First Task
          </button>
        </div>
      ) : groupByFeature ? (
        // Grouped View
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([key, groupTasks]: [string, any]) => {
            const feature = key === 'no-feature' 
              ? null 
              : features.find((f: any) => f._id === key);
            
            return (
              <div key={key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {feature ? feature.name : 'Unassigned Tasks'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {groupTasks.length} task{groupTasks.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupTasks.map((task: Task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      projectId={projectId!}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task: Task) => (
            <TaskCard
              key={task._id}
              task={task}
              onEdit={handleEdit}
              onDelete={handleDelete}
              projectId={projectId!}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        projectId={projectId!}
      />

      <EditTaskModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        projectId={projectId!}
      />
    </div>
  );
}