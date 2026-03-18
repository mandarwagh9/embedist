import { useSettingsStore } from '../../stores/settingsStore';
import './SettingsSidebar.css';

const sections = [
  { id: 'ai', label: 'AI Providers', icon: 'ai' },
  { id: 'editor', label: 'Editor', icon: 'editor' },
  { id: 'serial', label: 'Serial', icon: 'serial' },
  { id: 'build', label: 'Build', icon: 'build' },
];

const icons: Record<string, JSX.Element> = {
  ai: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
      <path d="M2 17L12 22L22 17"/>
      <path d="M2 12L12 17L22 12"/>
    </svg>
  ),
  editor: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"/>
      <path d="M14 2V8H20"/>
      <path d="M8 13H16M8 17H12"/>
    </svg>
  ),
  serial: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <path d="M6 10H8M10 10H12M14 10H16M18 10H20"/>
    </svg>
  ),
  build: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 16V8C21 7.44772 20.5523 7 20 7H4C3.44772 7 3 7.44772 3 8V16C3 16.5523 3.44772 17 4 17H20C20.5523 17 21 16.5523 21 16Z"/>
      <path d="M7 11L10 14L17 7"/>
    </svg>
  ),
};

export function SettingsSidebar() {
  const { activeSection, setActiveSection } = useSettingsStore();

  return (
    <div className="settings-sidebar">
      {sections.map((section) => (
        <button
          key={section.id}
          className={`settings-sidebar-item ${activeSection === section.id ? 'active' : ''}`}
          onClick={() => setActiveSection(section.id)}
        >
          <span className="settings-sidebar-icon">{icons[section.icon]}</span>
          <span className="settings-sidebar-label">{section.label}</span>
        </button>
      ))}
    </div>
  );
}
