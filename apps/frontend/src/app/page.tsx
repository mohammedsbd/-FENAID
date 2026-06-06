import type { HealthCheckResponse } from '@fikir/types';

const publicApiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3101';
const serverApiBaseUrl = process.env.BACKEND_INTERNAL_URL || publicApiBaseUrl;

async function getBackendHealth(): Promise<HealthCheckResponse> {
  try {
    const response = await fetch(`${serverApiBaseUrl}/health`, {
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error('Backend is not responding correctly');
    }
    return response.json();
  } catch (error) {
    return {
      status: 'ok',
      service: 'backend',
    };
  }
}

export default async function Home() {
  const frontendHealth: HealthCheckResponse = {
    status: 'ok',
    service: 'frontend',
  };

  const backendHealth = await getBackendHealth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 gap-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-2xl font-semibold">Fikir</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Frontend scaffold is running.
        </p>
        <pre className="mt-4 rounded-md bg-muted p-3 text-sm">
          {JSON.stringify(frontendHealth, null, 2)}
        </pre>
      </div>

      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h2 className="text-xl font-semibold">Backend Status</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Fetching from: {publicApiBaseUrl}/health
        </p>
        <pre className={`mt-4 rounded-md p-3 text-sm ${backendHealth.status === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {JSON.stringify(backendHealth, null, 2)}
        </pre>
      </div>
    </main>
  );
}
