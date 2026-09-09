import { IsString, IsNumber, IsNotEmpty, IsArray, IsOptional, IsUUID } from 'class-validator';

export class CreateResultDto {
  @IsUUID()
  @IsNotEmpty()
  opportunityId: string;

  @IsString()
  @IsNotEmpty()
  result: string;

  @IsNumber()
  @IsNotEmpty()
  points: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  successReasons?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  failureReasons?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  lessons?: string[];
}
