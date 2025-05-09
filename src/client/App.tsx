import { useState, useCallback, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { debounce } from 'lodash-es';
import Uploader from './Uploader';
import Toolbar from './components/Toolbar';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as math from 'mathjs';
import { DropdownMenu, Button } from '@radix-ui/themes';

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

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

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface ChatCache {
  [key: string]: {
    reply: string;
    tokens: TokenUsage;
    timestamp: number;
  };
}

const TOKEN_COST = {
  input: 0.0015 / 1000,
  output: 0.002 / 1000
};

// IndexedDB Operations
const initDB = async (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ChatMemory', 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('conversations')) {
        db.createObjectStore('conversations', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const storeConversation = async (messages: string[]) => {
  try {
    const db = await initDB();
    const tx = db.transaction('conversations', 'readwrite');
    tx.objectStore('conversations').put({ id: 'current', messages });
  } catch (error) {
    console.error('Storage error:', error);
  }
};

const loadConversation = async (): Promise<string[]> => {
  try {
    const db = await initDB();
    const tx = db.transaction('conversations', 'readonly');
    const request = tx.objectStore('conversations').get('current');
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result?.messages || []);
      request.onerror = () => resolve([]);
    });
  } catch (error) {
    return [];
  }
};

export default function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [documentText, setDocumentText] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  const [isInitializing, setIsInitializing] = useState(true);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0
  });
  const [totalCost, setTotalCost] = useState<number>(0);
  const [cacheEnabled, setCacheEnabled] = useState<boolean>(true);

  useEffect(() => {
    const loadHistory = async () => {
      const savedMessages = await loadConversation();
      setMessages(savedMessages);
      setIsInitializing(false);
    };
    loadHistory();
  }, []);

  useEffect(() => {
    if (!isInitializing) {
      storeConversation(messages);
    }
  }, [messages, isInitializing]);

  const getContext = () => {
    const last3QAPairs = messages.slice(-6).join('\n');
    return `Document Context:\n${documentText}\n\nChat History:\n${last3QAPairs}`;
  };

  const getCacheKey = useCallback(() => {
    return btoa(JSON.stringify({
      question: input,
      context: documentText
    }));
  }, [input, documentText]);

  const checkCache = (): string | null => {
    if (!cacheEnabled) return null;
    const cache = JSON.parse(localStorage.getItem('chatCache') || '{}') as ChatCache;
    const entry = cache[getCacheKey()];
    return entry?.reply || null;
  };

  const updateCache = (reply: string, tokens: TokenUsage) => {
    const cache = JSON.parse(localStorage.getItem('chatCache') || '{}') as ChatCache;
    cache[getCacheKey()] = {
      reply,
      tokens,
      timestamp: Date.now()
    };
    localStorage.setItem('chatCache', JSON.stringify(cache));
  };

  const clearCache = () => {
    localStorage.removeItem('chatCache');
    setTokenUsage({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
    setTotalCost(0);
  };

  const handleWeatherQuery = async (city?: string) => {
    const cityName = city || prompt("Enter city name:");
    if (!cityName) return;

    try {
      setMessages(prev => [...prev, `System: Fetching weather for ${cityName}`]);

      const response = await fetch(`/api/weather?city=${encodeURIComponent(cityName)}`);
      if (!response.ok) throw new Error('Weather API failed');

      const data = await response.json();
      setMessages(prev => [
        ...prev,
        `Weather: ${data.temp}°C, ${data.description}`,
        `Details: Humidity ${data.humidity}%, Wind ${data.wind} m/s`
      ]);
    } catch (error) {
      setMessages(prev => [...prev, `Error: Failed to get weather data`]);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const mathPattern = /(\d+[\+\-\*\/]\d+)/;
    const mathMatch = input.match(mathPattern);
    if (mathMatch) {
      try {
        const result = math.evaluate(mathMatch[0]);
        setMessages(prev => [...prev, `Q: ${input}`, `System: ${mathMatch[0]} = ${result}`]);
        setInput('');
        return;
      } catch (error) {
        setMessages(prev => [...prev, `Error: Invalid math expression`]);
        setInput('');
        return;
      }
    }

    const weatherMatch = input.match(/weather (?:in|for) ([\w\s]+)/i);
    if (weatherMatch) {
      handleWeatherQuery(weatherMatch[1]);
      setInput('');
      return;
    }

    const cachedReply = checkCache();
    if (cachedReply) {
      setMessages(prev => [...prev, `Q: ${input}`, `A: (Cached) ${cachedReply}`]);
      setInput('');
      return;
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: input,
          context: getContext()
        })
      });

      const data = await response.json();

      setTokenUsage(prev => ({
        promptTokens: prev.promptTokens + (data.tokens.promptTokens || 0),
        completionTokens: prev.completionTokens + (data.tokens.completionTokens || 0),
        totalTokens: prev.totalTokens + (data.tokens.totalTokens || 0)
      }));

      setTotalCost(prev => prev +
        (data.tokens.promptTokens || 0) * TOKEN_COST.input +
        (data.tokens.completionTokens || 0) * TOKEN_COST.output
      );

      if (cacheEnabled) {
        updateCache(data.reply, data.tokens);
      }

      setMessages(prev => [...prev, `Q: ${input}`, `A: ${data.reply}`]);
      setInput('');
    } catch (error) {
      console.error('Request failed:', error);
      setMessages(prev => [...prev, `Error: ${(error as Error).message}`]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSend]);

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

  const getVariant = (component: keyof typeof themes.light) =>
    cn(themes[theme][component], {
      'dark:bg-gray-900 dark:text-white': theme === 'dark',
    });

  const handleClearHistory = async () => {
    setMessages([]);
    try {
      const db = await initDB();
      const tx = db.transaction('conversations', 'readwrite');
      tx.objectStore('conversations').delete('current');
    } catch (error) {
      console.error('Clear history failed:', error);
    }
  };

  return (
    <div className={cn(
      'min-h-screen p-4 flex flex-col items-center gap-5',
      getVariant('background'),
      getVariant('text')
    )}>
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

      <Dialog
        open={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className={cn(
            'w-full max-w-md rounded-lg p-6 shadow-xl',
            getVariant('card'),
            'border'
          )}>
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

      <div className="w-full max-w-2xl space-y-4">
        <div className={cn(
          'p-4 rounded-lg shadow',
          getVariant('card'),
          'border flex flex-col gap-3'
        )}>
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Usage Dashboard</h3>
            <div className="flex gap-2">
              <button
                onClick={clearCache}
                className={cn(
                  'px-3 py-1 text-sm rounded-md',
                  getVariant('button')
                )}
              >
                Clear Cache
              </button>
              <button
                onClick={() => setCacheEnabled(!cacheEnabled)}
                className={cn(
                  'px-3 py-1 text-sm rounded-md',
                  cacheEnabled ? getVariant('button') : 'bg-gray-200'
                )}
              >
                Cache: {cacheEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm">Total Tokens</p>
              <p className="text-xl font-mono">
                {tokenUsage.totalTokens.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm">Estimated Cost</p>
              <p className="text-xl font-mono">
                ${totalCost.toFixed(4)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Input Tokens:</span>
              <span className="ml-2">
                {tokenUsage.promptTokens.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Output Tokens:</span>
              <span className="ml-2">
                {tokenUsage.completionTokens.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <Uploader onUpload={setDocumentText} />
          <Toolbar
            onToolSelect={(result) => {
              setMessages(prev => [...prev, `System: ${result}`]);
            }}
            onClearHistory={handleClearHistory}
            onWeatherQuery={handleWeatherQuery}
          />
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
                  : 'bg-blue-50 dark:bg-blue-900',
                msg.startsWith('Weather:') && 'bg-green-50 dark:bg-green-900',
                msg.startsWith('Details:') && 'bg-green-100 dark:bg-green-800',
                msg.startsWith('A: (Cached)') && 'bg-yellow-50 dark:bg-yellow-900'
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