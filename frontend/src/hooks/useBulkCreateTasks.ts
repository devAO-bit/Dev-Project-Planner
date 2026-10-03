import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/services/api';

export const useBulkCreateTasks = (featureId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.bulkCreate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', featureId] });
    },
  });
};