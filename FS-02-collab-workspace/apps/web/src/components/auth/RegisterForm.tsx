'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, ApiClientError } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';

export function RegisterForm() {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/api/auth/register', { name, email, password });
      const res = await signIn('credentials', { email, password, redirect: false });
      if (!res || res.error) {
        setError('Account created but sign in failed. Please log in manually.');
        router.push('/login');
        return;
      }
      toast({ title: 'Welcome to Nexvia!', variant: 'success' });
      router.push('/');
      router.refresh();
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Registration failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">Create your account</h2>
        <p className="mt-1 text-sm text-muted-foreground">Start collaborating in seconds.</p>
      </div>
      <Input
        label="Name"
        name="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ada Lovelace"
      />
      <Input
        label="Email"
        name="email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        label="Password"
        name="password"
        type="password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={error ?? undefined}
        placeholder="At least 8 characters"
      />
      <Button type="submit" loading={loading} className="w-full">
        Create account
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
