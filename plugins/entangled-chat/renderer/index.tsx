import React, { useState, useEffect } from 'react';

// Types
interface Peer {
  id: string;
  topics: string[];
  status: 'connected' | 'disconnected';
  latency: number;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  topics: string[];
  timestamp: number;
}

export default function EntangledChat() {
  // State
  const [localTopics, setLocalTopics] = useState<string[]>(['general', 'physics']);
  const [peers, setPeers] = useState<Peer[]>([
      { id: 'node_alpha', topics: ['physics', 'quantum'], status: 'connected', latency: 45 },
      { id: 'node_beta', topics: ['ai', 'general'], status: 'connected', latency: 12 },
      { id: 'node_gamma', topics: ['crypto'], status: 'disconnected', latency: 0 }
  ]);
  const [messages, setMessages] = useState<Message[]>([
      { id: '1', sender: 'node_alpha', content: 'Phase shift detected in sector 7.', topics: ['physics'], timestamp: Date.now() - 60000 },
      { id: '2', sender: 'node_beta', content: 'Acknowledged. Adjusting frequency.', topics: ['general'], timestamp: Date.now() - 30000 }
  ]);
  const [input, setInput] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('general');

  const handleSend = () => {
      if (!input.trim()) return;
      
      const newMessage: Message = {
          id: Date.now().toString(),
          sender: 'Me',
          content: input,
          topics: [selectedTopic],
          timestamp: Date.now()
      };
      
      setMessages([...messages, newMessage]);
      setInput('');
  };

  const toggleTopic = (topic: string) => {
      if (localTopics.includes(topic)) {
          setLocalTopics(localTopics.filter(t => t !== topic));
      } else {
          setLocalTopics([...localTopics, topic]);
      }
  };

  const availableTopics = ['general', 'physics', 'quantum', 'ai', 'crypto', 'privacy'];

  return (
    <div className="flex h-full bg-white text-gray-900 font-sans">
      {/* Sidebar: Topics & Settings */}
      <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col p-4">
        <h2 className="font-bold text-lg mb-4 text-gray-700">Subscriptions</h2>
        <div className="space-y-2 mb-8">
            {availableTopics.map(topic => (
                <label key={topic} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                    <input 
                        type="checkbox" 
                        checked={localTopics.includes(topic)}
                        onChange={() => toggleTopic(topic)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm capitalize">{topic}</span>
                </label>
            ))}
        </div>
        
        <h2 className="font-bold text-lg mb-4 text-gray-700">Network Status</h2>
        <div className="text-sm space-y-2">
            <div className="flex justify-between">
                <span className="text-gray-500">Peers Online:</span>
                <span className="font-mono">2</span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-500">Avg Latency:</span>
                <span className="font-mono">28ms</span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-500">Protocol:</span>
                <span className="font-mono text-green-600">Entangled/v1</span>
            </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="h-14 border-b border-gray-200 flex items-center px-4 justify-between bg-white">
            <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-800">Broadcast Channel</span>
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    Topic: {selectedTopic}
                </span>
            </div>
            <select 
                value={selectedTopic} 
                onChange={e => setSelectedTopic(e.target.value)}
                className="text-sm border border-gray-300 rounded p-1"
            >
                {localTopics.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(msg => (
                <div key={msg.id} className={`flex flex-col ${msg.sender === 'Me' ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-bold text-xs text-gray-700">{msg.sender}</span>
                        <span className="text-xs text-gray-400">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className={`max-w-[70%] px-4 py-2 rounded-lg text-sm ${
                        msg.sender === 'Me' 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}>
                        {msg.content}
                    </div>
                    <div className="flex gap-1 mt-1">
                        {msg.topics.map(t => (
                            <span key={t} className="text-[10px] text-gray-400 bg-gray-50 px-1 rounded border border-gray-100">#{t}</span>
                        ))}
                    </div>
                </div>
            ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-2">
                <input 
                    className="flex-1 border border-gray-300 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder={`Message #${selectedTopic}...`}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
                <button 
                    onClick={handleSend}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium text-sm transition-colors"
                >
                    Send
                </button>
            </div>
        </div>
      </div>

      {/* Right Sidebar: Active Peers */}
      <div className="w-64 border-l border-gray-200 bg-gray-50 p-4 flex flex-col">
        <h2 className="font-bold text-lg mb-4 text-gray-700">Active Peers</h2>
        <div className="flex-1 overflow-y-auto space-y-2">
            {peers.map(peer => (
                <div key={peer.id} className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-sm text-gray-800">{peer.id}</span>
                        <div className={`w-2 h-2 rounded-full ${peer.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">{peer.latency}ms latency</div>
                    <div className="flex flex-wrap gap-1">
                        {peer.topics.map(t => (
                            <span key={t} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded border border-gray-200">
                                {t}
                            </span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
