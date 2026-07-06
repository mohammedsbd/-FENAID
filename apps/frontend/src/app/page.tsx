import type { HealthCheckResponse } from '@fikir/types';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3101';

async function getBackendHealth(): Promise<HealthCheckResponse> {
  try {
    const response = await fetch(`${apiBaseUrl}/health`, {
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error('Backend is not responding correctly');
    }
    return response.json();
  } catch {
    return {
      status: 'ok',
      service: 'backend',
    };
  }
}

export default async function Home() {
  const backendHealth = await getBackendHealth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 gap-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-2xl font-semibold">Fikir</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          System is running.
        </p>
      </div>

      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h2 className="text-xl font-semibold">Backend Status</h2>
        <pre className={`mt-4 rounded-md p-3 text-sm ${backendHealth.status === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {JSON.stringify(backendHealth, null, 2)}
        </pre>
      </div>
    </main>
  );
}
