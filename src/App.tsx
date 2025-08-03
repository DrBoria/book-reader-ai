import React, { useState, useEffect } from "react";
import { LMStudioBookTaggingAgent } from "./agent/LMStudioBookTaggingAgent";
import { PDFParser } from "./utils/pdfParser";
import { BookContent, Tag, TaggedContent, ChatMessage } from "./types";
import { FileUpload } from "./components/FileUpload";
import { TagPanel } from "./components/TagPanel";
import { ContentDisplay } from "./components/ContentDisplay";
import { ChatInterface } from "./components/ChatInterface";
import { TagManager } from "./components/TagManager";

const App: React.FC = () => {
  const [agent] = useState(() => new LMStudioBookTaggingAgent(
    import.meta.env.VITE_LM_STUDIO_HOST || "http://100.105.253.249:1234",
    import.meta.env.VITE_DEEPSEEK_MODEL || "deepseek/deepseek-r1-0528-qwen3-8b"
  ));
  const [pdfParser] = useState(() => new PDFParser());
  const [currentBook, setCurrentBook] = useState<BookContent | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [taggedContent, setTaggedContent] = useState<TaggedContent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showTagManager, setShowTagManager] = useState(false);
  const [modelAvailable, setModelAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const state = agent.getState();
    setTags(state.tags);
    
    // Check if DeepSeek model is available
    agent.checkModelAvailability().then(setModelAvailable);
  }, [agent]);

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      const bookContent = await pdfParser.parseWithMetadata(file);
      await agent.processBook(bookContent);
      
      const state = agent.getState();
      setCurrentBook(state.currentBook);
      setTaggedContent(state.taggedContent);
    } catch (error) {
      console.error("Error processing file:", error);
      alert("Error processing PDF file. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTagSelect = (tagId: string) => {
    setSelectedTag(tagId);
  };

  const handleAddCustomTag = (tagData: Omit<Tag, "id" | "type">) => {
    const tagId = agent.addCustomTag(tagData);
    const state = agent.getState();
    setTags(state.tags);
    return tagId;
  };

  const handleChatMessage = async (message: string) => {
    const userMessage: ChatMessage = {
      id: Math.random().toString(36),
      type: "user",
      content: message,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);

    try {
      const response = await agent.answerQuestion(message);
      const assistantMessage: ChatMessage = {
        id: Math.random().toString(36),
        type: "assistant",
        content: response,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error processing chat message:", error);
    }
  };

  const getContentForSelectedTag = (): TaggedContent[] => {
    if (!selectedTag) return [];
    return agent.getContentByTag(selectedTag);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                📚 Book Reader AI Agent (DeepSeek R1 + LM Studio)
              </h1>
              <p className="text-gray-600 mt-1">
                AI agent for PDF book analysis powered by DeepSeek R1 via LM Studio
              </p>
            </div>
            <div className="text-right">
              {modelAvailable === null && (
                <div className="text-yellow-600">🔄 Checking model...</div>
              )}
              {modelAvailable === true && (
                <div className="text-green-600">✅ LM Studio + DeepSeek R1 Ready</div>
              )}
              {modelAvailable === false && (
                <div className="text-red-600">❌ LM Studio Unavailable</div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {!currentBook ? (
          <div className="text-center py-12">
            <FileUpload onFileUpload={handleFileUpload} isProcessing={isProcessing} />
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6 h-screen max-h-[calc(100vh-200px)]">
            {/* Left Panel - Tags */}
            <div className="col-span-3 bg-white rounded-lg shadow p-4 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Tags</h2>
                <button
                  onClick={() => setShowTagManager(true)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Manage Tags
                </button>
              </div>
              
              <TagPanel
                tags={tags}
                taggedContent={taggedContent}
                selectedTag={selectedTag}
                onTagSelect={handleTagSelect}
              />
            </div>

            {/* Center Panel - Content */}
            <div className="col-span-6 bg-white rounded-lg shadow overflow-y-auto">
              <ContentDisplay
                book={currentBook}
                selectedTag={selectedTag}
                taggedContent={getContentForSelectedTag()}
                tags={tags}
              />
            </div>

            {/* Right Panel - Chat */}
            <div className="col-span-3 bg-white rounded-lg shadow">
              <ChatInterface
                messages={chatMessages}
                onSendMessage={handleChatMessage}
                isBookLoaded={!!currentBook}
              />
            </div>
          </div>
        )}
      </main>

      {showTagManager && (
        <TagManager
          tags={tags}
          onAddTag={handleAddCustomTag}
          onClose={() => setShowTagManager(false)}
        />
      )}
    </div>
  );
};

export default App;
