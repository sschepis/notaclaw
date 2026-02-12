import React from 'react';
import { InputDeck } from '../ui/InputDeck';
import { useAppStore } from '../../store/useAppStore';

export const BottomPanelChatTab: React.FC = () => {
    const { triggerScrollToBottom } = useAppStore();

    return (
        <div className="h-full w-full flex flex-col bg-background relative">
             {/* Background Grid Pattern */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(hsl(var(--muted-foreground)) 1px, transparent 1px)',
                    backgroundSize: '30px 30px'
                }}
            />
            
            {/* 
                We remove overflow-hidden here to allow CommandSuggestions (which pop up)
                to potentially be visible if they extend beyond the container, 
                though FlexLayout parent might still clip them.
                
                Ideally CommandSuggestions should use a Portal, but for now we try to minimize clipping.
            */}
            <div className="flex-1 relative z-10 p-2 flex flex-col justify-start">
                <div className="w-full h-full">
                    <InputDeck onMessageSent={() => triggerScrollToBottom()} />
                </div>
            </div>
        </div>
    );
};
