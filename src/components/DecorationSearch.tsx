import { useState, useCallback } from 'react';
import './DecorationSearch.css';

/**
 * DecorationSearch.tsx
 * 
 * Domain-specific image search for decoration and party setups.
 * Features:
 * - Pinterest-style dark UI
 * - Streamlined search and categories
 * - High-speed visual feedback
 */

interface SearchResult {
  results: string[];
}

interface TagResult {
  tags: string[];
  path: string;
}

const BACKEND_URL = 'http://localhost:8000';

const CATEGORIES = [
  { id: 'birthday', label: 'Birthday', emoji: '🎂' },
  { id: 'anniversary', label: 'anniversary', emoji: '💒' },
  { id: 'Baby Shower', label: 'Baby Shower', emoji: '💕' },
  { id: 'mandap', label: 'mandap', emoji: '🎈' },
  { id: 'mehendi', label: 'mehendi', emoji: '✨' },
];

export function DecorationSearch() {
  const [query, setQuery] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const handleSearch = useCallback(async (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (!finalQuery.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);
    setImages([]);
    setSelectedImage(null);
    setTags([]);

    try {
      const response = await fetch(`${BACKEND_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: finalQuery }),
      });

      if (!response.ok) throw new Error(`Search failed: ${response.statusText}`);

      const data: SearchResult = await response.json();
      setImages(data.results || []);

      if (data.results.length === 0) {
        setError('No decoration images found. Try a broader search term!');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search decorations');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleImageClick = useCallback(async (imagePath: string) => {
    setSelectedImage(imagePath);
    setLoadingTags(true);
    setTags([]);

    try {
      const response = await fetch(`${BACKEND_URL}/tag?path=${encodeURIComponent(imagePath)}`);
      if (!response.ok) throw new Error(`Tagging failed: ${response.statusText}`);
      const data: TagResult = await response.json();
      setTags(data.tags || []);
    } catch (err) {
      setTags(['Error loading tags']);
    } finally {
      setLoadingTags(false);
    }
  }, []);

  const handleCategoryClick = (categoryLabel: string) => {
    const categoryQuery = `${categoryLabel} decoration`;
    setQuery(categoryQuery);
    setActiveCategory(categoryLabel.toLowerCase());
    handleSearch(categoryQuery);
  };

  return (
    <div className="decoration-search-container">
      <header className="header-section">
        <div className="content-wrapper">
          <h1 className="hero-title">Decoration AI</h1>
          <p className="hero-subtitle">Visual search for perfect event setups</p>
        </div>
      </header>

      <section className="search-section">
        <div className="content-wrapper">
          <div className="search-box">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (activeCategory) setActiveCategory(null);
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search trends... (e.g., 'minimalist wedding')"
              disabled={loading}
              className="search-input-main"
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              className="search-btn"
            >
              {loading ? <div className="loading-spinner" style={{ width: 20, height: 20, margin: 0 }} /> : 'Search'}
            </button>
          </div>

          {error && <div className="error-banner" style={{ marginTop: 12 }}>{error}</div>}
        </div>
      </section>

      <section className="categories-section">
        <div className="content-wrapper">
          <div className="category-pills">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`category-pill ${activeCategory === cat.label.toLowerCase() ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat.label)}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="results-section">
        <div className="content-wrapper">
          {loading && (
            <div className="loading-container">
              <div className="loading-spinner" />
              <p style={{ color: 'var(--text-muted)' }}>Curating the best setups for you...</p>
            </div>
          )}

          {!loading && images.length > 0 && (
            <>
              <div className="results-header">
                <div className="results-title-group">
                  <h2>Results</h2>
                </div>
                <div className="results-count">{images.length} found</div>
              </div>

              <div className="decoration-grid">
                {images.map((imagePath, index) => (
                  <div
                    key={index}
                    className="decoration-card"
                    onClick={() => handleImageClick(imagePath)}
                  >
                    <div className="image-wrapper">
                      <img
                        src={`${BACKEND_URL}/images/${imagePath}`}
                        alt={`Decoration setup ${index + 1}`}
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="400"%3E%3Crect fill="%231e293b" width="300" height="400"/%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!loading && images.length === 0 && !error && (
            <div className="empty-state-container">
              <div className="empty-icon">{hasSearched ? '🔍' : '✨'}</div>
              <h2 style={{ fontSize: 20, marginBottom: 8 }}>
                {hasSearched ? 'No results found' : 'Ready to inspire?'}
              </h2>
              <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>
                {hasSearched
                  ? 'Try different keywords or check out categories above.'
                  : 'Start by searching for specific decoration styles or themes.'}
              </p>
            </div>
          )}
        </div>
      </main>

      {selectedImage && (
        <div className="tags-modal" onClick={() => setSelectedImage(null)}>
          <div className="tags-content" onClick={(e) => e.stopPropagation()}>
            <div className="tags-header-section">
              <button className="close-btn" onClick={() => setSelectedImage(null)}>×</button>
            </div>

            <div className="selected-preview">
              <img src={`${BACKEND_URL}/images/${selectedImage}`} alt="Focused preview" />
            </div>

            <div className="detail-info-section">
              <h3>Decoration Details</h3>
              <div className="tags-section">
                <h4>Visual Elements Identified</h4>
                {loadingTags ? (
                  <div className="loading-spinner" style={{ width: 24, height: 24, margin: '0 auto' }} />
                ) : (
                  <div className="tags-chips">
                    {tags.length > 0 ? tags.map((tag, index) => (
                      <span key={index} className="tag-chip">{tag}</span>
                    )) : <span>No specific elements detected</span>}
                  </div>
                )}
              </div>
              <div className="tags-footer-info">
                Visual analysis powered by CLIP AI
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
