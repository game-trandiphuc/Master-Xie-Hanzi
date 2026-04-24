/* LessonSidebar.jsx — List of characters in current lesson */
import './LessonSidebar.css';

export function LessonSidebar({ characters, currentIndex, progress, onSelect }) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Danh sách từ</span>
        <span className="sidebar-count">
          {Object.keys(progress).filter(k => progress[k]).length}/{characters.length}
        </span>
      </div>
      <div className="sidebar-list">
        {characters.map((item, idx) => {
          const char = typeof item === 'string' ? item : item.char;
          const isDone = progress[char];
          const isCurrent = idx === currentIndex;
          return (
            <button
              key={char + idx}
              className={`sidebar-item ${isCurrent ? 'active' : ''} ${isDone ? 'done' : ''}`}
              onClick={() => onSelect(idx)}
              title={typeof item === 'object' ? `${item.pinyin} — ${item.meaning}` : char}
            >
              <span className="sidebar-char">{char}</span>
              {typeof item === 'object' && (
                <span className="sidebar-pinyin">{item.pinyin}</span>
              )}
              {isDone && <span className="sidebar-check">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
