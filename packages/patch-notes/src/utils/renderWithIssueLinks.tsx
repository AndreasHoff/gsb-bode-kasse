import React from 'react';

/**
 * Convert text with GitHub issue references (#123) to JSX with clickable links
 * 
 * Example:
 * "Fixed bug in (#123)" → JSX with [#123] as clickable link
 */

export function renderWithIssueLinks(
  text: string,
  repoUrl: string
): React.ReactNode {
  // Split text by issue reference pattern: (#123)
  const parts = text.split(/(\(#\d+\))/);

  return parts.map((part, index) => {
    // Check if this part is an issue reference
    const match = part.match(/^\(#(\d+)\)$/);
    if (!match) {
      return part;
    }

    const issueNumber = match[1];
    const issueUrl = `${repoUrl}/issues/${issueNumber}`;

    return (
      <a
        key={index}
        href={issueUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="patch-notes-issue-link"
        aria-label={`GitHub issue #${issueNumber}`}
      >
        (#{issueNumber})
      </a>
    );
  });
}
