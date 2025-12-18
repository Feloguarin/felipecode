
import React, { useState, useEffect, useRef } from 'react';
import { GeminiService } from './geminiService';
import { Message, MessageType, ChatSession } from './types';
import { Content } from '@google/genai';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingTool, setPendingTool] = useState<{ call: any, resolve: (val: string) => void } | null>(null);
  
  // Settings
  const [apiKey, setApiKey] = useState<string>(localStorage.getItem('FELIPE_KEY') || '');
  const [bridgeUrl, setBridgeUrl] = useState<string>(localStorage.getItem('FELIPE_BRIDGE') || 'http://localhost:8080');
  const [isSettingsOpen, setIsSettingsOpen] = useState(!localStorage.getItem('FELIPE_KEY'));

  const gemini = useRef(new GeminiService());
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (window as any).FELIPE_API_KEY = apiKey;
    if (apiKey) localStorage.setItem('FELIPE_KEY', apiKey);
    localStorage.setItem('FELIPE_BRIDGE', bridgeUrl);
  }, [apiKey, bridgeUrl]);

  useEffect(() => {
    const savedSessions = localStorage.getItem('FELIPE_SESSIONS');
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed);
      if (parsed.length > 0) setActiveSessionId(parsed[0].id);
    } else {
      createNewSession();
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('FELIPE_SESSIONS', JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, isGenerating]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'SESSION_' + Date.now().toString().slice(-4),
      messages: [],
      createdAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id) {
      setActiveSessionId(filtered.length > 0 ? filtered[0].id : null);
    }
    if (filtered.length === 0) {
      localStorage.removeItem('FELIPE_SESSIONS');
    }
  };

  const executeOnBridge = async (name: string, args: any): Promise<string> => {
    try {
      const response = await fetch(`${bridgeUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: name, args }),
      });
      const data = await response.json();
      return data.output || data.error || "No output from bridge.";
    } catch (err) {
      return `BRIDGE_ERROR: Could not connect to Termux at ${bridgeUrl}. Ensure bridge.js is running.`;
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !activeSessionId || !apiKey) return;
    
    const userMsg: Message = { id: Date.now().toString(), type: MessageType.USER, text: inputValue };
    updateActiveSession(userMsg);
    setInputValue('');
    setIsGenerating(true);

    const activeSession = sessions.find(s => s.id === activeSessionId);
    let history: Content[] = (activeSession?.messages || []).map(m => ({
      role: m.type === MessageType.USER ? 'user' : 'model',
      parts: [{ text: m.text }]
    })).filter(x => x.parts[0].text);

    history.push({ role: 'user', parts: [{ text: userMsg.text }] });

    try {
      let result = await gemini.current.chatWithTools(history.slice(0, -1), userMsg.text);
      let keepGoing = true;

      while (keepGoing) {
        const parts = result.candidates?.[0]?.content?.parts || [];
        const calls = parts.filter(p => p.functionCall);
        const textPart = parts.find(p => p.text);

        if (textPart?.text) {
          updateActiveSession({ id: Date.now().toString(), type: MessageType.AI, text: textPart.text });
        }

        if (calls && calls.length > 0) {
          history.push({ role: 'model', parts });
          const toolOutputs = [];
          for (const callPart of calls) {
            const fc = callPart.functionCall!;
            const output = await new Promise<string>((resolve) => {
              setPendingTool({ call: fc, resolve });
            });
            
            updateActiveSession({
              id: Date.now().toString(),
              type: MessageType.TOOL_LOG,
              text: `> EXECUTING ${fc.name}`,
              toolCalls: [{ id: Date.now().toString(), name: fc.name, args: fc.args, status: 'complete', output }]
            });

            toolOutputs.push({ name: fc.name, output });
          }
          result = await gemini.current.sendToolResults(history, toolOutputs);
          history.push({
            role: 'tool',
            parts: toolOutputs.map(o => ({
              functionResponse: { name: o.name, response: { result: o.output } }
            }))
          });
        } else {
          keepGoing = false;
        }
      }
    } catch (e: any) {
      updateActiveSession({ id: 'err', type: MessageType.SYSTEM, text: "FAIL: " + e.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const updateActiveSession = (msg: Message) => {
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, msg] } : s));
  };

  const activeMessages = sessions.find(s => s.id === activeSessionId)?.messages || [];

  return (
    <div className="flex h-screen bg-[#050505] text-gray-300 font-mono overflow-hidden">
      
      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-6">
          <div className="max-w-md w-full border border-gray-800 p-8 bg-black shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-white uppercase tracking-widest">System Initialization</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Gemini API Key</label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 p-3 text-white text-sm focus:border-white outline-none"
                  placeholder="AIza..."
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Termux Bridge URL</label>
                <input 
                  type="text" 
                  value={bridgeUrl}
                  onChange={(e) => setBridgeUrl(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 p-3 text-white text-sm focus:border-white outline-none"
                  placeholder="http://localhost:8080"
                />
              </div>
            </div>
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="w-full bg-white text-black font-bold py-3 hover:bg-gray-200 transition-colors uppercase text-xs mt-8"
            >
              Start Session
            </button>
          </div>
        </div>
      )}

      {/* Security Gate */}
      {pendingTool && (
        <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="max-w-2xl w-full border-2 border-yellow-600 p-6 bg-[#0a0a05] animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-yellow-500 mb-4 font-bold uppercase tracking-widest">
              <i className="fas fa-shield-halved animate-pulse"></i>
              <h2>Execution Request</h2>
            </div>
            <div className="bg-black p-4 border border-gray-800 mb-6 text-xs overflow-auto max-h-96">
              <pre className="text-green-400 whitespace-pre-wrap">
                {JSON.stringify(pendingTool.call.args, null, 2)}
              </pre>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => { pendingTool.resolve("Denied."); setPendingTool(null); }}
                className="flex-1 border border-red-900 text-red-500 py-3 uppercase text-[10px] font-bold"
              >
                Abort
              </button>
              <button 
                onClick={async () => {
                  const result = await executeOnBridge(pendingTool.call.name, pendingTool.call.args);
                  pendingTool.resolve(result);
                  setPendingTool(null);
                }}
                className="flex-1 bg-yellow-600 text-black py-3 uppercase text-[10px] font-bold"
              >
                Authorize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 flex flex-col hidden md:flex bg-black">
        <div className="p-6 border-b border-gray-800">
          <div className="text-white font-black text-2xl tracking-tighter">FELIPE_CODE</div>
          <div className="text-[9px] text-gray-600 uppercase font-black mt-2">Active Node: Android_Termux</div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <button onClick={createNewSession} className="w-full border border-gray-700 py-2 text-[10px] uppercase font-bold hover:bg-white hover:text-black transition-all">
            New Workspace
          </button>
          <div className="space-y-1">
            {sessions.map(s => (
              <div 
                key={s.id} 
                onClick={() => setActiveSessionId(s.id)} 
                className={`flex items-center justify-between p-2 text-xs cursor-pointer ${s.id === activeSessionId ? 'text-white bg-gray-900' : 'text-gray-600 hover:text-gray-400'}`}
              >
                <span className="truncate">{s.title}</span>
                <i onClick={(e) => deleteSession(s.id, e)} className="fas fa-times hover:text-red-500 p-1"></i>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-gray-800">
           <button onClick={() => setIsSettingsOpen(true)} className="text-[10px] text-gray-500 hover:text-white uppercase font-bold">
             <i className="fas fa-cog mr-2"></i> Settings
           </button>
        </div>
      </aside>

      {/* Main Terminal UI */}
      <main className="flex-1 flex flex-col bg-[#050505]">
        <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 scrollbar-hide">
          {!activeSessionId ? (
            <div className="h-full flex items-center justify-center text-[10px] text-gray-700 uppercase tracking-widest">
              No session active. Initialize node.
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full">
              {activeMessages.map(m => (
                <div key={m.id} className="mb-8">
                  {m.type === MessageType.TOOL_LOG ? (
                    <div className="border-l border-gray-800 ml-2 pl-4 py-2 my-4">
                      {m.toolCalls?.map(tc => (
                        <pre key={tc.id} className="text-[10px] text-gray-500 overflow-x-auto">
                          $ {tc.name} --result:
                          <br/>{tc.output}
                        </pre>
                      ))}
                    </div>
                  ) : (
                    <div className={`${m.type === MessageType.USER ? 'text-right' : ''}`}>
                      <div className="text-[9px] text-gray-600 uppercase font-bold mb-2">
                        {m.type === MessageType.USER ? 'User' : 'Felipe_Code'}
                      </div>
                      <div className={`text-sm leading-relaxed ${m.type === MessageType.USER ? 'text-white' : 'text-gray-300'} whitespace-pre-wrap`}>
                        {m.text}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isGenerating && <div className="text-[10px] text-yellow-600 animate-pulse font-bold uppercase mt-4">Computing logic...</div>}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Console Input */}
        <div className="p-6 border-t border-gray-900 bg-black">
          <div className="max-w-3xl mx-auto flex gap-4 items-center">
            <span className="text-green-500 font-bold text-xs select-none">❯</span>
            <input 
              className="flex-1 bg-transparent border-none outline-none text-white text-sm font-mono"
              placeholder="Input instruction set..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={isGenerating || !apiKey}
              autoComplete="off"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
