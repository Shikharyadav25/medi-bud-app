import { apiClient } from './client';

export type CareType = 'all' | 'hospital' | 'clinic' | 'pharmacy';

export interface HealthcareFacility {
  id: string;
  name: string;
  type: Exclude<CareType, 'all'>;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  phone?: string;
  openingHours?: string;
  emergencyAvailable?: boolean;
  mapUrl: string;
}

interface NearbyFacilityApiResponse {
  id: string;
  name: string;
  type: Exclude<CareType, 'all'>;
  address: string;
  distance_meters: number;
  phone?: string | null;
  opening_hours?: string | null;
  emergency_available?: boolean;
  lat: number;
  lon: number;
  map_url: string;
}

export class CareService {
  public static async getNearbyCare(
    lat: number,
    lng: number,
    type: CareType = 'all',
    radiusMeters = 5000
  ): Promise<HealthcareFacility[]> {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      type,
      radius: String(radiusMeters),
    });
    const facilities = await apiClient<NearbyFacilityApiResponse[]>(
      `/v1/care?${params.toString()}`,
      { method: 'GET' }
    );

    return facilities.map((facility) => ({
      id: facility.id,
      name: facility.name,
      type: facility.type,
      address: facility.address,
      latitude: facility.lat,
      longitude: facility.lon,
      distanceKm: Math.round((facility.distance_meters / 1000) * 10) / 10,
      phone: facility.phone || undefined,
      openingHours: facility.opening_hours || undefined,
      emergencyAvailable: facility.emergency_available,
      mapUrl: facility.map_url,
    }));
  }
}
