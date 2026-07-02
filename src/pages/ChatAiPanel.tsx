import React, { useState, useRef, useEffect } from 'react';
import { Send, Brain, Bot, User, Trash2, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

interface ChatAiPanelProps {
  session_id: string;
  columns: string[];
}

interface Message {
  sender: 'user' | 'ai';
  text: string;
  type?: 'text' | 'table' | 'chart';
  tableData?: any[];
  chartImage?: string;
}

const SAMPLE_PROMPTS = [
  "Summarize this dataset",
  "Which column has the most missing values?",
  "Recommend data cleaning steps",
  "Which features are highly correlated?",
  "Which column should be removed?",
  "Give business insights"
];

export const ChatAiPanel: React.FC<ChatAiPanelProps> = ({ session_id, columns }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: "Hello! I am your AI Data Scientist. I can answer statistical questions, audit data quality, or plot graphs. What would you like to explore?",
      type: 'text'
    }
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;
    
    // Add user message
    const userMsg: Message = { sender: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/chat', {
        session_id,
        query: textToSend
      });

      const aiMsg: Message = {
        sender: 'ai',
        text: response.data.answer,
        type: response.data.type,
        tableData: response.data.table_data,
        chartImage: response.data.chart_image
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: "Error querying the AI engine. Please verify the backend service is active.",
        type: 'text'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        sender: 'ai',
        text: "Chat cleared. What can I analyze for you now?",
        type: 'text'
      }
    ]);
  };

  const formatMarkdownText = (text: string) => {
    if (!text) return '';
    return text.split('\n').map((line, i) => {
      let content = line.trim();
      if (!content) return <div key={i} className="h-2" />;
      
      const isBullet = content.startsWith('- ') || content.startsWith('* ');
      if (isBullet) content = content.substring(2);

      const parts = content.split('**');
      const formattedParts = parts.map((part, idx) => {
        if (idx % 2 === 1) return <strong key={idx} className="font-extrabold text-blue-650 dark:text-blue-400">{part}</strong>;
        return part;
      });

      if (isBullet) {
        return (
          <div key={i} className="flex gap-2 text-sm ml-2.5 mb-1.5 leading-relaxed text-slate-700 dark:text-slate-350">
            <span className="text-blue-500 font-bold">•</span>
            <span>{formattedParts}</span>
          </div>
        );
      }

      return (
        <p key={i} className="text-sm leading-relaxed mb-2 text-slate-750 dark:text-slate-350">
          {formattedParts}
        </p>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-slate-100/10 pb-5">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Brain className="w-7 h-7 text-blue-500" />
            AI Data Scientist Panel
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Query your loaded dataset using natural language.
          </p>
        </div>
        <button
          onClick={handleClear}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-all flex items-center gap-1.5 text-xs font-semibold"
          title="Clear Chat history"
        >
          <Trash2 className="w-4 h-4" />
          Clear Chat
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[560px]">
        {/* Chat Window */}
        <div className="lg:col-span-3 glass-panel rounded-3xl p-5 flex flex-col justify-between h-full bg-slate-50/10">
          
          {/* Messages Stream */}
          <div className="flex-grow overflow-y-auto space-y-4 mb-4 pr-2">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div className={`w-8.5 h-8.5 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-200 dark:bg-slate-900 text-blue-500 border border-slate-200/5'
                }`}>
                  {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className={`rounded-2xl p-4 text-sm ${
                  msg.sender === 'user'
                    ? 'bg-blue-650 text-white shadow shadow-blue-500/15'
                    : 'glass-card border border-slate-200/5 text-slate-800 dark:text-slate-200'
                }`}>
                  {/* Text render */}
                  <div className="space-y-1">
                    {msg.sender === 'user' ? <p>{msg.text}</p> : formatMarkdownText(msg.text)}
                  </div>

                  {/* Table render */}
                  {msg.type === 'table' && msg.tableData && msg.tableData.length > 0 && (
                    <div className="overflow-x-auto border border-slate-200/20 rounded-xl my-3 max-w-full">
                      <table className="w-full text-left text-[11px] border-collapse bg-white/5">
                        <thead>
                          <tr className="border-b border-slate-200/20 bg-slate-500/10 text-slate-400 font-bold">
                            {Object.keys(msg.tableData[0]).map(k => (
                              <th key={k} className="px-3 py-2 whitespace-nowrap">{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/10">
                          {msg.tableData.slice(0, 15).map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-500/5">
                              {Object.values(row).map((val: any, cIdx) => (
                                <td key={cIdx} className="px-3 py-1.5 whitespace-nowrap text-slate-350">{val !== null ? String(val) : 'NaN'}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {msg.tableData.length > 15 && (
                        <div className="text-[10px] text-slate-500 italic p-2 text-center border-t border-slate-200/10">
                          Truncated {msg.tableData.length - 15} additional rows...
                        </div>
                      )}
                    </div>
                  )}

                  {/* Chart render */}
                  {msg.type === 'chart' && msg.chartImage && (
                    <div className="mt-3 p-1.5 rounded-xl border border-slate-200/25 bg-white max-w-md">
                      <img src={msg.chartImage} alt="AI Scientist Plot render" className="rounded-lg object-contain w-full" />
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-3 max-w-[80%]">
                <div className="w-8.5 h-8.5 rounded-lg bg-slate-200 dark:bg-slate-900 text-blue-500 border border-slate-200/5 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="glass-card border border-slate-200/5 rounded-2xl p-4 text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  AI Scientist is compiling DataFrame query...
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(query); }}
            className="flex gap-2 pt-3 border-t border-slate-100/10"
          >
            <input
              type="text"
              placeholder="Ask anything (e.g. 'what is the average Age?', 'Which features are highly correlated?')"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-grow px-4 py-3 rounded-2xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="p-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white shadow shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>

        {/* Sidebar suggestions Panel */}
        <div className="glass-panel p-5 rounded-3xl space-y-4 h-full flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              Suggested Queries
            </h3>
            <div className="space-y-2">
              {SAMPLE_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  className="w-full text-left p-3 rounded-xl border border-slate-200/5 bg-slate-500/5 hover:border-blue-500/25 hover:bg-blue-500/5 text-xs text-slate-700 dark:text-slate-350 font-bold transition-all flex justify-between items-center group cursor-pointer"
                >
                  <span className="max-w-[90%] leading-snug">{prompt}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </div>
          
          <div className="p-3 rounded-xl bg-slate-500/5 border border-slate-200/10 text-[10px] text-slate-400 leading-normal">
            💡 <strong>Format questions</strong> by including the exact column names (case-sensitive) to help the parser map variables correctly.
          </div>
        </div>
      </div>
    </div>
  );
};
