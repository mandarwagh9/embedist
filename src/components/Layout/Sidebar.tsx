import { useUIStore } from '../../stores/uiStore';
import './Sidebar.css';

const sidebarItems = [
  { id: 'files', icon: 'files', label: 'Explorer' },
  { id: 'search', icon: 'search', label: 'Search' },
  { id: 'ai', icon: 'ai', label: 'AI Assistant' },
  { id: 'serial', icon: 'serial', label: 'Serial Monitor' },
  { id: 'build', icon: 'build', label: 'Build' },
] as const;

const icons: Record<string, JSX.Element> = {
  files: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z"/>
    </svg>
  ),
  search: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="7"/>
      <path d="M16 16L20 20"/>
    </svg>
  ),
  ai: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
      <path d="M2 17L12 22L22 17"/>
      <path d="M2 12L12 17L22 12"/>
    </svg>
  ),
  serial: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <path d="M6 10H8M10 10H12M14 10H16M18 10H20"/>
    </svg>
  ),
  build: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 16V8C21 7.44772 20.5523 7 20 7H4C3.44772 7 3 7.44772 3 8V16C3 16.5523 3.44772 17 4 17H20C20.5523 17 21 16.5523 21 16Z"/>
      <path d="M7 11L10 14L17 7"/>
    </svg>
  ),
};

export function Sidebar() {
  const { sidebarSection, setSidebarSection, sidebarExpanded, setSidebarExpanded } = useUIStore();

  return (
    <div 
      className={`sidebar ${sidebarExpanded ? 'expanded' : ''}`}
      onMouseEnter={() => setSidebarExpanded(true)}
      onMouseLeave={() => setSidebarExpanded(false)}
    >
      <div className="sidebar-items">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item ${sidebarSection === item.id ? 'active' : ''}`}
            onClick={() => setSidebarSection(item.id)}
            title={item.label}
          >
            <span className="sidebar-icon">{icons[item.icon]}</span>
            <span className="sidebar-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
