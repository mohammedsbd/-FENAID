import { IsEnum } from 'class-validator';

export enum CalendarSystemDto {
  GREGORIAN = 'GREGORIAN',
  ETHIOPIAN = 'ETHIOPIAN',
}

export class UpdateSystemSettingsDto {
  @IsEnum(CalendarSystemDto)
  calendarSystem!: CalendarSystemDto;
}
