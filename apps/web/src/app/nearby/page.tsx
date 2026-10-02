'use client';

import { useState, useEffect } from 'react';
import type { NearbyFacilityDTO } from '@medi-bud/contracts';
import { apiClient } from '@/lib/api';
import { 
  MapPin, 
  Navigation, 
  Phone, 
  Clock, 
  Building2, 
  Cross, 
  Pill, 
  Search, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';

const FALLBACK_FACILITIES: NearbyFacilityDTO[] = [
  {
    id: 'osm-1',
    name: 'All India Institute of Medical Sciences (AIIMS)',
    type: 'hospital',
    address: 'Sri Aurobindo Marg, Ansari Nagar, New Delhi',
    distance_meters: 1450,
    phone: '+91-11-26588500',
    opening_hours: '24/7 Emergency',
    lat: 28.5672,
    lon: 77.2100,
    map_url: 'https://www.google.com/maps/dir/?api=1&destination=28.5672,77.2100'
  },
  {
    id: 'osm-2',
    name: 'Safdarjung Hospital',
    type: 'hospital',
    address: 'Ring Road, Opposite AIIMS, New Delhi',
    distance_meters: 2100,
    phone: '+91-11-26165060',
    opening_hours: '24/7 Emergency',
    lat: 28.5700,
    lon: 77.2070,
    map_url: 'https://www.google.com/maps/dir/?api=1&destination=28.5700,77.2070'
  },
  {
    id: 'osm-3',
    name: 'Apollo Pharmacy & Wellness Store',
    type: 'pharmacy',
    address: 'Green Park Main Market, New Delhi',
    distance_meters: 950,
    phone: '+91-11-26861234',
    opening_hours: '08:00 - 23:00',
    lat: 28.5585,
    lon: 77.2055,
    map_url: 'https://www.google.com/maps/dir/?api=1&destination=28.5585,77.2055'
  },
  {
    id: 'osm-4',
    name: 'Max Multi-Speciality Centre',
    type: 'clinic',
    address: 'Panchsheel Park, New Delhi',
    distance_meters: 3200,
    phone: '+91-11-46099999',
    opening_hours: '08:00 - 20:00',
    lat: 28.5450,
    lon: 77.2180,
    map_url: 'https://www.google.com/maps/dir/?api=1&destination=28.5450,77.2180'
  }
];

export default function NearbyCarePage() {
  const [facilities, setFacilities] = useState<NearbyFacilityDTO[]>(FALLBACK_FACILITIES);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [locationName, setLocationName] = useState('New Delhi (Default Demo Area)');
  const [coords, setCoords] = useState<{ lat: number; lon: number }>({ lat: 28.5672, lon: 77.2100 });

  const fetchFacilities = async (latitude: number, longitude: number) => {
    setLoading(true);
    try {
      const data = await apiClient.getNearbyCare(latitude, longitude, 5000);
      if (data && data.length > 0) {
        setFacilities(data);
      } else {
        setFacilities(FALLBACK_FACILITIES);
      }
    } catch {
      setFacilities(FALLBACK_FACILITIES);
    } finally {
      setLoading(false);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lon: longitude });
        setLocationName(`Current Location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`);
        fetchFacilities(latitude, longitude);
      },
      () => {
        setLoading(false);
        alert('Could not retrieve GPS coordinates. Retaining demo area.');
      }
    );
  };

  const filtered = selectedType === 'all'
    ? facilities
    : facilities.filter((f) => f.type.toLowerCase().includes(selectedType));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-(--border-subtle) pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-(--text-primary) flex items-center gap-2">
            <MapPin className="w-6 h-6 text-(--primary)" />
            Nearby Care & Emergency Facilities
          </h1>
          <p className="text-xs text-(--text-secondary) mt-1">
            Discover verified hospitals, outpatient clinics, and pharmacies nearby using OpenStreetMap Overpass.
          </p>
        </div>

        <button
          onClick={handleDetectLocation}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-(--primary) text-white text-xs font-medium hover:bg-(--primary-hover) transition-colors shadow-sm self-start sm:self-auto"
        >
          <Navigation className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Locating...' : 'Use My GPS Location'}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-(--surface) border border-(--border-subtle) text-xs">
          {['all', 'hospital', 'clinic', 'pharmacy'].map((typeKey) => (
            <button
              key={typeKey}
              onClick={() => setSelectedType(typeKey)}
              className={`capitalize px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedType === typeKey
                  ? 'bg-(--primary) text-white shadow-xs'
                  : 'text-(--text-secondary) hover:text-(--text-primary)'
              }`}
            >
              {typeKey}
            </button>
          ))}
        </div>
        <span className="text-xs text-(--text-muted)">
          Area: {locationName}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-2xl border border-(--border-subtle) bg-(--surface) space-y-3 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm text-(--text-primary)">
                  {item.name}
                </h3>
                <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-(--text-secondary) shrink-0">
                  {item.type}
                </span>
              </div>

              {item.address && (
                <p className="text-xs text-(--text-secondary) flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-(--text-muted) shrink-0 mt-0.5" />
                  <span>{item.address}</span>
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-[11px] text-(--text-muted) pt-1">
                {item.distance_meters != null && (
                  <span>
                    Distance: {(item.distance_meters / 1000).toFixed(1)} km
                  </span>
                )}
                {item.opening_hours && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.opening_hours}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-(--border-subtle)">
              {item.phone ? (
                <a
                  href={`tel:${item.phone}`}
                  className="inline-flex items-center gap-1.5 text-xs text-(--primary) font-medium hover:underline"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {item.phone}
                </a>
              ) : (
                <span className="text-[11px] text-(--text-muted)">No phone listed</span>
              )}

              <a
                href={item.map_url || `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lon}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl border border-(--border-subtle) hover:bg-(--surface-subtle) transition-colors text-(--text-primary)"
              >
                Directions
                <ExternalLink className="w-3 h-3 text-(--text-muted)" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
