import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, formatStr = "MMM dd, yyyy") {
  return format(new Date(date), formatStr);
}

export function formatRelativeDate(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    // Project statuses
    Planning: "bg-blue-100 text-blue-700",
    "In Progress": "bg-yellow-100 text-yellow-700",
    "On Hold": "bg-gray-100 text-gray-700",
    Completed: "bg-green-100 text-green-700",
    Cancelled: "bg-red-100 text-red-700",

    // Feature statuses
    Planned: "bg-blue-100 text-blue-700",
    Testing: "bg-purple-100 text-purple-700",
    Blocked: "bg-red-100 text-red-700",

    // Task statuses
    Todo: "bg-gray-100 text-gray-700",
    Review: "bg-purple-100 text-purple-700",
    Done: "bg-green-100 text-green-700",
  };

  return statusColors[status] || "bg-gray-100 text-gray-700";
}

export function getPriorityColor(priority: string): string {
  const priorityColors: Record<string, string> = {
    Critical: "bg-red-100 text-red-700",
    High: "bg-orange-100 text-orange-700",
    Medium: "bg-yellow-100 text-yellow-700",
    Low: "bg-green-100 text-green-700",
  };

  return priorityColors[priority] || "bg-gray-100 text-gray-700";
}

export function getFeatureTypeColor(type: string): string {
  const typeColors: Record<string, string> = {
    core: "bg-purple-100 text-purple-700",
    "nice-to-have": "bg-blue-100 text-blue-700",
    stretch: "bg-gray-100 text-gray-700",
  };

  return typeColors[type] || "bg-gray-100 text-gray-700";
}

export function calculateDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
