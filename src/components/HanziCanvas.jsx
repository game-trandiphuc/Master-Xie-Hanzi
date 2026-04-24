/* HanziCanvas.jsx — Core writing canvas component with multi-char support */
import { useEffect, useRef, useState, useCallback } from 'react';
import HanziWriter from 'hanzi-writer';
import './HanziCanvas.css';

/**
 * @param {string[]} characters - Array of individual CJK characters to write in sequence
 * @param {function} onComplete - Called when ALL characters in the sequence are completed
 */
export function HanziCanvas({ characters, onComplete }) {
  const containerRef = useRef(null);
  const writerRef = useRef(null);
  const [charIndex, setCharIndex] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | quiz | success | error
  const [mistakeCount, setMistakeCount] = useState(0);
  const [strokesCompleted, setStrokesCompleted] = useState(0);
  const [totalStrokes, setTotalStrokes] = useState(0);
  const [notFound, setNotFound] = useState(false);

  const currentChar = characters[charIndex] || null;
  const isMulti = characters.length > 1;

  // Reset charIndex when the word changes (new set of characters)
  useEffect(() => {
    setCharIndex(0);
  }, [characters]);

  // Init writer and auto-start quiz — use charIndex as dep to handle duplicate chars like 爸爸
  useEffect(() => {
    if (!containerRef.current || !currentChar) return;
    containerRef.current.innerHTML = '';
    setStatus('idle');
    setMistakeCount(0);
    setStrokesCompleted(0);
    setTotalStrokes(0);
    setNotFound(false);

    const size = Math.min(containerRef.current.offsetWidth, 320);

    const writer = HanziWriter.create(containerRef.current, currentChar, {
      width: size,
      height: size,
      padding: 24,
      strokeColor: '#e8b86d',
      radicalColor: '#e8a03a',
      outlineColor: 'rgba(232,184,109,0.18)',
      drawingColor: '#f0ece4',
      drawingWidth: 5,
      showOutline: true,
      showCharacter: false,
      highlightColor: '#70c47d',
      highlightCompleteColor: '#70c47d',
      charDataLoader: (char, onLoad, onError) => {
        fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${char}.json`)
          .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
          .then(onLoad)
          .catch(() => {
            setNotFound(true);
            onError();
          });
      },
      onLoadCharDataSuccess: (data) => {
        setTotalStrokes(data.strokes.length);
        // Auto-start quiz immediately
        writer.quiz({
          onMistake: () => setMistakeCount(p => p + 1),
          onCorrectStroke: (strokeData) => {
            setStrokesCompleted(
              strokeData.strokesRemaining !== undefined
                ? data.strokes.length - strokeData.strokesRemaining
                : strokeData.totalMistakes + 1
            );
          },
          onComplete: () => {
            // Advance to next char or finish
            setCharIndex(prev => {
              if (prev < characters.length - 1) {
                return prev + 1;
              } else {
                setStatus('success');
                setTimeout(() => onComplete && onComplete(), 600);
                return prev;
              }
            });
          },
          showHintAfterMisses: 2,
        });
        setStatus('quiz');
      },
      onLoadCharDataError: () => setNotFound(true),
    });

    writerRef.current = writer;

    return () => {
      try { writer.cancelQuiz(); } catch {}
    };
  // charIndex is critical here — without it, duplicate chars like 爸爸 won't re-init
  }, [charIndex, currentChar, characters.length, onComplete]);

  const animate = useCallback(() => {
    if (!writerRef.current) return;
    writerRef.current.animateCharacter();
  }, []);

  const hint = useCallback(() => {
    if (!writerRef.current) return;
    writerRef.current.highlightStroke(strokesCompleted);
  }, [strokesCompleted]);

  const reset = useCallback(() => {
    setCharIndex(0);
  }, []);

  const progress = totalStrokes > 0 ? (strokesCompleted / totalStrokes) * 100 : 0;

  return (
    <div className="hanzi-canvas-wrapper">
      {/* Multi-char indicator */}
      {isMulti && (
        <div className="multi-char-indicator">
          {characters.map((c, i) => (
            <span
              key={i}
              className={`multi-char-dot ${i < charIndex ? 'done' : ''} ${i === charIndex ? 'active' : ''}`}
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Grid Paper Background */}
      <div className="canvas-paper-outer">
        <div className="canvas-grid-lines">
          <div className="grid-line grid-h" />
          <div className="grid-line grid-v" />
          <div className="grid-diag grid-diag-1" />
          <div className="grid-diag grid-diag-2" />
        </div>
        <div ref={containerRef} className="canvas-container" />

        {/* Status overlay */}
        {status === 'success' && (
          <div className="canvas-overlay success-overlay">
            <div className="success-icon">✓</div>
            <p>Xuất sắc!</p>
          </div>
        )}
        {notFound && (
          <div className="canvas-overlay error-overlay">
            <p>😕 Không tìm thấy dữ liệu nét cho chữ này</p>
          </div>
        )}
      </div>

      {/* Stroke progress bar */}
      {status === 'quiz' && totalStrokes > 0 && (
        <div className="stroke-progress">
          <div className="stroke-progress-bar" style={{ width: `${progress}%` }} />
          <span className="stroke-progress-text">Nét {strokesCompleted}/{totalStrokes}</span>
        </div>
      )}

      {/* Mistake count */}
      {status === 'quiz' && (
        <div className="mistake-counter">
          {mistakeCount > 0
            ? <span className="mistakes">⚡ {mistakeCount} lần sai</span>
            : <span className="no-mistakes">✨ Chưa sai nét nào!</span>}
        </div>
      )}

      {/* Toolbar */}
      <div className="canvas-toolbar">
        <button className="toolbar-btn" onClick={animate} disabled={status === 'idle' || notFound}>
          🎬 Xem mẫu
        </button>
        {status === 'quiz' && (
          <button className="toolbar-btn" onClick={hint}>
            💡 Gợi ý
          </button>
        )}
        <button className="toolbar-btn" onClick={reset} disabled={status === 'idle'}>
          🔄 Viết lại
        </button>
      </div>
    </div>
  );
}
