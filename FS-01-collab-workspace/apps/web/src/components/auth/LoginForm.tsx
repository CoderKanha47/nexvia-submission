'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

export function LoginForm({ hasGithub }: { hasGithub: boolean }) {
  const router = useRouter();
  const search = useSearchParams();
  const toast = useToast();
  const [email, setEmail] = useState('alice@demo.dev');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = search.get('callbackUrl') ?? '/';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (!res || res.error) {
      setError('Invalid email or password.');
      toast({ title: 'Sign in failed', description: 'Check your credentials and try again.', variant: 'error' });
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">Welcome back</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to continue to your workspace.</p>
      </div>
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={error ?? undefined}
      />
      <Button type="submit" loading={loading} className="w-full">
        Sign in
      </Button>
      {hasGithub ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => void signIn('github', { callbackUrl })}
        >
          Continue with GitHub
        </Button>
      ) : null}
      <p className="text-center text-sm text-muted-foreground">
        No account?{' '}
        <Link href="/register" className="font-medium text-accent hover:underline">
          Create one
        </Link>
      </p>
      <p className="rounded-md bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
        Demo: alice@demo.dev · bob@demo.dev · carol@demo.dev — password{' '}
        <code className="font-mono">password123</code>
      </p>
    </form>
  );
}
