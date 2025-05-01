import { useState, useCallback } from 'react';
import { Dialog } from '@headlessui/react';
import { debounce } from 'lodash-es';
import Uploader from './Uploader';

export default function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [documentText, setDocumentText] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);

  // Document search handler
  const handleSearch = useCallback(
    debounce(async (query: string) => {
      if (!documentText) return;

      setIsLoadingSearch(true);
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay

      const results = documentText
        .split('\n')
        .filter(line => line.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);

      setSearchResults(results);
      setIsLoadingSearch(false);
    }, 500),
    [documentText]
  );

  const handleSend = async () => {
    if (!input.trim()) return;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: input,
          context: documentText
        })
      });

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      setMessages(prev => [...prev, `Q: ${input}`, `A: ${data.reply}`]);
      setInput('');
    } catch (error) {
      console.error('Request failed:', error);
      setMessages(prev => [...prev, `Error: ${(error as Error).message}`]);
    }
  };

  return (
    <div className='flex flex-col items-center gap-5 w-full max-w-2xl mx-auto p-4'>
      {/* Document Search Modal */}
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

      {/* Main Chat Interface */}
      <div className="w-full flex gap-4 items-center">
        <Uploader onUpload={setDocumentText} />
        <button
          onClick={() => setIsSearchOpen(true)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          disabled={!documentText}
        >
          Search Doc
        </button>
      </div>

      <div className="w-full bg-gray-50 rounded-lg p-4 shadow-inner">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 mb-2 rounded-lg ${i % 2 === 0 ? 'bg-white shadow' : 'bg-blue-50'
              }`}
          >
            {msg}
          </div>
        ))}
      </div>

      <div className="flex gap-2 w-full">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the document"
          className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          aria-label="Chat input"
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400"
          disabled={!input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}