import * as pdfjsLib from "pdfjs-dist";
import { BookContent, BookPage } from "../types";

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export class PDFParser {
  async parseFile(file: File): Promise<BookContent> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const pages: BookPage[] = [];
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .trim();
        
        if (pageText.length > 50) { // Only add pages with meaningful content
          pages.push({
            pageNumber: pageNum,
            text: pageText
          });
        }
      }
      
      return this.createBookContent(pages, file.name);
    } catch (error) {
      console.error("Error parsing PDF:", error);
      throw new Error("Failed to parse PDF file");
    }
  }

  private createBookContent(pages: BookPage[], fileName: string): BookContent {
    return {
      id: Math.random().toString(36),
      title: this.extractTitle(fileName),
      pages,
      uploadedAt: new Date()
    };
  }



  private extractTitle(fileName: string): string {
    return fileName.replace(/\.pdf$/i, "").replace(/[_-]/g, " ");
  }

  // Enhanced method with metadata extraction
  async parseWithMetadata(file: File): Promise<BookContent> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const pages: BookPage[] = [];
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .trim();
        
        if (pageText.length > 50) {
          pages.push({
            pageNumber: pageNum,
            text: pageText
          });
        }
      }
      
      const bookContent = this.createBookContent(pages, file.name);
      
      // Try to extract metadata
      try {
        const metadata = await pdf.getMetadata();
        if (metadata?.info?.Author) {
          bookContent.author = metadata.info.Author;
        }
      } catch (error) {
        console.warn("Could not extract metadata:", error);
      }
      
      return bookContent;
    } catch (error) {
      console.error("Error parsing PDF with metadata:", error);
      throw new Error("Failed to parse PDF file");
    }
  }
}
