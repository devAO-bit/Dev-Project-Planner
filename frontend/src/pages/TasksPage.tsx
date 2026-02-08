// src/pages/TasksPage.tsx
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Filter,
  ListTodo,
  CheckCircle2,
  Clock,
  AlertCircle,
  Target,
  LayoutGrid,
  Layers,
  Rows
} from 'lucide-react';
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
  const [featureFilter, setFeatureFilter] = useState('all');
  const [view, setView] = useState<'grid' | 'grouped'>('grid');

  /* ---------------- Queries ---------------- */

  const { data: projectData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.getById(projectId!),
    enabled: !!projectId,
  });

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', projectId, statusFilter, priorityFilter, featureFilter],
    queryFn: () =>
      tasksApi.getByProject(projectId!, {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        featureId: featureFilter !== 'all' ? featureFilter : undefined,
      }),
    enabled: !!projectId,
  });

  const { data: featuresData } = useQuery({
    queryKey: ['features', projectId],
    queryFn: () => featuresApi.getByProject(projectId!),
    enabled: !!projectId,
  });

  const tasks = tasksData?.data.data ?? [];
  const features = featuresData?.data.data ?? [];
  const project = projectData?.data.data;

  /* ---------------- Mutations ---------------- */

  const deleteMutation = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      toast.success('Task deleted');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete task'),
  });

  /* ---------------- Derived ---------------- */

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'Todo').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    review: tasks.filter(t => t.status === 'Review').length,
    done: tasks.filter(t => t.status === 'Done').length,
  };

  const groupedTasks = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    const key = task.featureId || 'unassigned';
    acc[key] = acc[key] || [];
    acc[key].push(task);
    return acc;
  }, {});

  /* ---------------- Handlers ---------------- */

  const quickFilter = (status: TaskStatus) => {
    setStatusFilter(status);
    setPriorityFilter('all');
    setFeatureFilter('all');
  };

  /* ---------------- Loading ---------------- */

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            to={`/projects/${projectId}`}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>

          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700"
            >
              <Plus className="inline w-4 h-4 mr-1" />
              New Task
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{project?.name}</h1>
          <p className="text-gray-600 mt-1">Track and manage tasks efficiently</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Stat label="Total" value={stats.total} icon={ListTodo} />
          <Stat label="Todo" value={stats.todo} icon={AlertCircle} onClick={() => quickFilter('Todo')} />
          <Stat label="In Progress" value={stats.inProgress} icon={Clock} onClick={() => quickFilter('In Progress')} />
          <Stat label="Review" value={stats.review} icon={Target} onClick={() => quickFilter('Review')} />
          <Stat label="Done" value={stats.done} icon={CheckCircle2} onClick={() => quickFilter('Done')} />
        </div>

        {/* Filters + View */}
        <div className="bg-white rounded-xl border p-5 flex flex-wrap gap-4 items-end">
          <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter}>
            <option value="all">All</option>
            <option value="Todo">Todo</option>
            <option value="In Progress">In Progress</option>
            <option value="Review">Review</option>
            <option value="Done">Done</option>
          </FilterSelect>

          <FilterSelect label="Priority" value={priorityFilter} onChange={setPriorityFilter}>
            <option value="all">All</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </FilterSelect>

          <FilterSelect label="Feature" value={featureFilter} onChange={setFeatureFilter}>
            <option value="all">All</option>
            {features.map(f => (
              <option key={f._id} value={f._id}>{f.name}</option>
            ))}
          </FilterSelect>

          {/* View Toggle */}
          <div className="ml-auto flex rounded-lg border overflow-hidden">
            <ViewButton active={view === 'grid'} onClick={() => setView('grid')}>
              <LayoutGrid className="w-4 h-4" />
            </ViewButton>
            <ViewButton active={view === 'grouped'} onClick={() => setView('grouped')}>
              <Rows className="w-4 h-4" />
            </ViewButton>
          </div>
        </div>

        {/* Tasks */}
        {tasks.length === 0 ? (
          <EmptyState onCreate={() => setIsCreateModalOpen(true)} />
        ) : view === 'grid' ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map(task => (
              <TaskCard
                key={task._id}
                task={task}
                onEdit={setSelectedTask}
                onDelete={() => deleteMutation.mutate(task._id)}
                projectId={projectId!}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTasks).map(([key, list]) => {
              const feature = features.find(f => f._id === key);
              return (
                <section key={key} className="bg-white rounded-xl border">
                  <header className="px-6 py-4 border-b font-semibold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    {feature?.name ?? 'Unassigned'}
                    <span className="ml-auto text-sm text-gray-500">{list.length}</span>
                  </header>
                  <div className="p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {list.map(task => (
                      <TaskCard
                        key={task._id}
                        task={task}
                        onEdit={setSelectedTask}
                        onDelete={() => deleteMutation.mutate(task._id)}
                        projectId={projectId!}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        projectId={projectId!}
      />

      <EditTaskModal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        projectId={projectId!}
      />
    </div>
  );
}

/* ---------------- Small Components ---------------- */

function Stat({ label, value, icon: Icon, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="bg-white border rounded-xl p-4 text-left hover:shadow transition"
    >
      <Icon className="w-5 h-5 text-blue-600 mb-2" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </button>
  );
}

function FilterSelect({ label, value, onChange, children }: any) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="px-3 py-2 rounded-lg border bg-gray-50 focus:bg-white"
      >
        {children}
      </select>
    </div>
  );
}

function ViewButton({ active, children, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 ${active ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
    >
      {children}
    </button>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="bg-white border rounded-xl p-12 text-center">
      <ListTodo className="w-12 h-12 mx-auto text-blue-600 mb-4" />
      <h3 className="text-xl font-semibold">No tasks found</h3>
      <p className="text-gray-600 mt-2 mb-6">Try adjusting filters or create a new task</p>
      <button
        onClick={onCreate}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
      >
        Create Task
      </button>
    </div>
  );
}
