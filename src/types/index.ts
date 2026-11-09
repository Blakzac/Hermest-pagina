export type AgentState = 'online' | 'processing' | 'idle' | 'speaking' | 'alert';

export type ConnectionState = 'checking' | 'online' | 'offline';

export type HermesTransport = 'http' | 'process' | 'gemini' | 'local' | 'unknown';

export type InputMode = 'text' | 'voice';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  status?: 'sending' | 'streaming' | 'complete' | 'error';
  mode?: InputMode;
}

export interface HermesHealth {
  status: string;
  service: string;
  transport: HermesTransport;
  hermes: {
    configured: boolean;
    httpConfigured: boolean;
    processConfigured: boolean;
  };
  geminiConfigured: boolean;
  model: string;
  uptimeSeconds: number;
  timestamp: string;
}

export interface HermesMeta {
  sessionId?: string;
  transport?: HermesTransport;
  inputMode?: InputMode;
  timestamp?: string;
}
