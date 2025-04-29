import { useState } from 'react';

export default function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<string[]>([]);

  const handleSend = async () => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: input })
    });
    const data = await response.json();
    setMessages([...messages, `Q: ${input}`, `A: ${data.reply}`]);
    setInput('');
  };

  return (
    <div className='flex flex-col items-center gap-5 w-full'>
      <div className="flex flex-col items-center gap-5 p-10">
        {messages.map((msg, i) => <div key={i}>{msg}</div>)}
      </div>
      <div className='flex flex-row w-full justify-content items-center'>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything"
          className='w-[80%] m-auto'
        />
        <button
          className='p-2'
          onClick={handleSend}
        >
          Send
        </button>
      </div>
    </div>
  );
}