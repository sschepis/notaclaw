import React, { useState, useEffect, useRef } from 'react';

export const activate = (context: any) => {
    console.log('[Voice Interface] Renderer activated');

    const VoicePanel = () => {
        const [isListening, setIsListening] = useState(false);
        const [transcript, setTranscript] = useState('');
        const [lastSpoken, setLastSpoken] = useState('');
        const recognitionRef = useRef<any>(null);

        useEffect(() => {
            // Register skills
            if (context.dsn && context.dsn.registerTool) {
                context.dsn.registerTool({
                    name: 'text_to_speech',
                    description: 'Speak text to the user',
                    executionLocation: 'CLIENT',
                    parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] }
                }, async ({ text }: any) => {
                    speak(text);
                    return { success: true };
                });
            }

            // Init Speech Recognition
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = false;
                recognitionRef.current.lang = 'en-US';

                recognitionRef.current.onresult = (event: any) => {
                    const text = event.results[0][0].transcript;
                    setTranscript(text);
                    setIsListening(false);
                    // Send to chat? context.ipc.send('chat:message', text)?
                    // For now just display
                };

                recognitionRef.current.onerror = (event: any) => {
                    console.error('Speech recognition error', event.error);
                    setIsListening(false);
                };
                
                recognitionRef.current.onend = () => {
                    setIsListening(false);
                };
            }
        }, []);

        const toggleListening = () => {
            if (isListening) {
                recognitionRef.current?.stop();
            } else {
                setTranscript('');
                recognitionRef.current?.start();
                setIsListening(true);
            }
        };

        const speak = (text: string) => {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                window.speechSynthesis.speak(utterance);
                setLastSpoken(text);
            }
        };

        return (
            <div className="h-full flex flex-col p-4 text-white items-center justify-center">
                <div className="bg-white/5 p-8 rounded-full mb-8 relative">
                    {isListening && (
                        <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-50"></div>
                    )}
                    <button 
                        onClick={toggleListening}
                        className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl transition-colors ${
                            isListening ? 'bg-red-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                    >
                        {isListening ? '⏹' : '🎤'}
                    </button>
                </div>

                <div className="w-full max-w-md space-y-4">
                    <div className="bg-black/20 p-4 rounded-lg min-h-[100px]">
                        <h3 className="text-xs text-gray-500 uppercase mb-2">Transcript</h3>
                        <p className="text-lg text-gray-200">{transcript || 'Click mic to speak...'}</p>
                    </div>

                    <div className="bg-black/20 p-4 rounded-lg min-h-[60px]">
                        <h3 className="text-xs text-gray-500 uppercase mb-2">Last Spoken</h3>
                        <p className="text-sm text-blue-300 italic">{lastSpoken || 'Nothing spoken yet.'}</p>
                    </div>
                    
                    <button 
                        onClick={() => speak("Hello, I am listening.")}
                        className="w-full py-2 bg-white/10 hover:bg-white/20 rounded text-sm"
                    >
                        Test TTS
                    </button>
                </div>
            </div>
        );
    };

    const VoiceInterfaceButton = () => {
        const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
        const isActive = activeSidebarView === 'voice-interface';
        
        return (
            <button
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setActiveSidebarView('voice-interface')}
                title="Voice Interface"
            >
                VOC
            </button>
        );
    };

    context.registerComponent('sidebar:nav-item', {
        id: 'voice-interface-nav',
        component: VoiceInterfaceButton
    });

    context.registerComponent('sidebar:view:voice-interface', {
        id: 'voice-interface-panel',
        component: VoicePanel
    });
};
