import { SetMetadata } from '@nestjs/common';
import { IDEMPOTENCY_METADATA } from '../interceptors/idempotency.interceptor';

export const Idempotent = () => SetMetadata(IDEMPOTENCY_METADATA, true);
