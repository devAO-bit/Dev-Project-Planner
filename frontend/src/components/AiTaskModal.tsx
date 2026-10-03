import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { tasksApi } from "@/services/api";
import { toast } from "sonner";

interface AiTaskModalProps {
  featureId: string;
  onClose: () => void;
  onTasksGenerated: (
    tasks: {
      title: string;
      priority: "Low" | "Medium" | "High";
    }[],
  ) => void;
}

export default function AiTaskModal({
  onClose,
  onTasksGenerated,
}: AiTaskModalProps) {
  const [goal, setGoal] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: tasksApi.aiBreakdown,
    onSuccess: (response) => {
      onTasksGenerated(response.tasks);
      toast.success("AI tasks generated successfully 🚀");
      onClose();
    },
    onError: () => {
      toast.error("AI generation failed");
    },
  });

  const handleGenerate = () => {
    if (!goal.trim()) return;
    mutate(goal);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[500px] rounded-xl shadow-xl p-6">
        <h2 className="text-lg font-semibold mb-4">
          🤖 Generate Tasks with AI
        </h2>

        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          disabled={isPending}
          placeholder="Describe what you want to build..."
          rows={5}
          className="w-full border rounded-md p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {isPending && (
          <div className="mb-4 space-y-2 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
            <div className="h-4 bg-gray-200 rounded w-4/5" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-md">
            Cancel
          </button>

          <button
            onClick={handleGenerate}
            disabled={isPending}
            className="px-4 py-2 bg-purple-600 text-white rounded-md disabled:opacity-60"
          >
            {isPending ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>
    </div>
  );
}
