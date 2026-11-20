'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, ApiClientError } from '@/lib/api-client';
import type { PageNode, WorkspaceSummary } from '@/lib/types';

interface WorkspaceContextValue {
  workspaces: WorkspaceSummary[];
  currentWorkspace: WorkspaceSummary | null;
  tree: PageNode[];
  loading: boolean;
  refreshWorkspaces: () => Promise<void>;
  refreshTree: () => Promise<void>;
  createWorkspace: (name: string) => Promise<WorkspaceSummary>;
  createPage: (opts?: { title?: string; parentId?: string | null }) => Promise<PageNode | null>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}

function workspaceIdFromPath(pathname: string): string | null {
  const m = /^\/w\/([^/]+)/.exec(pathname);
  return m ? m[1]! : null;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentWorkspaceId = workspaceIdFromPath(pathname);

  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [tree, setTree] = useState<PageNode[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshWorkspaces = useCallback(async () => {
    try {
      const data = await api.get<{ workspaces: WorkspaceSummary[] }>('/api/workspaces');
      setWorkspaces(data.workspaces);
    } catch (err) {
      console.error('failed to load workspaces', err);
    }
  }, []);

  const refreshTree = useCallback(async () => {
    if (!currentWorkspaceId) {
      setTree([]);
      return;
    }
    try {
      const data = await api.get<{ pages: PageNode[] }>(`/api/workspaces/${currentWorkspaceId}/tree`);
      setTree(data.pages);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 403) {
        router.push('/');
      }
      console.error('failed to load tree', err);
    }
  }, [currentWorkspaceId, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refreshWorkspaces();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshWorkspaces]);

  useEffect(() => {
    refreshTree();
  }, [refreshTree]);

  // Refresh tree when other clients mutate pages (fired by SSE + WS in later phases).
  useEffect(() => {
    const onPagesChanged = () => {
      refreshTree();
    };
    window.addEventListener('nexvia:pages-changed', onPagesChanged);
    return () => window.removeEventListener('nexvia:pages-changed', onPagesChanged);
  }, [refreshTree]);

  const createWorkspace = useCallback(
    async (name: string) => {
      const { workspace } = await api.post<{ workspace: WorkspaceSummary }>('/api/workspaces', {
        name,
      });
      await refreshWorkspaces();
      return workspace;
    },
    [refreshWorkspaces],
  );

  const createPage = useCallback(
    async (opts?: { title?: string; parentId?: string | null }) => {
      if (!currentWorkspaceId) return null;
      const { page } = await api.post<{ page: PageNode }>(
        `/api/workspaces/${currentWorkspaceId}/pages`,
        opts ?? {},
      );
      await refreshTree();
      return page;
    },
    [currentWorkspaceId, refreshTree],
  );

  const currentWorkspace =
    workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0] ?? null;

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        tree,
        loading,
        refreshWorkspaces,
        refreshTree,
        createWorkspace,
        createPage,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export type { PageNode, WorkspaceSummary };
