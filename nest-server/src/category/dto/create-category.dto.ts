import { IsEnum, IsOptional, IsString, Length } from "class-validator";

export enum CategoryType {
    TEXT = 'text',
    DATE = 'date',
    NUMBET = 'number',
}

export class CreateCategoryDto {
    @IsString()
    @Length(1, 500)
    name: string;

    @IsString()
    @Length(1, 1500)
    description?: string;

    @IsString()
    @Length(1, 50)
    color?: string;

    @IsEnum(CategoryType)
    @IsOptional()
    dataType?: string;

    // @IsString()
    // @Length(1, 50)
    // keywords?: string;
}
