import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api.js';

function wordCount(str) {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

export default function RaiseRequestPage() {
  const { buildingId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]); // base64 data URLs
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const MAX_IMAGES = 3;
  const MAX_IMAGE_MB = 2;

  function handleFiles(e) {
    setError('');
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > MAX_IMAGES) {
      setError(`You can attach up to ${MAX_IMAGES} photos.`);
      return;
    }
    for (const file of files) {
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
        setError(`Each photo must be ${MAX_IMAGE_MB} MB or smaller.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setImages((prev) => [...prev, reader.result]);
      reader.readAsDataURL(file);
    }
    e.target.value = ''; // allow re-selecting the same file
  }

  function removeImage(index) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  useEffect(() => {
    api.getCategories(token).then(setCategories).catch((err) => setError(err.message));
  }, [token]);

  const words = wordCount(description);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!category) return setError('Please select an issue type.');
    if (words > 50) return setError('Description must be 50 words or fewer.');

    setLoading(true);
    try {
      const ticket = await api.createTicket(token, { category, description, images });
      setSuccess(ticket);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="page">
        <div className="success-card">
          <h2>✅ Request submitted</h2>
          <p>Your service request number is:</p>
          <p className="ticket-number">{success.ticketNumber}</p>
          <p className="muted">
            The building admin and super admin have been notified by WhatsApp and email. You can
            track the status of this request from the requests list.
          </p>
          <button className="btn btn-primary" onClick={() => navigate(`/buildings/${buildingId}/tickets`)}>
            View my requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Raise a maintenance request</h1>
      <form className="form-card" onSubmit={handleSubmit}>
        <label>Issue type</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} required>
          <option value="">Select an issue…</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label>Description (optional, max 50 words)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Briefly describe the issue… (optional)"
        />
        <p className={`small ${words > 50 ? 'error-text' : 'muted'}`}>{words} / 50 words</p>

        <label>Photos (optional, up to {MAX_IMAGES})</label>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFiles} />
        {images.length > 0 && (
          <div className="image-preview-row">
            {images.map((src, i) => (
              <div key={i} className="image-preview">
                <img src={src} alt={`Attachment ${i + 1}`} />
                <button type="button" className="image-remove" onClick={() => removeImage(i)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="error-text">{error}</p>}

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Submitting…' : 'Submit request'}
        </button>
      </form>
    </div>
  );
}
