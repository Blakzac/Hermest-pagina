import { WidgetConfig } from '../types';

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  {
    id: 'widget-gandolas',
    title: 'Gestión de Gandolas & Carga Pesada',
    category: 'logistics',
    size: 'normal',
    status: 'healthy',
    enabled: true,
    order: 1,
    description: 'Monitoreo satelital GPS, consumo de combustible y estatus de fletes en ruta.',
    refreshIntervalSeconds: 15,
    data: {
      totalUnits: 6,
      activeUnitsCount: 4,
      fuelEfficiencyAvg: '28.4 L/100km',
      units: [
        {
          id: 'trk-104',
          code: 'G-104',
          model: 'Volvo FH16 Globetrotter',
          driver: 'Carlos Mendoza',
          origin: 'Valencia Central',
          destination: 'Puerto Cabello (Muelle 4)',
          cargo: '28 Ton Granos y Trigo',
          weightTons: 28,
          fuelPct: 78,
          speedKmh: 68,
          status: 'en_ruta',
          gpsCoordinates: '10.2982° N, 68.0125° W'
        },
        {
          id: 'trk-208',
          code: 'G-208',
          model: 'Mack Titan Heavy Duty',
          driver: 'Alejandro Rivas',
          origin: 'Cagua Industrial',
          destination: 'Valencia Sur',
          cargo: '32 Ton Bobinas de Acero',
          weightTons: 32,
          fuelPct: 42,
          speedKmh: 0,
          status: 'retenido',
          gpsCoordinates: '10.2441° N, 67.8920° W'
        },
        {
          id: 'trk-315',
          code: 'G-315',
          model: 'Freightliner Cascadia',
          driver: 'Marcos Villegas',
          origin: 'Caracas Distribución',
          destination: 'Maracay Almacenes',
          cargo: '22 Ton Productos Farmacéuticos',
          weightTons: 22,
          fuelPct: 91,
          speedKmh: 82,
          status: 'en_ruta',
          gpsCoordinates: '10.3521° N, 67.3114° W'
        },
        {
          id: 'trk-402',
          code: 'G-402',
          model: 'Scania R500 V8',
          driver: 'Eduardo Peña',
          origin: 'Puerto Cabello',
          destination: 'Barquisimeto',
          cargo: '30 Ton Contenedor Maersk 40ft',
          weightTons: 30,
          fuelPct: 65,
          speedKmh: 0,
          status: 'en_descarga',
          gpsCoordinates: '10.0636° N, 69.3495° W'
        }
      ]
    }
  },
  {
    id: 'widget-idempiere',
    title: 'Auditoría iDempiere ERP',
    category: 'finance',
    size: 'normal',
    status: 'warning',
    enabled: true,
    order: 2,
    description: 'Conciliación bancaria en tiempo real, integridad de asientos contables y discrepancias.',
    refreshIntervalSeconds: 30,
    data: {
      erpStatus: 'online',
      lastSync: 'Hace 45s',
      activePeriod: '2026-Q4 / Periodo 10',
      reconciledPercentage: 94.6,
      totalJournalsToday: 1420,
      unreconciledItems: [
        {
          id: 'unrec-1',
          reference: 'TR-88412-BANCARIBE',
          account: '1.1.10.02 - Banco Nacional Cuenta Operativa',
          amountUsd: 4120.00,
          anomalyType: 'Diferencia en Fecha de Valor vs Pago Proveedor',
          severity: 'medium'
        },
        {
          id: 'unrec-2',
          reference: 'FAC-2026-9931',
          account: '2.1.20.05 - Cuentas por Pagar Fletes',
          amountUsd: 875.50,
          anomalyType: 'Retención de IVA no cruzada',
          severity: 'low'
        }
      ]
    }
  },
  {
    id: 'widget-red',
    title: 'Telemetría & Estado de Red',
    category: 'infrastructure',
    size: 'normal',
    status: 'healthy',
    enabled: true,
    order: 3,
    description: 'Monitoreo de enlaces de datos, latencia de clúster, pérdida de paquetes y firewall.',
    refreshIntervalSeconds: 5,
    data: {
      averageLatencyMs: 24,
      downloadSpeedMbps: 485,
      uploadSpeedMbps: 120,
      packetLossPct: 0.01,
      firewallEventsBlocked: 48,
      nodes: [
        { id: 'node-1', name: 'Nodo Primario Caracas', region: 'CCS-DC1', ip: '192.168.10.1', pingMs: 12, uptimePct: 99.98, status: 'healthy' },
        { id: 'node-2', name: 'Enlace Enrutador Valencia', region: 'VLN-HUB', ip: '192.168.20.1', pingMs: 18, uptimePct: 99.95, status: 'healthy' },
        { id: 'node-3', name: 'Cloud Proxy Edge (US-East)', region: 'IAD-01', ip: '10.0.4.15', pingMs: 46, uptimePct: 99.99, status: 'healthy' },
        { id: 'node-4', name: 'Servidor ERP iDempiere Postgres', region: 'INTERNAL', ip: '10.0.2.88', pingMs: 4, uptimePct: 100.0, status: 'healthy' }
      ]
    }
  },
  {
    id: 'widget-subrutinas',
    title: 'Monitoreo Neural & Subrutinas AURA',
    category: 'system',
    size: 'normal',
    status: 'healthy',
    enabled: true,
    order: 4,
    description: 'Estado de subprocesos autónomos, uso de GPU/TPU y cola de inferencia.',
    refreshIntervalSeconds: 3,
    data: {
      neuralFluxRate: '98.4%',
      tokensSec: 142.8,
      contextUsedTokens: 3840,
      maxContextTokens: 1048576,
      subroutines: [
        { name: 'Daemon Monitoreo Gandolas GPS', status: 'Ejecutando (1000ms loop)' },
        { name: 'Cron Auditoría iDempiere Postgres', status: 'En espera de ciclo (30s)' },
        { name: 'Vocal Audio Synthesis Worker', status: 'Listo' },
        { name: 'Gemini Context Memory Pipeline', status: 'Activo' }
      ]
    }
  }
];
