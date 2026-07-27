import { BadRequestException } from '@nestjs/common';

export function checkOptimisticLock(
  existingUpdatedAt: Date | undefined,
  expectedUpdatedAt: string | undefined,
  entityName: string = 'Record',
): void {
  if (!expectedUpdatedAt) return;

  if (!existingUpdatedAt) {
    throw new BadRequestException(
      `${entityName} has no updatedAt timestamp.`,
    );
  }

  if (new Date(expectedUpdatedAt).getTime() !== existingUpdatedAt.getTime()) {
    throw new BadRequestException(
      `${entityName} was modified by another user. Please refresh and try again.`,
    );
  }
}
