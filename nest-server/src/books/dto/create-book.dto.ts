import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  IsEnum,
  Length,
} from 'class-validator';

export enum BookStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error',
}

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
  totalPages: number;

  @IsEnum(BookStatus)
  status: BookStatus;
}
