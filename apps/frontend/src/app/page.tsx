import type { HealthCheckResponse } from '@fikir/types';

const health: HealthCheckResponse = {
  status: 'ok',
  service: 'frontend',
};

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-2xl font-semibold">Fikir</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Frontend scaffold is running.
        </p>
        <pre className="mt-4 rounded-md bg-muted p-3 text-sm">
          {JSON.stringify(health, null, 2)}
        </pre>
      </div>
    </main>
  );
}
