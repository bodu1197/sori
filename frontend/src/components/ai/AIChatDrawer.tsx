import { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, Sparkles } from 'lucide-react';

const API_BASE_URL = 'https://musicgram-api-89748215794.us-central1.run.app';

export function AIChatDrawer({ artistName, onClose }: { artistName: string; onClose: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [persona, setPersona] = useState<any>(null);
  const [browseId, setBrowseId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Provision AI (or fetch existing persona)
  useEffect(() => {
    async function initAI() {
      if (!artistName) return;
      try {
        setLoading(true);
        // Request to provision/get persona
        const res = await fetch(`${API_BASE_URL}/api/provision/artist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artistName }),
        });

        if (res.ok) {
          const data = await res.json();
          setPersona(data.persona);
          setBrowseId(data.browseId);
          // Initial greeting from persona
          setMessages([
            {
              role: 'model',
              content: data.persona.greeting || `Hi! I'm ${artistName}. Let's chat!`,
            },
          ]);
        } else {
          throw new Error('Failed to connect');
        }
      } catch (err) {
        console.error(err);
        setMessages([
          { role: 'model', content: "Sorry, I'm taking a break right now. Try again later!" },
        ]);
      } finally {
        setLoading(false);
      }
    }
    initAI();
  }, [artistName]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || sending || !persona) return;

    const userMsg = input.trim();
    setInput('');
    setSending(true);

    // Optimistic Update
    const newHistory = [...messages, { role: 'user', content: userMsg }];
    setMessages(newHistory);

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/artist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona,
          browseId,
          artistName,
          history: newHistory,
          message: userMsg,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: 'model', content: data.reply }]);
      } else {
        throw new Error('API Error');
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'model', content: '(Connection Error...)' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    // Simplified container: Matches parent width (max 480px) automatically
    <div className="absolute inset-x-0 bottom-0 h-[75vh] bg-gray-900 rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300 z-[60] border-t border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900 rounded-t-3xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="text-white font-bold text-lg">
                {artistName ? artistName[0].toUpperCase() : 'A'}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-gray-900" />
          </div>
          <div>
            <h3 className="text-white font-bold flex items-center gap-2 text-sm">
              {artistName}
              <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500 text-[8px] text-white">
                ✓
              </span>
            </h3>
            <p className="text-gray-400 text-xs text-left flex items-center gap-1">
              {loading ? 'Connecting...' : 'Active now'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full transition"
        >
          <X size={20} />
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900/50">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500 animate-pulse">
            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
              <MessageSquare size={24} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium">{artistName} is joining...</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-gray-800 text-gray-100 rounded-bl-none border border-gray-700'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-none border border-gray-700">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75" />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-gray-900 border-t border-gray-800 pb-8 md:pb-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Message ${artistName}...`}
            className="flex-1 bg-gray-800 text-white rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-gray-500 border border-gray-700"
            disabled={loading}
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition transform active:scale-95 shadow-lg shadow-blue-900/20"
          >
            <Send size={20} className={sending ? 'animate-pulse' : ''} />
          </button>
        </div>
      </div>
    </div>
  );
}
