export interface HealthCheckResponse {
  status: 'ok' | 'error';
  service: string;
}
