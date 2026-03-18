import { useState, useCallback } from 'react';
import { useFileStore } from '../../stores/fileStore';
import { ContextMenu, ContextMenuItem } from '../Common/ContextMenu';
import './TabBar.css';

export function TabBar() {
  const { 
    openTabs, 
    activeTabId, 
    setActiveTab, 
    closeTab, 
    closeOtherTabs, 
    closeTabsToRight,
    closeAllTabs,
    pinTab,
  } = useFileStore();
  
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tabId });
  }, []);

  const handleMiddleClick = useCallback((e: React.MouseEvent, tabId: string) => {
    if (e.button === 1) {
      e.preventDefault();
      closeTab(tabId);
    }
  }, [closeTab]);

  if (openTabs.length === 0) {
    return null;
  }

  const contextMenuItems: ContextMenuItem[] = contextMenu ? [
    {
      label: 'Close',
      shortcut: 'Ctrl+W',
      onClick: () => closeTab(contextMenu.tabId),
    },
    {
      label: 'Close Others',
      onClick: () => closeOtherTabs(contextMenu.tabId),
    },
    {
      label: 'Close to the Right',
      onClick: () => closeTabsToRight(contextMenu.tabId),
    },
    {
      label: 'Close All',
      onClick: () => closeAllTabs(),
    },
    { divider: true, label: '' },
    {
      label: openTabs.find(t => t.id === contextMenu.tabId)?.pinned ? 'Unpin' : 'Pin',
      onClick: () => pinTab(contextMenu.tabId),
    },
  ] : [];

  return (
    <>
      <div className="tabbar">
        <div className="tabbar-tabs">
          {openTabs.map((tab) => (
            <div
              key={tab.id}
              className={`tabbar-tab ${activeTabId === tab.id ? 'active' : ''} ${tab.pinned ? 'pinned' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
              onMouseDown={(e) => handleMiddleClick(e, tab.id)}
            >
              {tab.pinned && (
                <svg className="tabbar-tab-pin" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 12V4H17V2H7V4H8V12L6 14V16H11.2V22H12.8V16H18V14L16 12Z"/>
                </svg>
              )}
              <span className="tabbar-tab-title">
                {tab.title}
                {tab.modified && <span className="tabbar-tab-dot" />}
              </span>
              {!tab.pinned && (
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
              )}
            </div>
          ))}
        </div>
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
