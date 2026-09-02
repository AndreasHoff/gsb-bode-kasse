import React, { useState } from 'react';
import { renderWithIssueLinks } from '../utils/renderWithIssueLinks';
import type { Release } from '../utils/parseMarkdown';

interface PatchNotesViewProps {
  releases: Release[];
  repoUrl: string;
  currentVersion?: string;
  itemsPerPage?: number;
  className?: string;
}

export function PatchNotesView({
  releases,
  repoUrl,
  currentVersion,
  itemsPerPage = 5,
  className = '',
}: PatchNotesViewProps) {
  const [currentPage, setCurrentPage] = useState(1);

  if (releases.length === 0) {
    return (
      <div className={`patch-notes-empty ${className}`}>
        <p>Ingen patchnoter tilgængelige</p>
      </div>
    );
  }

  const totalPages = Math.ceil(releases.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const currentReleases = releases.slice(startIdx, endIdx);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top
    const container = document.querySelector('.patch-notes-container');
    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  return (
    <div className={`patch-notes-container ${className}`}>
      {/* Header */}
      <div className="patch-notes-header">
        <h1 className="patch-notes-title">Patchnoter</h1>
        {currentVersion && (
          <p className="patch-notes-version">Aktuel version: {currentVersion}</p>
        )}
      </div>

      {/* Releases */}
      <div className="patch-notes-releases">
        {currentReleases.map((release) => (
          <div key={release.version} className="patch-notes-release">
            <div className="patch-notes-release-header">
              <h2 className="patch-notes-release-version">v{release.version}</h2>
              <p className="patch-notes-release-date">{release.date}</p>
            </div>

            <ul className="patch-notes-items">
              {release.items.map((item, idx) => (
                <li key={idx} className="patch-notes-item">
                  {renderWithIssueLinks(item, repoUrl)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="patch-notes-pagination">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentPage === 1}
            className="patch-notes-pagination-button"
            aria-label="Forrige side"
          >
            ← Forrige
          </button>

          <div className="patch-notes-pagination-pages">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => handlePageChange(page)}
                className={`patch-notes-pagination-page ${
                  page === currentPage ? 'patch-notes-pagination-page--active' : ''
                }`}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentPage === totalPages}
            className="patch-notes-pagination-button"
            aria-label="Næste side"
          >
            Næste →
          </button>
        </div>
      )}
    </div>
  );
}
