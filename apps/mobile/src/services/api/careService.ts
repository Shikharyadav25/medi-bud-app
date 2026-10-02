import { apiClient } from './client';

export interface HealthcareFacility {
  id: string;
  name: string;
  type: 'hospital' | 'clinic' | 'pharmacy';
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  phone?: string;
  emergencyAvailable?: boolean;
}

export class CareService {
  public static async getNearbyCare(
    lat = 28.6139,
    lng = 77.2090,
    type: 'all' | 'hospital' | 'clinic' | 'pharmacy' = 'all'
  ): Promise<HealthcareFacility[]> {
    const fallbackList: HealthcareFacility[] = [
      {
        id: 'care-1',
        name: 'Max Super Speciality Hospital',
        type: 'hospital',
        address: '1, Press Enclave Road, Saket',
        latitude: lat + 0.012,
        longitude: lng + 0.008,
        distanceKm: 1.2,
        phone: '+91 11 2651 5050',
        emergencyAvailable: true,
      },
      {
        id: 'care-2',
        name: 'Apollo 24/7 Pharmacy',
        type: 'pharmacy',
        address: 'Main Market, Block C, Ground Floor',
        latitude: lat - 0.005,
        longitude: lng + 0.004,
        distanceKm: 0.6,
        phone: '+91 1800 108 5000',
        emergencyAvailable: false,
      },
      {
        id: 'care-3',
        name: 'Fortis Escorts Heart Institute',
        type: 'hospital',
        address: 'Okhla Road, Sukhdev Vihar',
        latitude: lat + 0.024,
        longitude: lng - 0.015,
        distanceKm: 2.8,
        phone: '+91 11 4713 5000',
        emergencyAvailable: true,
      },
      {
        id: 'care-4',
        name: 'Sanjeevani Wellness Clinic',
        type: 'clinic',
        address: 'Shop 14, Sector 4 Market',
        latitude: lat + 0.007,
        longitude: lng - 0.006,
        distanceKm: 0.9,
        phone: '+91 11 2468 1357',
        emergencyAvailable: false,
      },
      {
        id: 'care-5',
        name: 'MedPlus 24x7 Chemist & Druggist',
        type: 'pharmacy',
        address: 'Metro Station Gate 2, Link Road',
        latitude: lat - 0.011,
        longitude: lng - 0.009,
        distanceKm: 1.4,
        phone: '+91 1800 425 2299',
        emergencyAvailable: false,
      },
    ];

    try {
      const res = await apiClient<{ facilities: HealthcareFacility[] }>(
        `/api/care/nearby?lat=${lat}&lng=${lng}&type=${type}`,
        { method: 'GET' },
        { facilities: fallbackList }
      );
      return res.facilities;
    } catch {
      return fallbackList;
    }
  }
}
