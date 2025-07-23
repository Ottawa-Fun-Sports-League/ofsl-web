import { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function RichTextEditor({ value, onChange, placeholder, rows = 6 }: RichTextEditorProps) {
  const [editorValue, setEditorValue] = useState(value);
  const editorRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // Calculate initial height based on rows (moved before useEffect)
  const initialHeight = `${Math.max(150, rows * 24)}px`;

  useEffect(() => {
    setEditorValue(value);
  }, [value]);

  const handleChange = (content: string) => {
    setEditorValue(content);
    onChange(content);
  };

  // Set up styles
  useEffect(() => {
    const styleId = 'rich-text-editor-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = `
      .ql-editor {
        min-height: ${initialHeight};
        max-height: 800px;
        overflow-y: auto;
        resize: none;
      }
    `;
    
    return () => {
      // Clean up styles when component unmounts
      if (styleElement && document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, [initialHeight]);

  // Set up resize functionality
  useEffect(() => {
    const editorContainer = editorRef.current;
    if (!editorContainer) return;

    // Find the editor element
    const editorElement = editorContainer.querySelector('.ql-editor');
    if (!editorElement) return;

    // Create resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    resizeHandle.style.position = 'absolute';
    resizeHandle.style.bottom = '0';
    resizeHandle.style.right = '0';
    resizeHandle.style.width = '15px';
    resizeHandle.style.height = '15px';
    resizeHandle.style.cursor = 'nwse-resize';
    resizeHandle.style.backgroundImage = 'linear-gradient(135deg, transparent 0%, transparent 50%, #ccc 50%, #ccc 100%)';
    resizeHandle.style.backgroundSize = '10px 10px';
    resizeHandle.style.backgroundPosition = 'right bottom';
    resizeHandle.style.backgroundRepeat = 'no-repeat';
    resizeHandle.style.zIndex = '10';

    // Add the resize handle to the editor container
    editorContainer.style.position = 'relative';
    editorContainer.appendChild(resizeHandle);

    // Mouse down event handler
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      resizingRef.current = true;
      startYRef.current = e.clientY;
      startHeightRef.current = (editorElement as HTMLElement).offsetHeight;
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    // Mouse move event handler
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      
      const deltaY = e.clientY - startYRef.current;
      const newHeight = Math.max(100, startHeightRef.current + deltaY); // Minimum height of 100px
      
      (editorElement as HTMLElement).style.height = `${newHeight}px`;
    };

    // Mouse up event handler
    const handleMouseUp = () => {
      resizingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    // Add event listener to the resize handle
    resizeHandle.addEventListener('mousedown', handleMouseDown);

    // Clean up event listeners
    return () => {
      resizeHandle.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      if (editorContainer.contains(resizeHandle)) {
        editorContainer.removeChild(resizeHandle);
      }
    };
  }, []);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ],
  };

  return (
    <div className="rich-text-editor" ref={editorRef}>
      <ReactQuill
        theme="snow"
        value={editorValue}
        onChange={handleChange}
        modules={modules}
        placeholder={placeholder || 'Write something...'}
        style={{ 
          height: 'auto',
          marginBottom: '2.5rem' // Add space for toolbar
        }}
      />
    </div>
  );
}