import React, { useState, useEffect } from 'react';
import { MessageSquare, Settings, Share2, Twitter, Globe } from 'lucide-react';

// Mock interface
interface AlephAPI {
    invoke: (tool: string, args: any) => Promise<any>;
}
declare const window: Window & { aleph: AlephAPI };

export default function SocialMirror() {
  const [activeTab, setActiveTab] = useState<'feed' | 'compose' | 'settings'>('feed');
  const [posts, setPosts] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState('farcaster');
  const [apiKey, setApiKey] = useState('');

  const fetchPosts = () => {
      window.aleph?.invoke('getLatestPosts', { platform: 'all', limit: 20 }).then(res => {
          if (res.posts) setPosts(res.posts);
      });
  };

  useEffect(() => {
      if (activeTab === 'feed') fetchPosts();
  }, [activeTab]);

  const handlePost = async () => {
      await window.aleph?.invoke('postContent', { platform, content });
      setContent('');
      alert('Posted!');
      setActiveTab('feed');
  };

  const handleConfig = async () => {
      await window.aleph?.invoke('configurePlatform', { platform, apiKey });
      alert('Saved configuration');
  };

  return (
    <div className="flex h-full bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-16 border-r border-gray-700 flex flex-col items-center py-4 gap-4">
          <button 
            onClick={() => setActiveTab('feed')}
            className={`p-3 rounded-xl transition ${activeTab === 'feed' ? 'bg-blue-600' : 'hover:bg-gray-800'}`}
          >
              <MessageSquare className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveTab('compose')}
            className={`p-3 rounded-xl transition ${activeTab === 'compose' ? 'bg-green-600' : 'hover:bg-gray-800'}`}
          >
              <Share2 className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`p-3 rounded-xl transition ${activeTab === 'settings' ? 'bg-gray-600' : 'hover:bg-gray-800'}`}
          >
              <Settings className="w-6 h-6" />
          </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'feed' && (
              <div className="max-w-2xl mx-auto space-y-4">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold">Social Feed</h2>
                      <button onClick={fetchPosts} className="text-sm text-gray-400 hover:text-white">Refresh</button>
                  </div>
                  {posts.map(post => (
                      <div key={post.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                          <div className="flex justify-between items-start mb-2">
                              <div className="font-bold text-blue-400">{post.author}</div>
                              <div className="text-xs text-gray-500 uppercase flex items-center gap-1">
                                  {post.platform === 'twitter' ? <Twitter className="w-3 h-3"/> : <Globe className="w-3 h-3"/>}
                                  {post.platform}
                              </div>
                          </div>
                          <p className="text-gray-200">{post.content}</p>
                          <div className="mt-3 text-xs text-gray-500">
                              {new Date(post.timestamp).toLocaleString()}
                          </div>
                      </div>
                  ))}
              </div>
          )}

          {activeTab === 'compose' && (
              <div className="max-w-xl mx-auto">
                  <h2 className="text-2xl font-bold mb-6">Compose</h2>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                      <div className="mb-4">
                          <label className="block text-sm text-gray-400 mb-2">Platform</label>
                          <select 
                            value={platform} 
                            onChange={e => setPlatform(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded p-2"
                          >
                              <option value="farcaster">Farcaster</option>
                              <option value="twitter">Twitter / X</option>
                              <option value="bluesky">BlueSky</option>
                              <option value="lens">Lens</option>
                          </select>
                      </div>
                      <div className="mb-4">
                          <label className="block text-sm text-gray-400 mb-2">Content</label>
                          <textarea 
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            className="w-full h-32 bg-gray-900 border border-gray-600 rounded p-2"
                            placeholder="What's happening?"
                          />
                      </div>
                      <button 
                        onClick={handlePost}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded transition"
                      >
                          Post
                      </button>
                  </div>
              </div>
          )}

          {activeTab === 'settings' && (
              <div className="max-w-xl mx-auto">
                  <h2 className="text-2xl font-bold mb-6">Social Configuration</h2>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-6">
                      <div>
                          <label className="block text-sm text-gray-400 mb-2">Platform</label>
                          <select 
                            value={platform} 
                            onChange={e => setPlatform(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded p-2"
                          >
                              <option value="farcaster">Farcaster</option>
                              <option value="twitter">Twitter / X</option>
                              <option value="lens">Lens</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm text-gray-400 mb-2">API Key / Token</label>
                          <input 
                            type="password"
                            value={apiKey}
                            onChange={e => setApiKey(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded p-2"
                            placeholder="sk_..."
                          />
                      </div>
                      <button 
                        onClick={handleConfig}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
                      >
                          Save Credentials
                      </button>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
}
