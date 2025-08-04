import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../types";
import { Send, MessageCircle, Bot, User } from "lucide-react";

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

  const renderMessage = (message: ChatMessage) => (
    <div
      key={message.id}
      className={`flex items-start space-x-3 ${
        message.type === "user" ? "justify-end" : "justify-start"
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
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          message.type === "user"
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-900"
        }`}
      >
        <p className="text-sm">{message.content}</p>
        
        {message.references && message.references.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-600 mb-1">References:</p>
            {message.references.map((ref, index) => (
              <div key={index} className="text-xs bg-gray-50 rounded p-2 mb-1">
                <div className="font-medium">Page {ref.pageNumber}</div>
                {ref.chapter && <div>Chapter: {ref.chapter}</div>}
                <div className="italic mt-1">"{ref.quote}"</div>
              </div>
            ))}
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
