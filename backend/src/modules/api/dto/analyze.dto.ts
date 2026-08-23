import { IsString, IsNumber, IsNotEmpty, IsOptional } from 'class-validator';

export class AnalyzePlanDto {
  @IsNumber()
  @IsNotEmpty()
  entry: number;

  @IsNumber()
  @IsNotEmpty()
  target: number;

  @IsNumber()
  @IsNotEmpty()
  stop: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateAnalyzeDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsString()
  @IsNotEmpty()
  strategy: string;

  @IsNotEmpty()
  plan: AnalyzePlanDto;
}
