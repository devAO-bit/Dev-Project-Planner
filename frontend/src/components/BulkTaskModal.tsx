import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/services/api";
import { toast } from "sonner";
import type { Task } from "../types";
import AiTaskModal from "./AiTaskModal";

interface BulkTaskModalProps {
  featureId: string;
  onClose: () => void;
  initialTasks?: {
    title: string;
    priority: "Low" | "Medium" | "High";
  }[];
}

export default function BulkTaskModal({
  featureId,
  onClose,
  initialTasks,
}: BulkTaskModalProps) {
  const [tasksText, setTasksText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const queryClient = useQueryClient();

  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiTasks, setAiTasks] = useState<
    { title: string; priority: "Low" | "Medium" | "High" }[]
  >([]);

  useEffect(() => {
    if (initialTasks?.length) {
      const formatted = initialTasks
        .map((t) => `${t.title} | ${t.priority}`)
        .join("\n");

      setTasksText(formatted);
    }
  }, [initialTasks]);

  const { mutate, isPending, error } = useMutation<
    { success: boolean; createdCount: number; data: Task[] },
    Error,
    {
      featureId: string;
      tasks: {
        title: string;
        priority?: "Low" | "Medium" | "High";
        dueDate?: string;
      }[];
    }
  >({
    mutationFn: tasksApi.bulkCreate,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["features"] });
      queryClient.invalidateQueries({ queryKey: ["projectStats"] });

      toast.success(`${response.createdCount} tasks created successfully 🎉`);

      setTasksText("");
      setDueDate("");
      onClose();
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parsedTasks = tasksText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());

      const title = parts[0];

      let priority: "Low" | "Medium" | "High" = "Medium";
      let lineDueDate: string | undefined;

      if (parts[1]) {
        const normalized = parts[1].toLowerCase();
        if (["low", "medium", "high"].includes(normalized)) {
          priority = (normalized.charAt(0).toUpperCase() +
            normalized.slice(1)) as "Low" | "Medium" | "High";
        }
      }

      if (parts[2]) {
        lineDueDate = parts[2];
      }

      return {
        raw: line,
        title,
        priority,
        dueDate: lineDueDate || dueDate || undefined,
        isValid: !!title,
      };
    });

  const hasInvalidLines = parsedTasks.some((t) => !t.isValid);
  const exceedsLimit = parsedTasks.length > 100;

  const handleSubmit = () => {
    if (!parsedTasks.length || hasInvalidLines || exceedsLimit) return;

    mutate({
      featureId,
      tasks: parsedTasks.map((task) => ({
        title: task.title,
        priority: task.priority,
        dueDate: task.dueDate,
      })),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[520px] rounded-xl shadow-xl p-6">
        <h2 className="text-lg font-semibold mb-4">📦 Bulk Add Tasks</h2>
        <textarea
          value={tasksText}
          onChange={(e) => setTasksText(e.target.value)}
          placeholder="Task title | priority | dueDate"
          rows={8}
          className="w-full border rounded-md p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isPending}
        />
        {parsedTasks.length > 0 && (
          <div className="mb-4 border rounded-md p-3 bg-gray-50 max-h-40 overflow-y-auto">
            <p className="text-sm font-medium mb-2">
              {parsedTasks.length} task
              {parsedTasks.length > 1 ? "s" : ""} will be created:
            </p>

            <ul className="space-y-1 text-sm">
              {parsedTasks.slice(0, 5).map((task, index) => (
                <li key={index} className="flex justify-between">
                  <span>{task.title}</span>
                  <span className="text-gray-500 text-xs">{task.priority}</span>
                </li>
              ))}

              {parsedTasks.length > 5 && (
                <li className="text-xs text-gray-500">
                  + {parsedTasks.length - 5} more...
                </li>
              )}
            </ul>
          </div>
        )}
        {hasInvalidLines && (
          <p className="text-red-500 text-sm mb-2">Some lines are invalid.</p>
        )}
        {exceedsLimit && (
          <p className="text-red-500 text-sm mb-2">
            Maximum 100 tasks allowed.
          </p>
        )}
        {error && (
          <p className="text-red-500 text-sm mb-3">
            Something went wrong. Please try again.
          </p>
        )}
        <div className="mb-4">
          {" "}
          <label className="text-sm text-gray-600 block mb-1">
            {" "}
            Due Date (optional){" "}
          </label>{" "}
          <input
            type="date"
            value={dueDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />{" "}
          {dueDate &&
            new Date(dueDate) < new Date(new Date().toDateString()) && (
              <p className="text-red-500 text-sm mt-1">
                {" "}
                Due date cannot be in the past.{" "}
              </p>
            )}{" "}
        </div>{" "}
        {error && (
          <p className="text-red-500 text-sm mb-3">
            {" "}
            Something went wrong. Please try again.{" "}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setIsAiOpen(true)}
            className="px-3 py-2 bg-purple-600 text-white rounded-md"
          >
            🤖 AI Generate
          </button>

          {isAiOpen && (
            <AiTaskModal
              featureId={featureId}
              onClose={() => setIsAiOpen(false)}
              onTasksGenerated={(tasks) => {
                const formatted = tasks
                  .map((task) => `${task.title} | ${task.priority}`)
                  .join("\n");

                setTasksText(formatted);
                setIsAiOpen(false); // close AI modal
              }}
            />
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={isPending || hasInvalidLines || exceedsLimit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
          >
            {isPending ? "Creating..." : "Create Tasks"}
          </button>
        </div>
      </div>
    </div>
  );
}
