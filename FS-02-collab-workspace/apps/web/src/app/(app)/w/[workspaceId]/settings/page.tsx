'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Link2, Mail, Trash2, UserMinus } from 'lucide-react';
import { api, ApiClientError } from '@/lib/api-client';
import type { InviteDTO, MemberDTO } from '@/lib/types';
import { useWorkspace } from '@/components/shell/workspace-context';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Menu } from '@/components/ui/menu';
import { useToast } from '@/components/ui/toast';

const ROLE_OPTIONS = ['OWNER', 'EDIT', 'COMMENT', 'VIEW'] as const;

export default function SettingsPage({ params }: { params: { workspaceId: string } }) {
  const router = useRouter();
  const toast = useToast();
  const { refreshWorkspaces } = useWorkspace();
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [invites, setInvites] = useState<InviteDTO[]>([]);
  const [name, setName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'EDIT' | 'COMMENT' | 'VIEW'>('EDIT');
  const [busy, setBusy] = useState(false);
  const [myRole, setMyRole] = useState<string>('VIEW');

  const load = useCallback(async () => {
    try {
      const [ws, inv] = await Promise.all([
        api.get<{ workspace: { name: string; role: string; members: MemberDTO[] } }>(
          `/api/workspaces/${params.workspaceId}`,
        ),
        api.get<{ invites: InviteDTO[] }>(`/api/workspaces/${params.workspaceId}/invites`),
      ]);
      setName(ws.workspace.name);
      setMembers(ws.workspace.members);
      setMyRole(ws.workspace.role);
      setInvites(inv.invites);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 403) router.push('/');
    }
  }, [params.workspaceId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const isOwner = myRole === 'OWNER';

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Workspace settings</h1>

      <section className="mt-8 rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">General</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input label="Workspace name" value={name} onChange={(e) => setName(e.target.value)} disabled={!isOwner} />
          </div>
          <Button
            disabled={!isOwner || name.trim().length === 0}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api.patch(`/api/workspaces/${params.workspaceId}`, { name: name.trim() });
                await refreshWorkspaces();
                toast({ title: 'Workspace renamed', variant: 'success' });
              } catch {
                toast({ title: 'Rename failed', variant: 'error' });
              } finally {
                setBusy(false);
              }
            }}
          >
            Save
          </Button>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">Members</h2>
        <ul className="mt-4 divide-y divide-border">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 py-3">
              <Avatar name={m.name} email={m.email} image={m.image} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{m.name ?? m.email}</p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
              <RoleMenu
                value={m.role}
                disabled={!isOwner}
                onChange={async (role) => {
                  try {
                    await api.patch(`/api/workspaces/${params.workspaceId}/members/${m.userId}`, { role });
                    await load();
                    toast({ title: 'Role updated', variant: 'success' });
                  } catch (err) {
                    toast({
                      title: 'Could not update role',
                      description: err instanceof ApiClientError ? err.message : undefined,
                      variant: 'error',
                    });
                  }
                }}
              />
              {isOwner ? (
                <button
                  type="button"
                  aria-label={`Remove ${m.name ?? m.email}`}
                  onClick={async () => {
                    try {
                      await api.delete(`/api/workspaces/${params.workspaceId}/members/${m.userId}`);
                      await load();
                    } catch (err) {
                      toast({
                        title: 'Could not remove member',
                        description: err instanceof ApiClientError ? err.message : undefined,
                        variant: 'error',
                      });
                    }
                  }}
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        {isOwner ? (
          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!inviteEmail.trim()) return;
              setBusy(true);
              try {
                const res = await api.post<{ added: boolean; acceptUrl?: string }>(
                  `/api/workspaces/${params.workspaceId}/members`,
                  { email: inviteEmail.trim(), role: inviteRole },
                );
                if (res.added) toast({ title: 'Member added', variant: 'success' });
                else {
                  await navigator.clipboard.writeText(res.acceptUrl ?? '');
                  toast({ title: 'Invite link copied', description: res.acceptUrl, variant: 'success' });
                }
                setInviteEmail('');
                await load();
              } catch (err) {
                toast({
                  title: 'Invite failed',
                  description: err instanceof ApiClientError ? err.message : undefined,
                  variant: 'error',
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="flex-1">
              <Input
                label="Invite by email"
                type="email"
                placeholder="teammate@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <RoleMenu
              value={inviteRole}
              onChange={(r) => setInviteRole(r as 'EDIT' | 'COMMENT' | 'VIEW')}
              options={['EDIT', 'COMMENT', 'VIEW']}
            />
            <Button type="submit" loading={busy} className="sm:self-end">
              <Mail className="h-4 w-4" />
              Invite
            </Button>
          </form>
        ) : null}
      </section>

      <section className="mt-6 rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">Pending invites</h2>
        {invites.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No pending invites.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {invites.map((i) => (
              <li key={i.token} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{i.email ?? 'Anyone with the link'}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.role} · expires {i.expiresAt ? new Date(i.expiresAt).toLocaleDateString() : 'never'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(i.acceptUrl);
                    toast({ title: 'Invite link copied', variant: 'success' });
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy link
                </Button>
                {isOwner ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger"
                    onClick={async () => {
                      await api.delete(`/api/workspaces/${params.workspaceId}/invites?token=${i.token}`);
                      await load();
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {isOwner ? (
        <section className="mt-6 rounded-xl border border-danger/30 bg-danger/5 p-5">
          <h2 className="text-sm font-semibold text-danger">Danger zone</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Deleting a workspace removes all of its pages, comments and versions.
          </p>
          <Button
            variant="danger"
            className="mt-3"
            onClick={async () => {
              if (!window.confirm('Delete this workspace permanently? This cannot be undone.')) return;
              try {
                await api.delete(`/api/workspaces/${params.workspaceId}`);
                await refreshWorkspaces();
                router.push('/');
                toast({ title: 'Workspace deleted' });
              } catch (err) {
                toast({
                  title: 'Could not delete workspace',
                  description: err instanceof ApiClientError ? err.message : undefined,
                  variant: 'error',
                });
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete workspace
          </Button>
        </section>
      ) : null}
    </div>
  );
}

function RoleMenu({
  value,
  onChange,
  disabled,
  options = ROLE_OPTIONS,
}: {
  value: string;
  onChange: (role: string) => void;
  disabled?: boolean;
  options?: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative self-end">
      <button
        type="button"
        disabled={disabled}
        aria-label={`Role: ${value}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
      >
        {value}
      </button>
      <Menu
        open={open}
        onClose={() => setOpen(false)}
        items={options.map((r) => ({
          label: r,
          icon: r === value ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5 opacity-0" />,
          onSelect: () => onChange(r),
        }))}
      />
    </div>
  );
}
