import { Injectable } from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

@Injectable()
export class PDFParsingService {
  async extractPages(filePath: string): Promise<ExtractedPage[]> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);

      const pages = this.splitTextIntoPages(data.text, data.numpages);

      return pages
        .map((text, index) => ({
          pageNumber: index + 1,
          text: text.trim(),
        }))
        .filter((page) => page.text.length > 0);
    } catch (error) {
      console.error('PDF parsing failed:', error);
      throw new Error('Failed to parse PDF file');
    }
  }

  private splitTextIntoPages(fullText: string, numPages: number): string[] {
    const lines = fullText.split('\n');
    const linesPerPage = Math.ceil(lines.length / numPages);

    const pages: string[] = [];
    for (let i = 0; i < numPages; i++) {
      const start = i * linesPerPage;
      const end = Math.min(start + linesPerPage, lines.length);
      const pageText = lines.slice(start, end).join('\n');
      pages.push(pageText);
    }

    return pages.filter((page) => page.trim().length > 0);
  }

  async getMetadata(filePath: string): Promise<{
    title?: string;
    author?: string;
    pageCount: number;
  }> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);

      return {
        title: data.info?.Title || path.basename(filePath, '.pdf'),
        author: data.info?.Author,
        pageCount: data.numpages,
      };
    } catch (error) {
      console.error('PDF metadata extraction failed:', error);
      return {
        title: path.basename(filePath, '.pdf'),
        pageCount: 0,
      };
    }
  }
}
