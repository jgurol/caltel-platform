
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline, List, ListOrdered, Image, Type, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ImprovedRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export const ImprovedRichTextEditor: React.FC<ImprovedRichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Enter description...",
  rows = 6,
  className
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isItalicActive, setIsItalicActive] = useState(false);
  const [isUnderlineActive, setIsUnderlineActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // Color options
  const colors = [
    '#000000', '#374151', '#6B7280', '#DC2626', '#EA580C', 
    '#D97706', '#65A30D', '#059669', '#0891B2', '#2563EB', 
    '#7C3AED', '#C026D3'
  ];

  // Convert markdown to HTML for display
  const markdownToHtml = (text: string): string => {
    if (!text) return '';
    
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 120px; max-height: 80px; object-fit: cover; border-radius: 6px; margin: 4px; border: 1px solid #e5e7eb;" />')
      .replace(/\n/g, '<br>');
  };

  // Convert HTML back to markdown - Simplified and fixed version
  const htmlToMarkdown = (html: string): string => {
    if (!html) return '';
    
    // Create a temporary div to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Get the plain text content directly
    let textContent = tempDiv.textContent || tempDiv.innerText || '';
    
    // Process the HTML for markdown formatting
    let result = html;
    
    // Convert HTML tags back to markdown
    result = result
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      .replace(/<u[^>]*>(.*?)<\/u>/gi, '__$1__')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<div[^>]*>/gi, '\n')
      .replace(/<\/div>/gi, '')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
      .replace(/<[^>]+>/g, ''); // Remove any remaining HTML tags
    
    // Clean up extra whitespace and newlines
    result = result
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\s+|\s+$/g, '')
      .trim();
    
    return result;
  };

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && value !== undefined) {
      const htmlContent = markdownToHtml(value);
      if (editorRef.current.innerHTML !== htmlContent) {
        editorRef.current.innerHTML = htmlContent;
      }
    }
  }, [value]);

  // Handle content changes
  const handleInput = () => {
    if (editorRef.current) {
      const htmlContent = editorRef.current.innerHTML;
      const markdownContent = htmlToMarkdown(htmlContent);
      
      if (markdownContent !== value) {
        onChange(markdownContent);
      }
    }
  };

  // Handle keyboard shortcuts - Fixed Enter key behavior
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Let the browser handle Enter naturally, but ensure proper line breaks
      // Don't prevent default - let contentEditable handle it naturally
      setTimeout(() => handleInput(), 0);
      return;
    }

    // Keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          handleBold();
          break;
        case 'i':
          e.preventDefault();
          handleItalic();
          break;
        case 'u':
          e.preventDefault();
          handleUnderline();
          break;
      }
    }
  };

  // Update toolbar state
  const updateToolbarState = () => {
    setIsBoldActive(document.queryCommandState('bold'));
    setIsItalicActive(document.queryCommandState('italic'));
    setIsUnderlineActive(document.queryCommandState('underline'));
  };

  // Toolbar actions
  const handleBold = () => {
    document.execCommand('bold', false, undefined);
    updateToolbarState();
    handleInput();
    editorRef.current?.focus();
  };

  const handleItalic = () => {
    document.execCommand('italic', false, undefined);
    updateToolbarState();
    handleInput();
    editorRef.current?.focus();
  };

  const handleUnderline = () => {
    document.execCommand('underline', false, undefined);
    updateToolbarState();
    handleInput();
    editorRef.current?.focus();
  };

  const handleUnorderedList = () => {
    document.execCommand('insertUnorderedList', false, undefined);
    handleInput();
    editorRef.current?.focus();
  };

  const handleOrderedList = () => {
    document.execCommand('insertOrderedList', false, undefined);
    handleInput();
    editorRef.current?.focus();
  };

  const handleFontSize = (size: string) => {
    document.execCommand('fontSize', false, size);
    handleInput();
    editorRef.current?.focus();
  };

  const handleTextColor = (color: string) => {
    document.execCommand('foreColor', false, color);
    handleInput();
    editorRef.current?.focus();
  };

  // Improved cursor position management
  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      return selection.getRangeAt(0);
    }
    return null;
  };

  const restoreSelection = (range: Range) => {
    const selection = window.getSelection();
    if (selection && range) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const setCursorAfterElement = (element: Node) => {
    const selection = window.getSelection();
    if (selection && editorRef.current) {
      const range = document.createRange();
      range.setStartAfter(element);
      range.setEndAfter(element);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  // Handle image upload with proper cursor management
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    // Save current selection before async operation
    const savedRange = saveSelection();

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('quote-item-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('quote-item-images')
        .getPublicUrl(filePath);

      // Focus editor and insert image properly
      if (editorRef.current) {
        editorRef.current.focus();
        
        // Create image element
        const img = document.createElement('img');
        img.src = data.publicUrl;
        img.alt = file.name;
        img.style.maxWidth = '120px';
        img.style.maxHeight = '80px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '6px';
        img.style.margin = '4px';
        img.style.border = '1px solid #e5e7eb';
        img.style.display = 'inline-block';
        img.style.verticalAlign = 'middle';

        // If we have a saved range, use it; otherwise insert at the end
        if (savedRange) {
          try {
            // Restore the saved selection
            restoreSelection(savedRange);
            
            // Insert the image at the current cursor position
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
              range.insertNode(img);
              
              // Create a space after the image for better cursor positioning
              const spaceNode = document.createTextNode(' ');
              range.setStartAfter(img);
              range.insertNode(spaceNode);
              
              // Position cursor after the space
              setCursorAfterElement(spaceNode);
            }
          } catch (error) {
            // Fallback: append to end if range restoration fails
            console.warn('Range restoration failed, appending image to end:', error);
            editorRef.current.appendChild(img);
            editorRef.current.appendChild(document.createTextNode(' '));
            setCursorAfterElement(img.nextSibling || img);
          }
        } else {
          // No saved range, append to end
          editorRef.current.appendChild(img);
          const spaceNode = document.createTextNode(' ');
          editorRef.current.appendChild(spaceNode);
          setCursorAfterElement(spaceNode);
        }

        // Trigger content update
        setTimeout(() => {
          handleInput();
          editorRef.current?.focus();
        }, 0);
      }

      toast({
        title: "Success",
        description: "Image uploaded and inserted successfully",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyUp = () => {
    updateToolbarState();
  };

  const handleMouseUp = () => {
    updateToolbarState();
  };

  const showPlaceholder = !value || value.trim() === '';

  return (
    <div className={cn("border rounded-lg shadow-sm bg-white", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Enhanced Toolbar */}
      <div className="flex items-center gap-1 p-3 border-b bg-gray-50 rounded-t-lg">
        {/* Text Formatting */}
        <div className="flex items-center gap-1 border-r pr-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBold}
            className={cn(
              "h-8 w-8 p-0 hover:bg-gray-200",
              isBoldActive && "bg-blue-100 text-blue-600"
            )}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleItalic}
            className={cn(
              "h-8 w-8 p-0 hover:bg-gray-200",
              isItalicActive && "bg-blue-100 text-blue-600"
            )}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleUnderline}
            className={cn(
              "h-8 w-8 p-0 hover:bg-gray-200",
              isUnderlineActive && "bg-blue-100 text-blue-600"
            )}
            title="Underline (Ctrl+U)"
          >
            <Underline className="h-4 w-4" />
          </Button>
        </div>

        {/* Font Size */}
        <div className="flex items-center gap-1 border-r pr-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-200"
                title="Font Size"
              >
                <Type className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-32 p-2">
              <div className="grid grid-cols-1 gap-1">
                {['1', '2', '3', '4', '5', '6', '7'].map((size) => (
                  <Button
                    key={size}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFontSize(size)}
                    className="justify-start text-xs"
                  >
                    Size {size}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-200"
                title="Text Color"
              >
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2">
              <div className="grid grid-cols-6 gap-1">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleTextColor(color)}
                    className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 border-r pr-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleUnorderedList}
            className="h-8 w-8 p-0 hover:bg-gray-200"
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleOrderedList}
            className="h-8 w-8 p-0 hover:bg-gray-200"
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
        </div>

        {/* Image Upload */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="h-8 w-8 p-0 hover:bg-gray-200"
          title="Insert Image"
        >
          {uploading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          ) : (
            <Image className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Editor */}
      <div className="relative">
        {showPlaceholder && (
          <div 
            className="absolute top-4 left-4 text-gray-400 pointer-events-none select-none text-sm"
            style={{ minHeight: `${rows * 24}px` }}
          >
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onMouseUp={handleMouseUp}
          className={cn(
            "p-4 min-h-[180px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-b-lg text-sm leading-relaxed",
            showPlaceholder && "text-transparent"
          )}
          style={{ minHeight: `${rows * 28}px` }}
          suppressContentEditableWarning={true}
        />
      </div>
    </div>
  );
};
