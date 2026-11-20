import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Image src="/logo.svg" alt="Nexvia" width={40} height={40} className="rounded-xl" />
          <h1 className="text-lg font-bold tracking-tight text-foreground">Nexvia</h1>
          <p className="text-sm text-muted-foreground">Your team&apos;s collaborative workspace</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
