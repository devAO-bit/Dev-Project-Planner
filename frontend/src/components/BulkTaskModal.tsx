import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/services/api";

interface BulkTaskModalProps {
  featureId: string;
  onClose: () => void;
}

export default function BulkTaskModal({
  featureId,
  onClose,
}: BulkTaskModalProps) {
  const [tasksText, setTasksText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: tasksApi.bulkCreate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", featureId] });

      queryClient.invalidateQueries({ queryKey: ['features'] });

       queryClient.invalidateQueries({ queryKey: ['projectStats'] });

      setTasksText("");
      setDueDate("");
      onClose();
    },
  });

  const handleSubmit = () => {
    if (!tasksText.trim()) return;

    mutate({
      featureId,
      tasksText,
      dueDate: dueDate || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[520px] rounded-xl shadow-xl p-6">
        <h2 className="text-lg font-semibold mb-4">📦 Bulk Add Tasks</h2>

        <textarea
          value={tasksText}
          onChange={(e) => setTasksText(e.target.value)}
          placeholder="Enter one task per line..."
          rows={8}
          className="w-full border rounded-md p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="mb-4">
          <label className="text-sm text-gray-600 block mb-1">
            Due Date (optional)
          </label>
          <input
            type="date"
            value={dueDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {dueDate &&
            new Date(dueDate) < new Date(new Date().toDateString()) && (
              <p className="text-red-500 text-sm mt-1">
                Due date cannot be in the past.
              </p>
            )}
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-3">
            Something went wrong. Please try again.
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
          >
            {isPending ? "Creating..." : "Create Tasks"}
          </button>
        </div>
      </div>
    </div>
  );
}
