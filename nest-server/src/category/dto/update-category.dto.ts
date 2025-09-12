import { IsEnum, IsOptional, IsString, Length } from "class-validator";
import { CategoryType } from "./create-category.dto";

export class UpdateCategoryDto {
    @IsString()
    @Length(1, 500)
    @IsOptional()
    name?: string;

    @IsString()
    @Length(1, 1500)
    @IsOptional()
    description?: string;

    @IsString()
    @Length(1, 50)
    @IsOptional()
    color?: string;

    @IsEnum(CategoryType)
    @IsOptional()
    dataType?: string;

    @IsString({ each: true })
    @IsOptional()
    keywords?: string[];
}