import { useState, useCallback, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { debounce } from 'lodash-es';
import Uploader from './Uploader';

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

// Theme configuration
const themes = {
  light: {
    background: 'bg-white',
    text: 'text-gray-900',
    button: 'bg-blue-500 hover:bg-blue-600 text-white',
    card: 'bg-gray-50 border-gray-200',
  },
  dark: {
    background: 'bg-gray-900',
    text: 'text-gray-100',
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
    card: 'bg-gray-800 border-gray-700',
  },
  professional: {
    background: 'bg-slate-50',
    text: 'text-slate-800',
    button: 'bg-slate-700 hover:bg-slate-800 text-white',
    card: 'bg-white border-slate-300',
  }
} as const;

type Theme = keyof typeof themes;

export default function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [documentText, setDocumentText] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');

  const handleSend = async () => {
    if (!input.trim()) return;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: input, context: documentText })
      });

      const data = await response.json();
      setMessages(prev => [...prev, `Q: ${input}`, `A: ${data.reply}`]);
      setInput('');
    } catch (error) {
      console.error('Request failed:', error);
      setMessages(prev => [...prev, `Error: ${(error as Error).message}`]);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K - Open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }

      // Cmd/Ctrl + Enter - Submit message
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSend]);

  // Theme variant utilities
  const themeClasses = themes[theme];
  const getVariant = (component: keyof typeof themes.light) =>
    cn(themes[theme][component], {
      'dark:bg-gray-900 dark:text-white': theme === 'dark', // Optional dark mode support
    });

  // Debounced document search (memoized)
  const handleSearch = useCallback(
    debounce(async (query: string) => {
      if (!documentText) return;

      setIsLoadingSearch(true);
      await new Promise(resolve => setTimeout(resolve, 300));

      const results = documentText
        .split('\n')
        .filter(line => line.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);

      setSearchResults(results);
      setIsLoadingSearch(false);
    }, 500),
    [documentText]
  );

  return (
    <div className={cn(
      'min-h-screen p-4 flex flex-col items-center gap-5',
      getVariant('background'),
      getVariant('text')
    )}>
      {/* Theme Switcher */}
      <div className="flex gap-2 self-end">
        {Object.keys(themes).map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t as Theme)}
            className={cn(
              'px-3 py-1 rounded-md text-sm',
              theme === t
                ? getVariant('button')
                : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Search Modal */}
      <Dialog
        open={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md bg-white rounded-lg p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title className="text-lg font-semibold">
                Search Document
              </Dialog.Title>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Search Combobox */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Search document..."
                className="w-full p-2 border rounded-lg"
                onChange={(e) => {
                  setInput(e.target.value);
                  handleSearch(e.target.value);
                }}
                value={input}
              />

              <div className="max-h-60 overflow-y-auto border rounded-lg">
                {isLoadingSearch ? (
                  <div className="p-3 text-gray-500">Searching...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setInput(result);
                        setIsSearchOpen(false);
                      }}
                      className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                    >
                      {result}
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-gray-500">No matches found</div>
                )}
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Main Interface */}
      <div className="w-full max-w-2xl space-y-4">
        <div className="flex gap-4 items-center">
          <Uploader onUpload={setDocumentText} />
          <button
            onClick={() => setIsSearchOpen(true)}
            className={cn(
              'px-4 py-2 rounded-lg transition-colors',
              getVariant('button')
            )}
            disabled={!documentText}
          >
            Search Doc (⌘K)
          </button>
        </div>

        <div className={cn(
          'rounded-lg p-4 shadow-inner',
          getVariant('card'),
          'border'
        )}>
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'p-3 mb-2 rounded-lg',
                i % 2 === 0
                  ? 'bg-white shadow dark:bg-gray-700'
                  : 'bg-blue-50 dark:bg-blue-900'
              )}
            >
              {msg}
            </div>
          ))}
        </div>

        <div className="flex gap-2 w-full">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the document (⌘⏎)"
            className={cn(
              'flex-1 p-2 rounded-lg focus:ring-2 focus:ring-blue-500',
              'border',
              getVariant('background')
            )}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            className={cn(
              'px-4 py-2 rounded-lg transition-colors',
              getVariant('button')
            )}
            disabled={!input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}