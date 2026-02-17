import { create } from 'zustand';

export type LoadingScope = 'global' | 'route' | 'component';

type ScopedKeys = Record<LoadingScope, Set<string>>;

const createScopedKeys = (): ScopedKeys => ({
  global: new Set<string>(),
  route: new Set<string>(),
  component: new Set<string>(),
});

interface LoadingState {
  activeKeysByScope: ScopedKeys;
  count: number;
  globalLoading: boolean;
  routeLoading: boolean;
  componentLoading: boolean;
  startLoading: (key?: string, scope?: LoadingScope) => void;
  stopLoading: (key?: string, scope?: LoadingScope) => void;
  isLoading: (key?: string, scope?: LoadingScope) => boolean;
  isScopeLoading: (scope: LoadingScope) => boolean;
  withLoading: <T>(
    task: () => Promise<T>,
    options?: { key?: string; scope?: LoadingScope }
  ) => Promise<T>;
  clearAll: () => void;
  getActiveKeys: (scope?: LoadingScope) => string[];
}

const DEFAULT_SCOPE: LoadingScope = 'component';
const DEFAULT_KEY = 'app:default';

function getNextFlags(activeKeysByScope: ScopedKeys) {
  return {
    globalLoading: activeKeysByScope.global.size > 0,
    routeLoading: activeKeysByScope.route.size > 0,
    componentLoading: activeKeysByScope.component.size > 0,
  };
}

export const useLoadingStore = create<LoadingState>((set, get) => ({
  activeKeysByScope: createScopedKeys(),
  count: 0,
  globalLoading: false,
  routeLoading: false,
  componentLoading: false,

  startLoading: (key = DEFAULT_KEY, scope = DEFAULT_SCOPE) => {
    set((state) => {
      const next = {
        ...state.activeKeysByScope,
        [scope]: new Set(state.activeKeysByScope[scope]).add(key),
      } as ScopedKeys;

      return {
        activeKeysByScope: next,
        ...getNextFlags(next),
      };
    });
  },

  stopLoading: (key = DEFAULT_KEY, scope = DEFAULT_SCOPE) => {
    set((state) => {
      const scopedSet = new Set(state.activeKeysByScope[scope]);
      scopedSet.delete(key);

      const next = {
        ...state.activeKeysByScope,
        [scope]: scopedSet,
      } as ScopedKeys;

      return {
        activeKeysByScope: next,
        ...getNextFlags(next),
      };
    });
  },

  isLoading: (key?: string, scope: LoadingScope = DEFAULT_SCOPE) => {
    const state = get();

    if (key) {
      return state.activeKeysByScope[scope].has(key);
    }

    return state.globalLoading || state.routeLoading || state.componentLoading || state.count > 0;
  },

  isScopeLoading: (scope: LoadingScope) => {
    const state = get();
    return state.activeKeysByScope[scope].size > 0;
  },

  withLoading: async <T>(
    task: () => Promise<T>,
    options?: { key?: string; scope?: LoadingScope }
  ): Promise<T> => {
    const scope = options?.scope ?? DEFAULT_SCOPE;
    const key = options?.key ?? DEFAULT_KEY;

    get().startLoading(key, scope);
    try {
      return await task();
    } finally {
      get().stopLoading(key, scope);
    }
  },

  clearAll: () => {
    const next = createScopedKeys();
    set({
      activeKeysByScope: next,
      count: 0,
      ...getNextFlags(next),
    });
  },

  getActiveKeys: (scope?: LoadingScope) => {
    const state = get();

    if (scope) {
      return Array.from(state.activeKeysByScope[scope]);
    }

    return [
      ...state.activeKeysByScope.global,
      ...state.activeKeysByScope.route,
      ...state.activeKeysByScope.component,
    ];
  },
}));

export function useIsAnyLoading(): boolean {
  return useLoadingStore((state) => state.globalLoading || state.routeLoading || state.componentLoading || state.count > 0);
}

export function useIsLoading(key: string, scope: LoadingScope = 'component'): boolean {
  return useLoadingStore((state) => state.activeKeysByScope[scope].has(key));
}

export function useScopeLoading(scope: LoadingScope): boolean {
  return useLoadingStore((state) => state.isScopeLoading(scope));
}
