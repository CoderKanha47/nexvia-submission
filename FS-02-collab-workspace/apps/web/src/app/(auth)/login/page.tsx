import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { LoginForm } from '@/components/auth/LoginForm';

export default async function LoginPage() {
  // Already signed in (e.g. stale /login tab or a post-register push): go to
  // the workspace dashboard instead of showing the form again.
  const session = await getServerSession(authOptions);
  if (session) redirect('/');
  const hasGithub = !!(process.env.GITHUB_ID && process.env.GITHUB_SECRET);
  return (
    <Suspense>
      <LoginForm hasGithub={hasGithub} />
    </Suspense>
  );
}
