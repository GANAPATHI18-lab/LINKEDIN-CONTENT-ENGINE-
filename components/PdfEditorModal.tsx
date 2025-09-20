import React, { useState, useEffect } from 'react';
import { marked } from 'marked';

interface PdfEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent: string;
  topic: string;
  onGenerate: (editedContent: string) => void;
}

const PdfEditorModal: React.FC<PdfEditorModalProps> = ({ isOpen, onClose, initialContent, topic, onGenerate }) => {
  const [markdown, setMarkdown] = useState(initialContent);

  useEffect(() => {
    if (isOpen) {
      setMarkdown(initialContent);
    }
  }, [isOpen, initialContent]);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto' };
  }, [isOpen]);

  if (!isOpen) return null;

  const parsedHtml = marked.parse(markdown) as string;

  return (
    <div 
      className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex flex-col p-4 sm:p-6 lg:p-8"
      aria-modal="true"
      role="dialog"
    >
      <header className="flex-shrink-0 flex items-center justify-between pb-4 border-b border-gray-700 mb-4">
        <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">PDF Editor & Previewer</h2>
            <p className="text-sm text-gray-400 mt-1 truncate max-w-md sm:max-w-lg">Topic: {topic}</p>
        </div>
        <button 
          onClick={onClose} 
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
          aria-label="Close editor"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      <main className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
        {/* Left column: Markdown editor */}
        <div className="flex flex-col">
            <label htmlFor="markdown-editor" className="text-sm font-semibold text-gray-300 mb-2">Markdown Editor</label>
            <textarea
                id="markdown-editor"
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                className="w-full flex-grow bg-gray-900 text-gray-300 p-4 rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-none"
                spellCheck="false"
            />
        </div>

        {/* Right column: Live preview */}
        <div className="flex flex-col">
             <h3 className="text-sm font-semibold text-gray-300 mb-2">Live Preview</h3>
            <div className="prose prose-invert bg-gray-900 p-4 rounded-lg border border-gray-600 overflow-y-auto flex-grow prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: parsedHtml }} />
            </div>
        </div>
      </main>

      <footer className="flex-shrink-0 flex items-center justify-end gap-4 pt-4 mt-4 border-t border-gray-700">
          <button 
            onClick={onClose}
            className="px-6 py-2 text-sm font-semibold text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onGenerate(markdown)}
            className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Generate PDF
          </button>
      </footer>
    </div>
  );
};

export default PdfEditorModal;