import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
  UsePipes,
  UseInterceptors,
  UploadedFile,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { FileUploadDto } from './dto/file-upload.dto';
import { PDFParsingService } from './pdf-parsing.service';

// Type for Multer file
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

@Controller('books')
export class BooksController {
  constructor(
    private readonly booksService: BooksService,
    private readonly pdfParsingService: PDFParsingService,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe())
  create(@Body() createBookDto: CreateBookDto) {
    return this.booksService.create(createBookDto);
  }

  @Get()
  findAll() {
    return this.booksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ValidationPipe()) id: string) {
    return this.booksService.findOne(id);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe())
  update(
    @Param('id', new ValidationPipe()) id: string,
    @Body() updateBookDto: UpdateBookDto,
  ) {
    return this.booksService.update(id, updateBookDto);
  }

  @Delete(':id')
  remove(@Param('id', new ValidationPipe()) id: string) {
    return this.booksService.remove(id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('book'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload a book',
    type: FileUploadDto,
  })
  async uploadFile(
    @UploadedFile() uploadedFile: MulterFile,
    @Query('tags') tagsQuery?: string,
  ) {
    try {
      if (!uploadedFile) {
        throw new BadRequestException('No file uploaded');
      }

      const tags = tagsQuery
        ? tagsQuery.split(',').map((tag) => tag.trim())
        : [];

      const metadata = await this.pdfParsingService.getMetadata(uploadedFile.path);

      const createBookDto: CreateBookDto = {
        title: metadata.title || uploadedFile.originalname,
        filename: uploadedFile.originalname,
        author: metadata.author || 'Unknown Author',
        mimetype: uploadedFile.mimetype,
        size: uploadedFile.size,
        filePath: uploadedFile.path,
        totalPages: metadata.pageCount,
      };

      // Create book record
      const bookRecord = await this.booksService.create(createBookDto);

      // Start processing
      await this.booksService.processBook(
        bookRecord.id,
        uploadedFile.path,
        tags,
      );

      return {
        bookId: bookRecord.id,
        message: 'Book uploaded and queued for processing',
        file: {
          originalname: uploadedFile.originalname,
          filename: uploadedFile.filename,
          mimetype: uploadedFile.mimetype,
          size: uploadedFile.size,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new BadRequestException(`Failed to upload book: ${errorMessage}`);
    }
  }
}
