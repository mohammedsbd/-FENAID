import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export enum ReportType {
  MEMBER_DIRECTORY = 'member-directory',
  SERVICE_UTILIZATION = 'service-utilization',
  PROGRESS_SUMMARY = 'progress-summary',
  FUND_ALLOCATION_LOG = 'fund-allocation-log',
  DONATION_LOG = 'donation-log',
  STAFF_ACTIVITY = 'staff-activity',
}

export class ReportQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  format?: string = 'json';
}
