import { useEffect, useState } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface StreamingIndicatorProps {
  content: string;
  isStreaming: boolean;
  onStop?: () => void;
}

export function StreamingIndicator({ content, isStreaming, onStop }: StreamingIndicatorProps) {
  const [displayedContent, setDisplayedContent] = useState('');

  useEffect(() => {
    setDisplayedContent(content);
  }, [content, isStreaming]);

  if (!isStreaming && !displayedContent) return null;

  return (
    <div className="streaming-indicator">
      <div className="streaming-content">
        {displayedContent ? (
          <MarkdownRenderer content={displayedContent} />
        ) : (
          <div className="streaming-thinking">
            <div className="thinking-dots">
              <span className="thinking-dot" />
              <span className="thinking-dot" />
              <span className="thinking-dot" />
            </div>
            <span>Thinking...</span>
          </div>
        )}
        {isStreaming && <span className="streaming-cursor" />}
      </div>
      {isStreaming && onStop && (
        <button className="streaming-stop" onClick={onStop} title="Stop generating" aria-label="Stop generating">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
          <span>Stop</span>
        </button>
      )}
    </div>
  );
}
