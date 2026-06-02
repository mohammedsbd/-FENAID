import { GoalType, MilestoneStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// Progress Notes DTOs
export class CreateProgressNoteDto {
  @IsString()
  @IsNotEmpty()
  childId!: string;

  @IsString()
  @IsNotEmpty()
  note!: string;
}

export class ListProgressNotesDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

// Milestones DTOs
export class CreateMilestoneDto {
  @IsString()
  @IsNotEmpty()
  childId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;
}

export class UpdateMilestoneDto {
  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;

  @IsOptional()
  @IsString()
  description?: string;
}

// Goals DTOs
export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  childId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(GoalType)
  @IsNotEmpty()
  type!: GoalType;
}

export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(GoalType)
  type?: GoalType;

  @IsOptional()
  isAchieved?: boolean;
}

export class ListGoalsDto {
  @IsOptional()
  @IsEnum(GoalType)
  type?: GoalType;
}
