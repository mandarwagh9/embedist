import { useUIStore } from './stores/uiStore';
import { TitleBar } from './components/Layout/TitleBar';
import { Sidebar } from './components/Layout/Sidebar';
import { TabBar } from './components/Layout/TabBar';
import { StatusBar } from './components/Layout/StatusBar';
import { BottomPanel } from './components/Layout/BottomPanel';
import { CodeEditor } from './components/Editor/CodeEditor';
import './styles/global.css';

function App() {
  const { tabs, activeTabId, sidebarSection } = useUIStore();
  
  const activeTab = tabs.find(t => t.id === activeTabId);

  const getDefaultCode = () => {
    if (sidebarSection === 'serial') {
      return `// Serial Monitor
// Connect your ESP32/Arduino to view output

#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  Serial.println("Hello from Embedist!");
}

void loop() {
  Serial.println("Running...");
  delay(1000);
}`;
    }
    return `// Welcome to Embedist
// Start coding your embedded project here

#include <Arduino.h>

void setup() {
  // Your setup code
  Serial.begin(115200);
}

void loop() {
  // Your loop code
}`;
  };

  return (
    <div className="app">
      <TitleBar />
      
      <div className="app-body">
        <Sidebar />
        
        <div className="app-main">
          <TabBar />
          
          <div className="app-content">
            <CodeEditor 
              value={activeTab?.path ? '' : getDefaultCode()}
              language="cpp"
            />
          </div>
          
          <BottomPanel />
        </div>
      </div>
      
      <StatusBar />
    </div>
  );
}

export default App;
