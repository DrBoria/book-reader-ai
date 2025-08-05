import React, { useState } from "react";
import { Tag, TagCategory } from "../types";
import { X, Palette, FolderPlus, Edit2, Check, Hash, Merge, Loader2 } from "lucide-react";
import { tagService } from "../services/tagService";

interface CategoryManagerProps {
  tags: Tag[];
  categories: TagCategory[];
  onAddCategory: (category: { name: string; description?: string; color?: string; dataType?: string }) => Promise<TagCategory | null>;
  onClose: () => void;
  onCategoriesUpdate?: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  tags,
  categories,
  onAddCategory,
  onClose,
  onCategoriesUpdate
}) => {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#6366f1");
  const [newCategoryDataType, setNewCategoryDataType] = useState("text");
  
  // Keywords editing state
  const [editingKeywords, setEditingKeywords] = useState<string | null>(null);
  const [keywordInput, setKeywordInput] = useState("");
  
  // Cleanup state
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);
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

    if (!newCategoryName.trim()) {
      newErrors.name = "Category name is required";
    } else if (categories.some(category => category.name.toLowerCase() === newCategoryName.toLowerCase())) {
      newErrors.name = "Category name already exists";
    }

    if (!newCategoryDescription.trim()) {
      newErrors.description = "Description is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      const result = await onAddCategory({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim(),
        color: newCategoryColor,
        dataType: newCategoryDataType
      });

      if (result) {
        // Reset form
        setNewCategoryName("");
        setNewCategoryDescription("");
        setNewCategoryColor("#6366f1");
        setNewCategoryDataType("text");
        setErrors({});
      }
      
      // Success notification could be added here
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  // Keywords editing functions
  const handleEditKeywords = (categoryId: string, currentKeywords: string[] = []) => {
    setEditingKeywords(categoryId);
    setKeywordInput(currentKeywords.join(', '));
  };

  const handleSaveKeywords = async (categoryId: string) => {
    try {
      const keywords = keywordInput
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      await tagService.updateCategoryKeywords(categoryId, keywords);
      
      setEditingKeywords(null);
      setKeywordInput("");
      
      // Refresh categories
      if (onCategoriesUpdate) {
        onCategoriesUpdate();
      }
    } catch (error) {
      console.error("Error updating keywords:", error);
    }
  };

  const handleCancelKeywords = () => {
    setEditingKeywords(null);
    setKeywordInput("");
  };

  const handleCleanupDuplicates = async () => {
    setIsCleaningUp(true);
    setCleanupResult(null);
    
    try {
      const result = await tagService.cleanupDuplicateTags();
      
      if (result) {
        setCleanupResult(result.message);
        
        // Refresh categories and tags after cleanup
        if (onCategoriesUpdate) {
          onCategoriesUpdate();
        }
      } else {
        setCleanupResult("Failed to cleanup duplicate tags");
      }
    } catch (error) {
      console.error("Error cleaning up duplicates:", error);
      setCleanupResult("Error occurred during cleanup");
    } finally {
      setIsCleaningUp(false);
    }
  };

  // Show existing categories and their tag counts

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Category Manager</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCleanupDuplicates}
              disabled={isCleaningUp}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50"
              title="Merge similar tags using fuzzy search"
            >
              {isCleaningUp ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Merge className="h-4 w-4" />
              )}
              <span>{isCleaningUp ? 'Fuzzy Merging...' : 'Fuzzy Merge Tags'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Cleanup Result */}
          {cleanupResult && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">{cleanupResult}</p>
            </div>
          )}
          
          {/* Add New Category Form */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FolderPlus className="h-5 w-5 mr-2 text-blue-600" />
              Add Custom Category
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Create a new category and AI will automatically extract relevant tags from your books.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
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
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  rows={2}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.description ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Describe what this category will capture..."
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
                        onClick={() => setNewCategoryColor(color)}
                        className={`w-8 h-8 rounded-full border-2 ${
                          newCategoryColor === color ? "border-gray-400" : "border-gray-200"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center">
                    <Palette className="h-4 w-4 text-gray-500 mr-2" />
                    <input
                      type="color"
                      value={newCategoryColor}
                      onChange={(e) => setNewCategoryColor(e.target.value)}
                      className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Type
                </label>
                <select
                  value={newCategoryDataType}
                  onChange={(e) => setNewCategoryDataType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="text">Text - Names, places, concepts</option>
                  <option value="date">Date - Years, time periods, dates</option>
                  <option value="number">Number - Quantities, measurements</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Add Category
              </button>
            </form>
          </div>

          {/* Existing Tags */}
          <div className="space-y-6">
            {/* Default Categories */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Default Categories</h3>
              <div className="grid grid-cols-1 gap-3">
                {categories.filter(cat => cat.type === "default").map((category) => (
                  <div
                    key={category.id}
                    className="p-3 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center">
                      <div
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: category.color }}
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{category.name}</h4>
                        <p className="text-sm text-gray-600">{category.description}</p>
                        <p className="text-xs text-blue-600 mt-1">
                          Type: {category.dataType || 'text'} 
                          {category.dataType === 'date' && ' (years, periods)'}
                          {category.dataType === 'text' && ' (names, places)'}
                          {category.dataType === 'number' && ' (quantities)'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleEditKeywords(category.id, category.keywords)}
                        className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                        title="Edit keywords"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {/* Keywords section */}
                    <div className="mt-3">
                      {editingKeywords === category.id ? (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Hash className="h-3 w-3" />
                            <span>Keywords (comma-separated):</span>
                          </div>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={keywordInput}
                              onChange={(e) => setKeywordInput(e.target.value)}
                              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., when, time, date, year"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveKeywords(category.id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="Save keywords"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={handleCancelKeywords}
                              className="p-1 text-gray-500 hover:bg-gray-50 rounded"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Hash className="h-3 w-3" />
                          <span>
                            {category.keywords && category.keywords.length > 0
                              ? category.keywords.join(', ')
                              : 'No keywords set'
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Categories */}
            {categories.filter(cat => cat.type === "custom").length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Custom Categories</h3>
                <div className="grid grid-cols-1 gap-3">
                  {categories.filter(cat => cat.type === "custom").map((category) => (
                    <div
                      key={category.id}
                      className="p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded-full mr-3"
                          style={{ backgroundColor: category.color }}
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{category.name}</h4>
                          <p className="text-sm text-gray-600">{category.description}</p>
                          <p className="text-xs text-blue-600">
                            Type: {category.dataType || 'text'} 
                            {category.dataType === 'date' && ' (years, periods)'}
                            {category.dataType === 'text' && ' (names, places)'}
                            {category.dataType === 'number' && ' (quantities)'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {tags.filter(tag => tag.categoryId === category.id).length} tags generated
                          </p>
                        </div>
                        <button
                          onClick={() => handleEditKeywords(category.id, category.keywords)}
                          className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                          title="Edit keywords"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* Keywords section */}
                      <div className="mt-3">
                        {editingKeywords === category.id ? (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Hash className="h-3 w-3" />
                              <span>Keywords (comma-separated):</span>
                            </div>
                            <div className="flex space-x-2">
                              <input
                                type="text"
                                value={keywordInput}
                                onChange={(e) => setKeywordInput(e.target.value)}
                                className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., technology, innovation, quotes"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveKeywords(category.id)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                title="Save keywords"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={handleCancelKeywords}
                                className="p-1 text-gray-500 hover:bg-gray-50 rounded"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Hash className="h-3 w-3" />
                            <span>
                              {category.keywords && category.keywords.length > 0
                                ? category.keywords.join(', ')
                                : 'No keywords set - click edit to add'
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {categories.filter(cat => cat.type === "custom").length === 0 && (
              <div className="text-center text-gray-500 py-6">
                <FolderPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No custom categories created yet.</p>
                <p className="text-sm mt-1">Use the form above to add your own categories.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Keep the old export for backward compatibility during transition
export const TagManager = CategoryManager;
