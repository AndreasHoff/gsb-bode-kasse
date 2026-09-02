import React from 'react';

interface VersionBadgeProps {
  version: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  href?: string;
  title?: string;
  className?: string;
}

/**
 * Version badge component for displaying app version in navbar
 * Can be used as a button (with onClick) or link (with href)
 */
export function VersionBadge({
  version,
  onClick,
  href,
  title,
  className = '',
}: VersionBadgeProps) {
  const baseClass = `version-badge ${className}`;

  if (href) {
    return (
      <a
        href={href}
        className={baseClass}
        title={title}
      >
        {version}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={baseClass}
      title={title}
      aria-label={`Patchnoter, version ${version}`}
    >
      {version}
    </button>
  );
}
