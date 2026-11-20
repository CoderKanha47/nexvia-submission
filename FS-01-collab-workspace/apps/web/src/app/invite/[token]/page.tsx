'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { api, ApiClientError } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';

interface InviteInfo {
  token: string;
  role: string;
  workspace: { id: string; name: string; slug: string };
}

export default function InvitePage({ params }: { params: { token: string } }) {
  const token = params.token;
  const router = useRouter();
  const toast = useToast();
  const { status } = useSession();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') return;
    (async () => {
      try {
        const data = await api.get<{ invite: InviteInfo }>(`/api/invites/${token}`);
        setInvite(data.invite);
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : 'Invite not found');
      }
    })();
  }, [status, token]);

  if (status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Checking invite…</div>;
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center"
        >
          <h1 className="text-base font-semibold text-foreground">You&apos;ve been invited</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in or create an account to join this workspace.</p>
          <div className="mt-5 flex flex-col gap-2">
            <Button onClick={() => signIn(undefined, { callbackUrl: `/invite/${token}` })}>
              Sign in to accept
            </Button>
            <Button variant="outline" onClick={() => router.push('/register')}>
              Create an account
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center"
      >
        {error ? (
          <>
            <h1 className="text-base font-semibold text-foreground">Invite unavailable</h1>
            <p className="mt-2 text-sm text-danger">{error}</p>
            <Button variant="outline" className="mt-5" onClick={() => router.push('/')}>
              Go home
            </Button>
          </>
        ) : invite ? (
          <>
            <div className="flex justify-center">
              <Avatar name={invite.workspace.name} seed={invite.workspace.slug} size="lg" />
            </div>
            <h1 className="mt-3 text-base font-semibold text-foreground">
              Join {invite.workspace.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              You&apos;ll join as <span className="font-semibold uppercase">{invite.role}</span>.
            </p>
            <Button
              className="mt-5 w-full"
              loading={joining}
              onClick={async () => {
                setJoining(true);
                try {
                  const res = await api.post<{ workspace: { id: string } }>(`/api/invites/${token}`);
                  toast({ title: 'Welcome aboard!', variant: 'success' });
                  router.push(`/w/${res.workspace.id}`);
                } catch (err) {
                  toast({
                    title: 'Could not accept invite',
                    description: err instanceof ApiClientError ? err.message : undefined,
                    variant: 'error',
                  });
                } finally {
                  setJoining(false);
                }
              }}
            >
              Accept invite
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Loading invite…</p>
        )}
      </motion.div>
    </div>
  );
}
