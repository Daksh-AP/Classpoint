import { useState, useCallback } from 'react';

export type ToolName = 
  | 'resourceHub' 
  | 'whiteboard' 
  | 'browser' 
  | 'imageViewer' 
  | 'pdfViewer' 
  | 'videoViewer' 
  | 'attendanceLogger' 
  | 'timer'
  | null;

export function useToolStateMachine() {
  const [activeTool, setActiveTool] = useState<ToolName>(null);
  const [toolPayload, setToolPayload] = useState<any>(null);

  const openTool = useCallback((toolName: ToolName, payload: any| null) => {
    setActiveTool(toolName);
    setToolPayload(payload);
  }, []);

  const closeTool = useCallback(() => {
    setActiveTool(null);
    setToolPayload(null);
  }, []);

  return {
    activeTool,
    toolPayload,
    openTool,
    closeTool
  };
}
