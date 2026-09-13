import React, { createContext, useContext, ReactNode } from 'react';
import { useToolStateMachine, ToolName } from '../hooks/useToolStateMachine';

interface ToolContextType {
    activeTool: string | null;
    toolPayload: string | null;
    openTool: (tool: ToolName | string, payload?: string) => void;
    closeTool: () => void;
}

const ToolContext = createContext<ToolContextType | undefined>(undefined);

export const ToolProvider: React.FC<{ children: ReactNode }> = ({ children }: any) => {
    const { activeTool, toolPayload, openTool, closeTool } = useToolStateMachine();

    return (
        <ToolContext.Provider value={{ activeTool, toolPayload, openTool: openTool as any, closeTool }}>
            {children}
        </ToolContext.Provider>
    );
};

export const useTools = () => {
    const context = useContext(ToolContext);
    if (context === undefined) {
        throw new Error('useTools must be used within a ToolProvider');
    }
    return context;
};
