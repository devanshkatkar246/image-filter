import { useState, useCallback } from 'react';
import './ImageSearch.css';

/**
 * ImageSearch.tsx
 * 
 * Offline AI-powered image search and tagging application.
 * Uses FastAPI backend with CLIP for embeddings and FAISS for similarity search.
 * 
 * Features:
 * - Text-to-image search using natural language queries
 * - Click-to-tag: shows AI-generated tags for each image
 * - Fully offline (no cloud APIs)
 * - Responsive grid layout
 */

interface SearchResult {
  results: string[];
}

interface TagResult {
  tags: string[];
  path: string;
}

const BACKEND_URL = 'http://localhost:8000';

export function ImageSearch() {
  const [query, setQuery] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

  // Search images by text query
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setImages([]);
    setSelectedImage(null);
    setTags([]);

    try {
      const response = await fetch(`${BACKEND_URL}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: query }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data: SearchResult = await response.json();
      setImages(data.results || []);

      if (data.results.length === 0) {
        setError('No images found for your query. Try different keywords.');
      }
    } catch (err) {
      setError(
        err instanceof Error 
          ? `Failed to search: ${err.message}. Make sure backend is running on ${BACKEND_URL}`
          : 'Failed to search images'
      );
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [query]);

  // Get tags for an image
  const handleImageClick = useCallback(async (imagePath: string) => {
    setSelectedImage(imagePath);
    setLoadingTags(true);
    setTags([]);

    try {
      const response = await fetch(
        `${BACKEND_URL}/tag?path=${encodeURIComponent(imagePath)}`
      );

      if (!response.ok) {
        throw new Error(`Tagging failed: ${response.statusText}`);
      }

      const data: TagResult = await response.json();
      setTags(data.tags || []);
    } catch (err) {
      console.error('Tagging error:', err);
      setTags(['Error loading tags']);
    } finally {
      setLoadingTags(false);
    }
  }, []);

  // Handle Enter key in search input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="image-search-container">
      {/* Search Bar */}
      <div className="search-section">
        <div className="search-bar">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search images... (e.g., 'modern living room', 'sunset beach')"
            disabled={loading}
            className="search-input"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="btn btn-primary search-button"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        
        {error && (
          <div className="error-message">
            <span>⚠️ {error}</span>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>Searching images...</p>
        </div>
      )}

      {/* Results Grid */}
      {!loading && images.length > 0 && (
        <div className="results-section">
          <div className="results-header">
            <h3>Found {images.length} images</h3>
            <small>Click on any image to see AI-generated tags</small>
          </div>

          <div className="image-grid">
            {images.map((imagePath, index) => (
              <div
                key={index}
                className={`image-card ${selectedImage === imagePath ? 'selected' : ''}`}
                onClick={() => handleImageClick(imagePath)}
              >
                <img
                  src={`${BACKEND_URL}/images/${imagePath}`}
                  alt={`Result ${index + 1}`}
                  loading="lazy"
                  onError={(e) => {
                    // Fallback for broken images
                    (e.target as HTMLImageElement).src = 
                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not found%3C/text%3E%3C/svg%3E';
                  }}
                />
                {selectedImage === imagePath && (
                  <div className="selected-indicator">✓</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags Panel */}
      {selectedImage && (
        <div className="tags-panel">
          <div className="tags-header">
            <h4>AI-Generated Tags</h4>
            <button
              className="btn-close"
              onClick={() => {
                setSelectedImage(null);
                setTags([]);
              }}
            >
              ×
            </button>
          </div>

          <div className="selected-image-preview">
            <img
              src={`${BACKEND_URL}/images/${selectedImage}`}
              alt="Selected"
            />
          </div>

          {loadingTags ? (
            <div className="tags-loading">
              <div className="spinner-small" />
              <span>Generating tags...</span>
            </div>
          ) : (
            <div className="tags-list">
              {tags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="tags-footer">
            <small>Powered by CLIP + FAISS (offline)</small>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && images.length === 0 && !error && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>Search Your Photos</h3>
          <p>Enter a description to find images using AI</p>
          <div className="example-queries">
            <small>Try examples:</small>
            <div className="example-chips">
              <button onClick={() => setQuery('modern living room')}>modern living room</button>
              <button onClick={() => setQuery('sunset beach')}>sunset beach</button>
              <button onClick={() => setQuery('city skyline')}>city skyline</button>
              <button onClick={() => setQuery('nature landscape')}>nature landscape</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
