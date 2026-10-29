export type AgentState = 'online' | 'processing' | 'idle' | 'speaking' | 'alert';

export type WidgetCategory = 'logistics' | 'finance' | 'infrastructure' | 'system';

export interface WidgetConfig {
  id: string;
  title: string;
  category: WidgetCategory;
  size: 'normal' | 'wide' | 'tall';
  status: 'healthy' | 'warning' | 'alert' | 'standby';
  enabled: boolean;
  order: number;
  description: string;
  refreshIntervalSeconds?: number;
  data: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  status?: 'sending' | 'streaming' | 'complete' | 'error';
}

export interface TruckUnit {
  id: string;
  code: string;
  model: string;
  driver: string;
  origin: string;
  destination: string;
  cargo: string;
  weightTons: number;
  fuelPct: number;
  speedKmh: number;
  status: 'en_ruta' | 'en_descarga' | 'retenido' | 'disponible';
  gpsCoordinates: string;
}

export interface IdempiereAuditData {
  erpStatus: 'online' | 'syncing' | 'offline';
  lastSync: string;
  activePeriod: string;
  reconciledPercentage: number;
  totalJournalsToday: number;
  unreconciledItems: {
    id: string;
    reference: string;
    account: string;
    amountUsd: number;
    anomalyType: string;
    severity: 'low' | 'medium' | 'high';
  }[];
}

export interface NetworkNode {
  id: string;
  name: string;
  region: string;
  ip: string;
  pingMs: number;
  uptimePct: number;
  status: 'healthy' | 'degraded' | 'offline';
}

export interface SystemTelemetry {
  cpuUsage: number;
  ramUsage: number;
  networkLatency: number;
  neuralLoad: number;
  fps: number;
  activeSubroutines: number;
  coordinates: string;
  securityLevel: string;
}
