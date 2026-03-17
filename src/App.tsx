import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [greet, setGreet] = useState("");

  useEffect(() => {
    invoke<string>("greet", { name: "Embedist User" }).then(setGreet);
  }, []);

  return (
    <div className="container">
      <header className="header">
        <h1>Embedist</h1>
        <p>AI-Native Embedded Development Environment</p>
      </header>
      <main className="main">
        <div className="welcome-card">
          <h2>Welcome to Embedist</h2>
          <p>{greet}</p>
          <div className="features">
            <div className="feature">
              <h3>AI Debugging</h3>
              <p>Hardware-aware AI that understands your board and provides specific fixes</p>
            </div>
            <div className="feature">
              <h3>Serial Monitor</h3>
              <p>Real-time serial communication with your embedded devices</p>
            </div>
            <div className="feature">
              <h3>Build & Upload</h3>
              <p>Integrated PlatformIO build system</p>
            </div>
            <div className="feature">
              <h3>Multi-Provider AI</h3>
              <p>Use OpenAI, Anthropic, Google, DeepSeek, Ollama, or add your own</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
