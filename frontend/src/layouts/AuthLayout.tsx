import { Code2 } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="relative inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4
                      bg-gradient-to-br from-primary-500 to-primary-700
                      shadow-lg shadow-primary-500/30
                      animate-float transition-transform duration-300
                      hover:scale-105"
          >
            <Code2 className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            Dev Project Planner
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Plan, track, and ship your projects
          </p>
        </div>

        <div
          className="bg-white/80 backdrop-blur-sm rounded-2xl
                    shadow-lg shadow-gray-200/60
                    border border-gray-100 p-8"
        >
          {children}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          © 2026 Dev Project Planner
        </p>
      </div>
    </div>
  );
}
