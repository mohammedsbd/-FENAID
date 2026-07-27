export interface HealthCheckResponse {
    status: 'ok' | 'error';
    service: string;
}
export * from './data-query.types.js';
