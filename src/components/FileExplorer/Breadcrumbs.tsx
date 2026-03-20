interface BreadcrumbsProps {
  path: string;
  rootName: string;
  onNavigate: (nodePath: string | null) => void;
  onNodeClick: (nodePath: string) => void;
}

export function Breadcrumbs({ path, rootName, onNavigate, onNodeClick }: BreadcrumbsProps) {
  const parts = path.replace(/\\/g, '/').split('/').filter(Boolean);

  const segments = [
    { label: rootName || 'Root', path: null },
    ...parts.map((part, i) => ({
      label: part,
      path: '/' + parts.slice(0, i + 1).join('/'),
    })),
  ];

  return (
    <div className="breadcrumbs">
      {segments.map((seg, i) => (
        <span key={i} className="breadcrumbs-item">
          {i > 0 && <span className="breadcrumbs-sep">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>}
          <button
            className="breadcrumbs-btn"
            onClick={() => {
              if (i === 0) {
                onNavigate(null);
              } else {
                onNodeClick(seg.path!);
              }
            }}
          >
            {seg.label}
          </button>
        </span>
      ))}
    </div>
  );
}
