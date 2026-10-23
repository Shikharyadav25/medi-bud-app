"use client";

import { useState, useEffect } from "react";
import type { NearbyFacilityDTO } from "@medi-bud/contracts";
import { apiClient } from "@/lib/api";
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
  ExternalLink,
} from "lucide-react";

export default function NearbyCarePage() {
  const [facilities, setFacilities] = useState<NearbyFacilityDTO[]>([]);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [locationName, setLocationName] = useState("Choose your location");
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [searchLatitude, setSearchLatitude] = useState("");
  const [areaQuery, setAreaQuery] = useState("");
  const [searchLongitude, setSearchLongitude] = useState("");
  const [coordinates, setCoordinates] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  const fetchFacilities = async (
    latitude: number,
    longitude: number,
    type = selectedType,
  ) => {
    setCoordinates({ lat: latitude, lon: longitude });
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const data = await apiClient.getNearbyCare(
        latitude,
        longitude,
        5000,
        type,
      );
      setFacilities(data || []);
    } catch {
      setFacilities([]);
      setError(
        "The OpenStreetMap directory could not respond. Retry, or use the external map search below. No sample facilities have been substituted.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDetectLocation = () => {
    setError("");
    setFacilities([]);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocationName(
          `Current Location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`,
        );
        fetchFacilities(latitude, longitude);
      },
      () => {
        setLoading(false);
        setError(
          "Location access was declined or unavailable. Enable browser location access and try again.",
        );
      },
      { timeout: 15000, maximumAge: 60000 },
    );
  };

  const filtered =
    selectedType === "all"
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
            Find hospitals, clinics, and pharmacies listed on OpenStreetMap.
            Call ahead to confirm details.
          </p>
        </div>

        <button
          onClick={handleDetectLocation}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-(--primary) text-white text-xs font-medium hover:bg-(--primary-hover) transition-colors shadow-sm self-start sm:self-auto"
        >
          <Navigation
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          {loading ? "Locating..." : "Use My GPS Location"}
        </button>
      </div>

      <section className="panel space-y-3">
        <h2 className="font-semibold">Search without GPS</h2>
        <p className="text-sm">
          Some browsers cannot provide location. Enter coordinates, or choose
          the public demonstration area. Search coordinates are sent to the
          OpenStreetMap directory provider, not saved to your profile.
        </p>
        <form
          className="flex flex-wrap gap-3 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const lat = Number(searchLatitude),
              lon = Number(searchLongitude);
            if (
              !searchLatitude.trim() ||
              !searchLongitude.trim() ||
              !Number.isFinite(lat) ||
              !Number.isFinite(lon) ||
              Math.abs(lat) > 90 ||
              Math.abs(lon) > 180
            ) {
              setError("Enter valid latitude and longitude.");
              return;
            }
            setLocationName(
              `Chosen area (${lat.toFixed(3)}, ${lon.toFixed(3)})`,
            );
            void fetchFacilities(lat, lon);
          }}
        >
          <label>
            Latitude
            <input
              aria-label="Search latitude"
              required
              type="number"
              min="-90"
              max="90"
              step="any"
              value={searchLatitude}
              onChange={(e) => setSearchLatitude(e.target.value)}
              className="block border rounded-lg px-3 w-36"
            />
          </label>
          <label>
            Longitude
            <input
              aria-label="Search longitude"
              required
              type="number"
              min="-180"
              max="180"
              step="any"
              value={searchLongitude}
              onChange={(e) => setSearchLongitude(e.target.value)}
              className="block border rounded-lg px-3 w-36"
            />
          </label>
          <button className="primary-button" disabled={loading}>
            Search selected area
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={loading}
            onClick={() => {
              setLocationName(
                "Public demo area: central New Delhi (not your location)",
              );
              setSearchLatitude("28.6139");
              setSearchLongitude("77.2090");
              void fetchFacilities(28.6139, 77.209);
            }}
          >
            Try public demo area
          </button>
        </form>
        {coordinates && (
          <a
            target="_blank"
            rel="noopener noreferrer"
            className="text-link"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedType === "all" ? "healthcare" : selectedType} near ${coordinates.lat},${coordinates.lon}`)}`}
          >
            Open external map search (shares selected coordinates with Google
            Maps)
          </a>
        )}
        <label className="block text-sm">
          Or search a city/area on an external map
          <input
            aria-label="City or area for external map search"
            value={areaQuery}
            maxLength={150}
            onChange={(e) => setAreaQuery(e.target.value)}
            placeholder="For example, New Delhi"
            className="block border rounded-xl px-3 w-full"
          />
        </label>
        {areaQuery.trim() && (
          <a
            className="text-link"
            target="_blank"
            rel="noopener noreferrer"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedType === "all" ? "healthcare" : selectedType} in ${areaQuery.trim()}`)}`}
          >
            Search this area on Google Maps (shares the entered area with
            Google)
          </a>
        )}
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-(--surface) border border-(--border-subtle) text-xs">
          {["all", "hospital", "clinic", "pharmacy"].map((typeKey) => (
            <button
              key={typeKey}
              disabled={loading}
              onClick={() => {
                setSelectedType(typeKey);
                if (coordinates)
                  void fetchFacilities(
                    coordinates.lat,
                    coordinates.lon,
                    typeKey,
                  );
              }}
              className={`capitalize px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedType === typeKey
                  ? "bg-(--primary) text-white shadow-xs"
                  : "text-(--text-secondary) hover:text-(--text-primary)"
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

      {error && (
        <p role="alert" className="notice error-notice">
          {error}
        </p>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state">
          {searched
            ? "No matching facilities were returned. Try a different category."
            : "Use your location to find care nearby. Your location is shared with the map search provider for this search."}
        </div>
      )}
      {loading && (
        <p role="status">
          Searching the directory… This may take up to 20 seconds.
        </p>
      )}
      <p className="text-xs text-(--text-muted)">
        Data © OpenStreetMap contributors · Listings may be incomplete. In an
        emergency, contact your local emergency service.
      </p>
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
                <span className="text-[11px] text-(--text-muted)">
                  No phone listed
                </span>
              )}

              <a
                href={
                  item.map_url ||
                  `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lon}`
                }
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
