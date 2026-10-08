import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import type { ApiError } from '@/types';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

const inputClass =
  'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition';

export default function SettingsPage() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: Pick<PasswordFormData, 'currentPassword' | 'newPassword'>) =>
      authApi.updatePassword(data),
    onSuccess: (response) => {
      // Replace the stored JWT with the new one; the old one is now invalid
      const { user } = useAuthStore.getState();
      if (user) {
        useAuthStore.getState().setAuth(user, response.data.data.token);
      }
      reset();
      toast.success('Password updated. Other sessions have been signed out.');
    },
    onError: (error: ApiError & { status?: number }) => {
      // 401 (dead session) is handled by the global API-client handler.
      if (error.status === 401) return;

      if (error.status === 400) {
        if (error.errors?.length) {
          // Validation errors: map onto the form fields where possible
          let mapped = false;
          for (const { field, message } of error.errors) {
            if (field === 'currentPassword' || field === 'newPassword') {
              setError(field, { message });
              mapped = true;
            }
          }
          if (mapped) return;
        } else {
          // 400 without field errors: current password is incorrect
          setError('currentPassword', { message: error.message });
          return;
        }
      }

      toast.error(error.message || 'Could not update password. Please try again.');
    },
  });

  const onSubmit = ({ currentPassword, newPassword }: PasswordFormData) => {
    passwordMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Account</h1>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Security</h2>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Changing your password will sign out other sessions.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Current password
            </label>
            <input
              {...register('currentPassword')}
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              className={inputClass}
            />
            {errors.currentPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
              New password
            </label>
            <input
              {...register('newPassword')}
              id="newPassword"
              type="password"
              autoComplete="new-password"
              className={inputClass}
            />
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm new password
            </label>
            <input
              {...register('confirmPassword')}
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className={inputClass}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={passwordMutation.isPending}
            className="flex items-center justify-center gap-2 bg-primary-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {passwordMutation.isPending ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Updating…
              </>
            ) : (
              'Update password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
