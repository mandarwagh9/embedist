import { useUIStore } from '../../stores/uiStore';
import './TabBar.css';

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useUIStore();

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="tabbar">
      <div className="tabbar-tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tabbar-tab ${activeTabId === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tabbar-tab-title">{tab.title}</span>
            {tab.modified && <span className="tabbar-tab-modified" />}
            <button
              className="tabbar-tab-close"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10">
                <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
