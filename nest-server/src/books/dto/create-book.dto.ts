import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  IsEnum,
  Length,
  IsDateString,
} from 'class-validator';
import { BookStatus } from '../entities/book.entity';

export class CreateBookDto {
  @IsString()
  @Length(1, 500)
  title: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  author?: string;

  @IsString()
  @Length(1, 255)
  filename: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  totalPages?: number;

  @IsString()
  @IsOptional()
  filePath?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  size?: number;

  @IsEnum(BookStatus)
  @IsOptional()
  status?: BookStatus;

  @IsDateString()
  @IsOptional()
  processedAt?: string;

  @IsDateString()
  @IsOptional()
  uploadedAt?: string;

  @IsString()
  @IsOptional()
  mimetype?: string;
}
