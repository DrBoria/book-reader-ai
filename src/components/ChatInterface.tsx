import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../types";
import { Send, MessageCircle, Bot, User, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { bookService } from "../services/bookService";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isBookLoaded: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isBookLoaded
}) => {
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [expandedReferences, setExpandedReferences] = useState<Set<string>>(new Set());
  const [pageContent, setPageContent] = useState<Record<string, string>>({});
  const [loadingPages, setLoadingPages] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!inputMessage.trim() || !isBookLoaded) return;

    const message = inputMessage.trim();
    setInputMessage("");
    setIsTyping(true);

    try {
      await onSendMessage(message);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleReference = (referenceId: string, bookId?: string, pageNumber?: number) => {
    const newExpanded = new Set(expandedReferences);
    if (newExpanded.has(referenceId)) {
      newExpanded.delete(referenceId);
    } else {
      newExpanded.add(referenceId);

      // Fetch page content if not already loaded
      if (bookId && pageNumber && !pageContent[referenceId]) {
        const newLoading = new Set(loadingPages);
        newLoading.add(referenceId);
        setLoadingPages(newLoading);

        bookService.getPageContent(bookId, pageNumber)
          .then(content => {
            setPageContent(prev => ({
              ...prev,
              [referenceId]: content || 'Page content not available'
            }));
          })
          .catch(() => {
            setPageContent(prev => ({
              ...prev,
              [referenceId]: 'Failed to load page content'
            }));
          })
          .finally(() => {
            const newLoading = new Set(loadingPages);
            newLoading.delete(referenceId);
            setLoadingPages(newLoading);
          });
      }
    }
    setExpandedReferences(newExpanded);
  };

  // Parse structured content with statements and quotes
  const parseStructuredContent = (content: string) => {
    const sections = [];
    const lines = content.split('\n');
    let currentStatement = '';
    let currentQuotes = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this is a statement line
      if (line.startsWith('**Statement') && line.includes(':**')) {
        // Save previous section if exists
        if (currentStatement) {
          sections.push({
            statement: currentStatement,
            quotes: [...currentQuotes]
          });
        }
        
        // Start new section
        currentStatement = line.replace(/\*\*Statement \d+:\*\*\s*/, '');
        currentQuotes = [];
      }
      // Check if this is a quote line
      else if (line.startsWith('> **Quote from')) {
        const quoteMatch = line.match(/> \*\*Quote from (.+?) \(ID: ([^)]+)\), Page (\d+):\*\* "(.+?)"/);
        if (quoteMatch) {
          currentQuotes.push({
            bookTitle: quoteMatch[1],
            bookId: quoteMatch[2],
            pageNumber: parseInt(quoteMatch[3]),
            quote: quoteMatch[4]
          });
        }
      }
      // If it's continuation of statement (not empty and not quote)
      else if (line && !line.startsWith('>') && currentStatement && !line.startsWith('**Statement')) {
        currentStatement += ' ' + line;
      }
    }
    
    // Add the last section
    if (currentStatement) {
      sections.push({
        statement: currentStatement,
        quotes: [...currentQuotes]
      });
    }
    
    return sections;
  };

  const renderMessage = (message: ChatMessage) => {
    // Check if this is a structured assistant message
    if (message.type === "assistant" && message.content.includes("**Statement")) {
      const sections = parseStructuredContent(message.content);
      
      return (
        <div key={message.id} className="flex items-start space-x-3 justify-start">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Bot className="h-4 w-4 text-blue-600" />
            </div>
          </div>

          <div className="max-w-xs lg:max-w-2xl space-y-4">
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="bg-gray-100 text-gray-900 px-4 py-3 rounded-lg">
                {/* Statement */}
                <div className="text-sm font-medium mb-3">
                  {section.statement}
                </div>

                {/* Quotes for this statement */}
                {section.quotes.length > 0 && (
                  <div className="space-y-2">
                    {section.quotes.map((quote, quoteIndex) => {
                      const referenceId = `${message.id}-${sectionIndex}-${quoteIndex}`;
                      const isExpanded = expandedReferences.has(referenceId);

                      return (
                        <div key={quoteIndex} className="text-xs">
                          <div
                            className="bg-blue-50 border-l-4 border-blue-200 rounded p-3 cursor-pointer hover:bg-blue-100 transition-colors"
                            onClick={() => toggleReference(referenceId, quote.bookId, quote.pageNumber)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center">
                                <ExternalLink className="h-3 w-3 mr-1 text-blue-600" />
                                <span className="font-medium text-blue-800">{quote.bookTitle}</span>
                                <span className="mx-1 text-gray-400">•</span>
                                <span className="text-blue-600">Page {quote.pageNumber}</span>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3 text-gray-500" />
                              ) : (
                                <ChevronDown className="h-3 w-3 text-gray-500" />
                              )}
                            </div>

                            <div className="italic text-gray-700 text-sm">
                              "{quote.quote}"
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-700 max-h-40 overflow-y-auto">
                              <div className="mb-2">
                                <strong>{quote.bookTitle} - Page {quote.pageNumber}</strong>
                              </div>
                              <div className="mb-2">
                                <strong>Quote:</strong>
                                <div className="italic mt-1">"{quote.quote}"</div>
                              </div>
                              <div>
                                <strong>Full context:</strong>
                                <div className="mt-1 leading-relaxed">
                                  {loadingPages.has(referenceId) ? (
                                    <div className="flex items-center">
                                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce ml-1" style={{ animationDelay: "0.1s" }}></div>
                                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce ml-1" style={{ animationDelay: "0.2s" }}></div>
                                    </div>
                                  ) : (
                                    pageContent[referenceId] || 'Page content not available'
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            <div className="text-xs opacity-75 mt-2">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
      );
    }

    // Regular message rendering for user messages and non-structured assistant messages
    return (
      <div
        key={message.id}
        className={`flex items-start space-x-3 ${message.type === "user" ? "justify-end" : "justify-start"
          }`}
      >
        {message.type === "assistant" && (
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Bot className="h-4 w-4 text-blue-600" />
            </div>
          </div>
        )}

        <div
          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.type === "user"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-900"
            }`}
        >
          <p className="text-sm">{message.content}</p>

          {message.references && message.references.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-600 mb-2">References:</p>
              {message.references.map((ref, index) => {
                const referenceId = `${message.id}-${index}`;
                const isExpanded = expandedReferences.has(referenceId);

                return (
                  <div key={index} className="text-xs mb-2">
                    <div
                      className="bg-gray-50 rounded p-2 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleReference(referenceId, ref.bookId, ref.pageNumber)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <ExternalLink className="h-3 w-3 mr-1 text-blue-600" />
                          <span className="font-medium">Page {ref.pageNumber}</span>
                          {ref.chapter && (
                            <>
                              <span className="mx-1 text-gray-400">•</span>
                              <span>Chapter: {ref.chapter}</span>
                            </>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-gray-500" />
                        )}
                      </div>

                      <div className="italic mt-1 text-gray-700">
                        "{ref.quote}"
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-1 p-3 bg-gray-50 rounded text-xs text-gray-700 max-h-40 overflow-y-auto">
                        <div className="mb-2">
                          <strong>Page {ref.pageNumber}</strong>
                          {ref.chapter && <span> - {ref.chapter}</span>}
                        </div>
                        <div className="mb-2">
                          <strong>Short quote:</strong>
                          <div className="italic mt-1">"{ref.quote}"</div>
                        </div>
                        <div>
                          <strong>Full context:</strong>
                          <div className="mt-1 whitespace-pre-wrap leading-relaxed">
                            {loadingPages.has(referenceId) ? (
                              <div className="flex items-center">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce ml-1" style={{ animationDelay: "0.1s" }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce ml-1" style={{ animationDelay: "0.2s" }}></div>
                              </div>
                            ) : (
                              pageContent[referenceId] || 'Page content not available'
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="text-xs opacity-75 mt-1">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>

        {message.type === "user" && (
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
          </div>
        )}
      </div>
    );
  };

  const suggestedQuestions = [
    "What are the main themes in this book?",
    "Who are the key people mentioned?",
    "What time periods are covered?",
    "What locations are discussed?",
    "Give me a summary of chapter 1"
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          <MessageCircle className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="font-semibold text-gray-900">Chat with your book</h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Ask questions about the content
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && isBookLoaded && (
          <div className="text-center text-gray-500 py-8">
            <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="mb-4">Start a conversation about your book!</p>

            <div className="text-left space-y-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Try asking:</p>
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInputMessage(question)}
                  className="block w-full text-left text-sm p-2 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  "{question}"
                </button>
              ))}
            </div>
          </div>
        )}

        {!isBookLoaded && (
          <div className="text-center text-gray-500 py-8">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Upload a book to start chatting!</p>
          </div>
        )}

        {messages.map(renderMessage)}

        {isTyping && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Bot className="h-4 w-4 text-blue-600" />
            </div>
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isBookLoaded ? "Ask about your book..." : "Upload a book first"}
            disabled={!isBookLoaded}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!inputMessage.trim() || !isBookLoaded || isTyping}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
