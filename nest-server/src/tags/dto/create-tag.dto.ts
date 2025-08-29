import { IsNumber, IsString, Length } from "class-validator";

export class CreateTagDto {
    @IsString()
    @Length(1, 500)
    name: string;

    @IsString()
    @Length(1, 1500)
    value?: string;

    @IsString()
    @Length(1, 1500)
    bookId: string;

    @IsString()
    @Length(1, 1500)
    categoryId: string;

    @IsString()
    @Length(1, 1500)
    type?: string;

    @IsNumber()
    confidence: number;

    @IsNumber()
    contentCount?: string;
}
