import React, { useState } from "react";
import { Tag } from "../types";
import { X, Plus, Palette, Tag as TagIcon } from "lucide-react";

interface TagManagerProps {
  tags: Tag[];
  onAddTag: (tag: Omit<Tag, "id" | "type">) => string;
  onClose: () => void;
}

export const TagManager: React.FC<TagManagerProps> = ({
  tags,
  onAddTag,
  onClose
}) => {
  const [newTagName, setNewTagName] = useState("");
  const [newTagDescription, setNewTagDescription] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const predefinedColors = [
    "#3B82F6", // Blue
    "#EF4444", // Red
    "#10B981", // Green
    "#F59E0B", // Yellow
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#06B6D4", // Cyan
    "#84CC16", // Lime
    "#F97316", // Orange
    "#6366F1"  // Indigo
  ];

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!newTagName.trim()) {
      newErrors.name = "Tag name is required";
    } else if (tags.some(tag => tag.name.toLowerCase() === newTagName.toLowerCase())) {
      newErrors.name = "Tag name already exists";
    }

    if (!newTagDescription.trim()) {
      newErrors.description = "Description is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      onAddTag({
        name: newTagName.trim(),
        description: newTagDescription.trim(),
        color: newTagColor
      });

      // Reset form
      setNewTagName("");
      setNewTagDescription("");
      setNewTagColor("#6366f1");
      setErrors({});
      
      // Success notification could be added here
    } catch (error) {
      console.error("Error adding tag:", error);
    }
  };

  const defaultTags = tags.filter(tag => tag.type === "default");
  const customTags = tags.filter(tag => tag.type === "custom");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Tag Manager</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Add New Tag Form */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Plus className="h-5 w-5 mr-2 text-blue-600" />
              Add Custom Tag
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tag Name
                </label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="e.g., Technology, Characters, Quotes"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newTagDescription}
                  onChange={(e) => setNewTagDescription(e.target.value)}
                  rows={2}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.description ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Describe what this tag will capture..."
                />
                {errors.description && (
                  <p className="text-red-500 text-xs mt-1">{errors.description}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-2">
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewTagColor(color)}
                        className={`w-8 h-8 rounded-full border-2 ${
                          newTagColor === color ? "border-gray-400" : "border-gray-200"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center">
                    <Palette className="h-4 w-4 text-gray-500 mr-2" />
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Add Tag
              </button>
            </form>
          </div>

          {/* Existing Tags */}
          <div className="space-y-6">
            {/* Default Tags */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Default Tags</h3>
              <div className="grid grid-cols-1 gap-3">
                {defaultTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center p-3 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: tag.color }}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{tag.name}</h4>
                      <p className="text-sm text-gray-600">{tag.description}</p>
                    </div>
                    <TagIcon className="h-4 w-4 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Tags */}
            {customTags.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Custom Tags</h3>
                <div className="grid grid-cols-1 gap-3">
                  {customTags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center p-3 border border-gray-200 rounded-lg"
                    >
                      <div
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: tag.color }}
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{tag.name}</h4>
                        <p className="text-sm text-gray-600">{tag.description}</p>
                      </div>
                      <TagIcon className="h-4 w-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {customTags.length === 0 && (
              <div className="text-center text-gray-500 py-6">
                <TagIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No custom tags created yet.</p>
                <p className="text-sm mt-1">Use the form above to add your own tags.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
