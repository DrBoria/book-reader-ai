import React, { useState } from "react";
import { Tag, TaggedContent, TagCloud } from "../types";
import { Hash, List, Cloud } from "lucide-react";

interface TagPanelProps {
  tags: Tag[];
  taggedContent: TaggedContent[];
  selectedTag: string | null;
  onTagSelect: (tagId: string) => void;
}

export const TagPanel: React.FC<TagPanelProps> = ({
  tags,
  taggedContent,
  selectedTag,
  onTagSelect
}) => {
  const [viewMode, setViewMode] = useState<"list" | "cloud">("list");

  const getTagCounts = (): TagCloud[] => {
    const counts = tags.map(tag => {
      const count = taggedContent.filter(content => content.tagId === tag.id).length;
      return {
        tag,
        count,
        weight: count > 0 ? Math.log(count + 1) : 0
      };
    });

    return counts.sort((a, b) => b.count - a.count);
  };

  const tagClouds = getTagCounts();
  const maxWeight = Math.max(...tagClouds.map(tc => tc.weight));

  const renderTagList = () => (
    <div className="space-y-2">
      {tagClouds.map(({ tag, count }) => (
        <button
          key={tag.id}
          onClick={() => onTagSelect(tag.id)}
          className={`w-full text-left p-3 rounded-lg border transition-all ${
            selectedTag === tag.id
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-gray-300 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: tag.color }}
              />
              <span className="font-medium text-gray-900">{tag.name}</span>
            </div>
            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
              {count}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{tag.description}</p>
        </button>
      ))}
    </div>
  );

  const renderTagCloud = () => (
    <div className="flex flex-wrap gap-2 p-4">
      {tagClouds.map(({ tag, count, weight }) => {
        const fontSize = Math.max(0.75, (weight / maxWeight) * 1.5);
        
        return (
          <button
            key={tag.id}
            onClick={() => onTagSelect(tag.id)}
            className={`px-3 py-1 rounded-full transition-all hover:scale-105 ${
              selectedTag === tag.id
                ? "ring-2 ring-blue-500 ring-offset-1"
                : ""
            }`}
            style={{
              backgroundColor: tag.color + "20",
              color: tag.color,
              fontSize: `${fontSize}rem`,
              borderWidth: "1px",
              borderColor: tag.color + "40"
            }}
          >
            {tag.name} ({count})
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* View Mode Toggle */}
      <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
        <button
          onClick={() => setViewMode("list")}
          className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md transition-colors ${
            viewMode === "list"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <List className="h-4 w-4 mr-1" />
          List
        </button>
        <button
          onClick={() => setViewMode("cloud")}
          className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md transition-colors ${
            viewMode === "cloud"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Cloud className="h-4 w-4 mr-1" />
          Cloud
        </button>
      </div>

      {/* Tags Display */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === "list" ? renderTagList() : renderTagCloud()}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Total tags:</span>
            <span className="font-medium">{tags.length}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Tagged content:</span>
            <span className="font-medium">{taggedContent.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
