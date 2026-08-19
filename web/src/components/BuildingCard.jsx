import { Link } from 'react-router-dom';
import { buildingImageUrl } from '../api.js';

export default function BuildingCard({ building, onDelete, canDelete }) {
  // Prefer an uploaded photo (stored inline as a data URL); fall back to a
  // filename served from the backend's Images folder.
  const photo = building.imageData || buildingImageUrl(building.image);
  return (
    <div className="building-card">
      {photo && <img className="building-card-photo" src={photo} alt={building.name} />}
      <div className="building-card-code">{building.code}</div>
      <h3>{building.name}</h3>
      <p className="muted">{building.address || 'No address on file'}</p>
      <div className="building-card-actions">
        <Link className="btn btn-primary" to={`/buildings/${building.id}`}>
          Open
        </Link>
        {canDelete && (
          <button className="btn btn-danger" onClick={() => onDelete(building)}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
