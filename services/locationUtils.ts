
/**
 * Calculates the distance between two points on Earth using the Haversine formula.
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Formats a distance in kilometers into a human-readable string.
 * @param km Distance in kilometers
 * @returns Formatted string (e.g., "500 m", "1.2 km", or "Muito perto")
 */
export function formatDistance(km: number): string {
    if (km < 0.05) return 'Muito perto';
    if (km < 1) {
        const meters = Math.round(km * 1000);
        return `${meters} m`;
    }
    return `${km.toFixed(1)} km`;
}

/**
 * Opens the native maps app (Apple Maps on iOS, Google Maps elsewhere) with directions to the destination.
 * @param latitude Destination latitude
 * @param longitude Destination longitude
 * @param addressQuery Fallback address query if coords missing
 */
export function openDirections(latitude?: number, longitude?: number, addressQuery?: string) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    let url = '';

    if (isIOS) {
        // Apple Maps
        if (latitude && longitude) {
            url = `http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`;
        } else {
            url = `http://maps.apple.com/?daddr=${encodeURIComponent(addressQuery || '')}&dirflg=d`;
        }
    } else {
        // Google Maps
        if (latitude && longitude) {
            url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
        } else {
            url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressQuery || '')}&travelmode=driving`;
        }
    }

    window.open(url, '_blank');
}
