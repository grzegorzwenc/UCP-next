/** The stock photo the asset library shows for a seeded image (same hash as AssetLibrary's photoFor), for assets uploaded without data. */
export function stockPhoto(id: string) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0; return `/images/assets/photo-${Math.abs(h) % 24}.jpg`; }
