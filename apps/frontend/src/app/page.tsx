import type { HealthCheckResponse } from '@fikir/types';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3101';

function loadDictionary(locale: string): Record<string, string> {
  try {
    const dictPath = path.join(process.cwd(), 'public', 'locales', `${locale}.json`);
    return JSON.parse(fs.readFileSync(dictPath, 'utf-8'));
  } catch {
    return {};
  }
}

function t(dict: Record<string, string>, key: string, fallback: string): string {
  return dict[key] ?? fallback;
}

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
  const cookieStore = cookies();
  const locale = cookieStore.get('locale')?.value || 'en';
  const dict = loadDictionary(locale);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 gap-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-2xl font-semibold">Fikir</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(dict, 'app.systemRunning', 'System is running.')}
        </p>
      </div>

      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h2 className="text-xl font-semibold">{t(dict, 'app.backendStatus', 'Backend Status')}</h2>
        <pre className={`mt-4 rounded-md p-3 text-sm ${backendHealth.status === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {JSON.stringify(backendHealth, null, 2)}
        </pre>
      </div>
    </main>
  );
}
