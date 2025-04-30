import { useState } from 'react';
import Uploader from './Uploader';

export default function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [documentText, setDocumentText] = useState('');

  const handleSend = async () => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: input,
        context: documentText // Send document context to server
      })
    });

    const data = await response.json();
    setMessages([...messages, `Q: ${input}`, `A: ${data.reply}`]);
    setInput('');
  };

  return (
    <div className='flex flex-col items-center gap-5 w-full max-w-2xl mx-auto p-4'>
      <Uploader onUpload={(text) => setDocumentText(text)} />

      <div className="w-full bg-gray-50 rounded-lg p-4 shadow-inner">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 mb-2 rounded-lg ${i % 2 === 0 ? 'bg-white shadow' : 'bg-blue-50'}`}
          >
            {msg}
          </div>
        ))}
      </div>

      <div className='flex gap-2 w-full'>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the document"
          className='flex-1 p-2 border rounded-lg'
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          onClick={handleSend}
          className='px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'
        >
          Send
        </button>
      </div>
    </div>
  );
}
