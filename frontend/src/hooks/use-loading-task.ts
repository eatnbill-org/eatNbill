import { useCallback } from "react";
import { useLoadingStore, type LoadingScope } from "@/stores/ui/loading.store";

interface LoadingTaskOptions {
  key: string;
  scope?: LoadingScope;
}

export function useLoadingTask({ key, scope = "component" }: LoadingTaskOptions) {
  const withLoading = useLoadingStore((state) => state.withLoading);
  const isLoading = useLoadingStore((state) => state.isLoading(key, scope));

  const run = useCallback(
    async <T>(task: () => Promise<T>) => {
      return withLoading(task, { key, scope });
    },
    [key, scope, withLoading]
  );

  return { run, isLoading };
}
