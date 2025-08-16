import { useState } from 'react';

export default function SearchSection({ onSearch }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');

  const handleSearch = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch({ term: searchTerm, category });
    }
  };

  return (
    <div className="search-section">
      <div className="search-header">
        <h2>Search YouTube Videos</h2>
        <p className="section-description">
          Search and rate YouTube videos securely
        </p>
      </div>

      <form onSubmit={handleSearch} className="search-bar">
        <input
          type="text"
          placeholder="Search for videos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-control search-input"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="form-control category-select"
        >
          <option value="all">All Categories</option>
          <option value="music">Music</option>
          <option value="gaming">Gaming</option>
          <option value="education">Education</option>
          <option value="entertainment">Entertainment</option>
          <option value="tech">Technology</option>
        </select>
        <button type="submit" className="btn btn--primary">
          Search
        </button>
      </form>

      <div className="search-results">
        <p>Try adjusting your search criteria</p>
      </div>
    </div>
  );
}
