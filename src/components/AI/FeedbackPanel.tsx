import { useState } from 'react';

interface FeedbackPanelProps {
  feedback?: 'positive' | 'negative' | undefined;
  onFeedback: (feedback: 'positive' | 'negative' | undefined) => void;
}

const NEGATIVE_CATEGORIES = [
  'Inaccurate',
  'Not helpful',
  'Incomplete',
  'Wrong context',
];

export function FeedbackPanel({ feedback, onFeedback }: FeedbackPanelProps) {
  const [showCategories, setShowCategories] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleNegative = () => {
    if (feedback === 'negative') {
      onFeedback(undefined);
      setShowCategories(false);
      setSelectedCategory(null);
    } else {
      onFeedback('negative');
      setShowCategories(true);
    }
  };

  const handlePositive = () => {
    if (feedback === 'positive') {
      onFeedback(undefined);
    } else {
      onFeedback('positive');
      setShowCategories(false);
    }
  };

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
  };

  return (
    <div className="feedback-panel">
      <div className="feedback-buttons">
        <button
          className={`feedback-btn thumbs-up ${feedback === 'positive' ? 'active' : ''}`}
          onClick={handlePositive}
          title="Good response"
          aria-label="Thumbs up"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
            <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
          </svg>
        </button>
        <button
          className={`feedback-btn thumbs-down ${feedback === 'negative' ? 'active' : ''}`}
          onClick={handleNegative}
          title="Bad response"
          aria-label="Thumbs down"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" />
            <path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" />
          </svg>
        </button>
      </div>
      {showCategories && (
        <div className="feedback-categories">
          <p className="feedback-categories-label">What was wrong?</p>
          <div className="feedback-categories-list">
            {NEGATIVE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`feedback-category ${selectedCategory === cat ? 'selected' : ''}`}
                onClick={() => handleCategorySelect(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
