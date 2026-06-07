export interface SensorReading {
    probeId: string;
    fieldId: string;
    timestamp: string;
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    conductivity: number;
    temperature: number;
    moisture: number;
}
export interface AggregatedBatch {
    interval: string;
    readings: SensorReading[];
}
export interface AlertEvent {
    type: 'OFFLINE' | 'THRESHOLD_EXCEED' | 'DATA_ANOMALY';
    probeId: string;
    message: string;
    timestamp: string;
}
export interface ProbeInfo {
    id: string;
    fieldId: string;
    lat: number;
    lng: number;
    lastSeen: string | null;
    latestReading: SensorReading | null;
    online: boolean;
}
export interface FarmFieldFeature {
    type: 'Feature';
    id: string;
    geometry: {
        type: 'Polygon';
        coordinates: [number, number][][];
    };
    properties: {
        name: string;
        crop: string;
        area_hectares: number;
        probe_ids: string[];
    };
}
export interface FarmFieldGeoJSON {
    type: 'FeatureCollection';
    features: FarmFieldFeature[];
}
export interface OnlineStats {
    online: number;
    offline: number;
    total: number;
}
