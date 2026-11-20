'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronsUpDown,
  FilePlus2,
  Hash,
  Home,
  LogOut,
  PanelLeft,
  Plus,
  Search,
  Settings,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import type { UserDTO } from '@/lib/types';
import { WorkspaceProvider, useWorkspace } from './workspace-context';
import { CommandPalette, OPEN_COMMAND_PALETTE_EVENT } from './CommandPalette';
import { PageTree } from '@/components/sidebar/PageTree';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Menu } from '@/components/ui/menu';
import { useToast } from '@/components/ui/toast';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

function activePageIdFrom(pathname: string): string | null {
  const m = /^\/w\/[^/]+\/p\/([^/]+)/.exec(pathname);
  return m ? m[1]! : null;
}

function SidebarContent({
  user,
  onNavigate,
}: {
  user: UserDTO;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const {
    workspaces,
    currentWorkspace,
    tree,
    loading,
    refreshTree,
    createPage,
    createWorkspace,
  } = useWorkspace();

  const [newWorkspaceOpen, setNewWorkspaceOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trash, setTrash] = useState<{ id: string; title: string; icon: string | null }[]>([]);

  const activePageId = activePageIdFrom(pathname);
  const favorites = useMemo(() => tree.filter((p) => p.favorite), [tree]);

  const handleCreatePage = useCallback(
    async (parentId?: string | null) => {
      try {
        const page = await createPage({ parentId: parentId ?? null });
        if (page) {
          onNavigate();
          router.push(`/w/${currentWorkspace?.id}/p/${page.id}`);
        }
      } catch {
        toast({ title: 'Could not create page', variant: 'error' });
      }
    },
    [createPage, currentWorkspace, onNavigate, router, toast],
  );

  const handleRename = useCallback(
    async (pageId: string, title: string) => {
      try {
        await api.patch(`/api/pages/${pageId}`, { title });
        await refreshTree();
      } catch {
        toast({ title: 'Rename failed', variant: 'error' });
      }
    },
    [refreshTree, toast],
  );

  const handleDuplicate = useCallback(
    async (pageId: string) => {
      try {
        await api.post(`/api/pages/${pageId}/duplicate`);
        await refreshTree();
        toast({ title: 'Page duplicated', variant: 'success' });
      } catch {
        toast({ title: 'Duplicate failed', variant: 'error' });
      }
    },
    [refreshTree, toast],
  );

  const handleDelete = useCallback(
    async (pageId: string) => {
      try {
        await api.delete(`/api/pages/${pageId}`);
        await refreshTree();
        if (activePageId === pageId) router.push(`/w/${currentWorkspace?.id}`);
        toast({ title: 'Page moved to trash', description: 'Restore it from the trash view.' });
      } catch {
        toast({ title: 'Delete failed', variant: 'error' });
      }
    },
    [activePageId, currentWorkspace, refreshTree, router, toast],
  );

  const handleToggleFavorite = useCallback(
    async (pageId: string) => {
      try {
        await api.post(`/api/pages/${pageId}/favorite`);
        await refreshTree();
      } catch {
        toast({ title: 'Could not update favorites', variant: 'error' });
      }
    },
    [refreshTree, toast],
  );

  const handleCopyLink = useCallback(
    (pageId: string) => {
      const url = `${window.location.origin}/w/${currentWorkspace?.id}/p/${pageId}`;
      navigator.clipboard.writeText(url).then(
        () => toast({ title: 'Link copied', variant: 'success' }),
        () => toast({ title: 'Copy failed', variant: 'error' }),
      );
    },
    [currentWorkspace, toast],
  );

  const handleReorder = useCallback(
    async (pageId: string, parentId: string | null, order: number) => {
      try {
        await api.patch(`/api/pages/${pageId}`, { parentId, order });
        await refreshTree();
      } catch {
        toast({ title: 'Reorder failed', variant: 'error' });
        await refreshTree();
      }
    },
    [refreshTree, toast],
  );

  const openTrash = useCallback(async () => {
    if (!currentWorkspace) return;
    setTrashOpen(true);
    try {
      const data = await api.get<{ pages: typeof trash }>(`/api/workspaces/${currentWorkspace.id}/trash`);
      setTrash(data.pages);
    } catch {
      setTrash([]);
    }
  }, [currentWorkspace]);

  return (
    <div className="flex h-full flex-col">
      {/* Workspace switcher */}
      <div className="flex items-center gap-2 px-3 py-3">
        <div className="relative flex-1">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={(e) => {
              const menu = e.currentTarget.parentElement?.querySelector('[data-ws-menu]');
              (menu as HTMLElement | null)?.click?.();
            }}
            aria-label="Switch workspace"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[11px] font-bold text-accent-foreground">
              {(currentWorkspace?.name ?? 'N')[0]?.toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
              {currentWorkspace?.name ?? 'Nexvia'}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
          <WorkspaceMenuAnchored />
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 pb-2">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT))}
          className="flex h-8 flex-1 items-center gap-2 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Search className="h-3.5 w-3.5" />
          Search
          <kbd className="ml-auto rounded border border-border bg-muted px-1 font-mono text-[10px]">
            ⌘K
          </kbd>
        </button>
      </div>

      <nav className="px-2" aria-label="Primary">
        <SidebarLink
          href={`/w/${currentWorkspace?.id ?? ''}`}
          active={pathname === `/w/${currentWorkspace?.id}`}
          icon={<Home className="h-4 w-4" />}
          label="Home"
          onNavigate={onNavigate}
        />
        <button
          type="button"
          onClick={openTrash}
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Trash2 className="h-4 w-4" />
          Trash
        </button>
        <SidebarLink
          href={`/w/${currentWorkspace?.id ?? ''}/settings`}
          active={pathname.includes('/settings')}
          icon={<Settings className="h-4 w-4" />}
          label="Settings"
          onNavigate={onNavigate}
        />
      </nav>

      {favorites.length > 0 ? (
        <div className="mt-4 px-2">
          <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Favorites
          </p>
          {favorites.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onNavigate();
                router.push(`/w/${currentWorkspace?.id}/p/${p.id}`);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span>{p.icon ?? <Hash className="h-3.5 w-3.5" />}</span>
              <span className="truncate">{p.title}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex min-h-0 flex-1 flex-col px-2">
        <div className="flex items-center justify-between px-2 pb-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Pages
          </p>
          <button
            type="button"
            aria-label="New page"
            onClick={() => handleCreatePage(null)}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-2">
          <PageTree
            pages={tree}
            activePageId={activePageId}
            loading={loading}
            onNavigate={(pageId) => {
              onNavigate();
              router.push(`/w/${currentWorkspace?.id}/p/${pageId}`);
            }}
            onCreateChild={(parentId) => handleCreatePage(parentId)}
            onRename={handleRename}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
            onCopyLink={handleCopyLink}
            onReorder={handleReorder}
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 w-full justify-start text-muted-foreground"
          onClick={() => handleCreatePage(null)}
        >
          <FilePlus2 className="h-3.5 w-3.5" />
          New page
        </Button>
      </div>

      <div className="border-t border-border p-2">
        <UserMenu user={user} workspacesCount={workspaces.length} />
      </div>

      <Dialog
        open={newWorkspaceOpen}
        onClose={() => setNewWorkspaceOpen(false)}
        title="Create workspace"
        description="Workspaces keep pages, members and permissions together."
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewWorkspaceOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={creating}
              onClick={async () => {
                if (!workspaceName.trim()) return;
                setCreating(true);
                try {
                  const ws = await createWorkspace(workspaceName.trim());
                  setNewWorkspaceOpen(false);
                  setWorkspaceName('');
                  router.push(`/w/${ws.id}`);
                } catch {
                  toast({ title: 'Could not create workspace', variant: 'error' });
                } finally {
                  setCreating(false);
                }
              }}
            >
              Create
            </Button>
          </>
        }
      >
        <Input
          label="Name"
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          placeholder="Marketing team"
          autoFocus
        />
      </Dialog>

      <Dialog
        open={trashOpen}
        onClose={() => setTrashOpen(false)}
        title="Trash"
        description="Deleted pages stay here until permanently removed."
        maxWidth="max-w-lg"
      >
        {trash.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Trash is empty.</p>
        ) : (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {trash.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                <span className="truncate text-sm text-foreground">
                  {p.icon} {p.title}
                </span>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await api.post(`/api/pages/${p.id}/restore`);
                      await refreshTree();
                      setTrash((prev) => prev.filter((x) => x.id !== p.id));
                      toast({ title: 'Page restored', variant: 'success' });
                    }}
                  >
                    Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger"
                    onClick={async () => {
                      await api.delete(`/api/pages/${p.id}/restore`);
                      setTrash((prev) => prev.filter((x) => x.id !== p.id));
                      toast({ title: 'Page permanently deleted' });
                    }}
                  >
                    Delete forever
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </div>
  );

  function WorkspaceMenuAnchored() {
    return (
      <div className="absolute inset-0">
        <MenuAnchorImpl
          workspaces={workspaces}
          currentId={currentWorkspace?.id ?? null}
          onCreate={() => setNewWorkspaceOpen(true)}
          onSelect={(id) => {
            onNavigate();
            router.push(`/w/${id}`);
          }}
        />
      </div>
    );
  }
}

function MenuAnchorImpl({
  workspaces,
  currentId,
  onSelect,
  onCreate,
}: {
  workspaces: { id: string; name: string }[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [open]);
  return (
    <>
      <button
        type="button"
        data-ws-menu
        aria-label="Open workspace menu"
        aria-expanded={open}
        className="h-full w-full cursor-default opacity-0"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      />
      <Menu
        open={open}
        onClose={() => setOpen(false)}
        items={[
          ...workspaces.map((w) => ({
            label: w.name,
            icon: <span className="text-xs">{w.id === currentId ? '✓' : ''}</span>,
            onSelect: () => onSelect(w.id),
          })),
          {
            label: 'Create workspace',
            icon: <Plus className="h-3.5 w-3.5" />,
            separatorBefore: true,
            onSelect: onCreate,
          },
        ]}
      />
    </>
  );
}

function SidebarLink({
  href,
  active,
  icon,
  label,
  onNavigate,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        active ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function UserMenu({ user, workspacesCount }: { user: UserDTO; workspacesCount: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Avatar name={user.name} email={user.email} image={user.image} size="sm" />
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-sm font-medium text-foreground">
            {user.name ?? 'You'}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">{user.email}</span>
        </span>
      </button>
      <Menu
        open={open}
        onClose={() => setOpen(false)}
        items={[
          { label: `Workspaces: ${workspacesCount}`, icon: <Hash className="h-3.5 w-3.5" />, onSelect: () => undefined, disabled: true },
          {
            label: 'Account settings',
            icon: <UserIcon className="h-3.5 w-3.5" />,
            onSelect: () => window.location.assign('/w'),
          },
          {
            label: 'Sign out',
            icon: <LogOut className="h-3.5 w-3.5" />,
            danger: true,
            separatorBefore: true,
            onSelect: () => void signOut({ callbackUrl: '/login' }),
          },
        ]}
      />
    </div>
  );
}

export function AppShell({ user, children }: { user: UserDTO; children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const onNavigate = useCallback(() => setMobileOpen(false), []);

  return (
    <WorkspaceProvider>
      <CommandPalette />
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-border bg-surface lg:block">
          <SidebarContent user={user} onNavigate={onNavigate}  />
        </aside>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen ? (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/40 lg:hidden"
                onClick={() => setMobileOpen(false)}
                aria-hidden
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.2, ease: [0.21, 0.6, 0.35, 1] }}
                className="fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-surface lg:hidden"
                aria-label="Sidebar"
              >
                <SidebarContent user={user} onNavigate={onNavigate}  />
              </motion.aside>
            </>
          ) : null}
        </AnimatePresence>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface/80 px-3 backdrop-blur">
            <button
              type="button"
              aria-label="Open sidebar"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            <TopBarSlot />
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </WorkspaceProvider>
  );
}

function TopBarSlot() {
  return (
    <div className="flex flex-1 items-center justify-end gap-2">
      {/* Presence + connection status slots are filled in later phases. */}
      <ThemeToggle />
    </div>
  );
}
