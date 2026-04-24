/* App.jsx — Main application orchestrator */
import { useState, useCallback, useEffect } from 'react';
import { HanziCanvas } from './components/HanziCanvas';
import { LessonSidebar } from './components/LessonSidebar';
import { SettingsModal } from './components/SettingsModal';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useAILookup } from './hooks/useAILookup';
import hsk1Data from './data/hsk1.json';
import hsk2Data from './data/hsk2.json';
import hsk3Data from './data/hsk3.json';

const HSK_LEVELS = {
  1: hsk1Data,
  2: hsk2Data,
  3: hsk3Data
};
import { PrintSheet } from './components/PrintSheet';
import './App.css';

const MODES = { HSK: 'hsk', FREE: 'free' };

// Extract all CJK characters from a string for multi-char writing
function extractAllChars(str) {
  const matches = str.match(/[\u4e00-\u9fff]/g);
  return matches || [];
}

export default function App() {
  const [mode, setMode] = useState(MODES.HSK);
  const [hskLevel, setHskLevel] = useLocalStorage('mxh_hsk_level', 1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [freeInput, setFreeInput] = useState('');
  const [freeChars, setFreeChars] = useState([]);
  const [freeIndex, setFreeIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useLocalStorage('mxh_qwen_api_key', '');
  
  const [hsk1Progress, setHsk1Progress] = useLocalStorage('mxh_hsk1_progress', {});
  const [hsk2Progress, setHsk2Progress] = useLocalStorage('mxh_hsk2_progress', {});
  const [hsk3Progress, setHsk3Progress] = useLocalStorage('mxh_hsk3_progress', {});
  const [freeProgress, setFreeProgress] = useLocalStorage('mxh_free_progress', {});

  const hskProgresses = { 1: hsk1Progress, 2: hsk2Progress, 3: hsk3Progress };
  const hskProgressSetters = { 1: setHsk1Progress, 2: setHsk2Progress, 3: setHsk3Progress };
  
  const hskProgress = hskProgresses[hskLevel];
  const setHskProgress = hskProgressSetters[hskLevel];
  const currentHskData = HSK_LEVELS[hskLevel];
  const [aiInfo, setAiInfo] = useState(null);

  const { lookup, loading: aiLoading, error: aiError } = useAILookup(apiKey);

  // Current character derivation
  const currentChar = mode === MODES.HSK
    ? currentHskData[currentIndex]
    : freeChars[freeIndex] || null;

  const rawChar = currentChar
    ? (typeof currentChar === 'string' ? currentChar : currentChar.char)
    : null;

  const charsArray = rawChar ? extractAllChars(rawChar) : [];

  // AI lookup for free mode
  useEffect(() => {
    if (mode !== MODES.FREE || !rawChar) {
      setAiInfo(null);
      return;
    }

    // 1. Check local HSK data first — no API call needed
    const hskMatch = hsk1Data.find(item => item.char === rawChar)
                  || hsk2Data.find(item => item.char === rawChar)
                  || hsk3Data.find(item => item.char === rawChar);
    if (hskMatch) {
      setAiInfo({ pinyin: hskMatch.pinyin, meaning: hskMatch.meaning });
      return;
    }

    // 2. Otherwise call AI (with localStorage cache built into the hook)
    if (!apiKey) {
      setAiInfo(null);
      return;
    }
    let cancelled = false;
    lookup(rawChar).then(result => {
      if (!cancelled) setAiInfo(result);
    });
    return () => { cancelled = true; };
  }, [rawChar, mode, apiKey]);

  const handleComplete = useCallback(() => {
    if (mode === MODES.HSK && rawChar) {
      setHskProgress(p => ({ ...p, [rawChar]: true }));
    } else if (mode === MODES.FREE && rawChar) {
      setFreeProgress(p => ({ ...p, [rawChar]: true }));
    }
  }, [mode, rawChar, setHskProgress, setFreeProgress]);

  const handleFreeSubmit = useCallback((e) => {
    e.preventDefault();
    const trimmed = freeInput.trim();
    if (!trimmed) return;
    // Split into individual characters
    const chars = [...trimmed].filter(c => /[\u4e00-\u9fff]/.test(c));
    if (chars.length === 0) return;
    setFreeChars(chars);
    setFreeIndex(0);
    setAiInfo(null);
  }, [freeInput]);

  const navigateNext = () => {
    const list = mode === MODES.HSK ? currentHskData : freeChars;
    const idx = mode === MODES.HSK ? currentIndex : freeIndex;
    const setter = mode === MODES.HSK ? setCurrentIndex : setFreeIndex;
    if (idx < list.length - 1) setter(idx + 1);
  };

  const navigatePrev = () => {
    const idx = mode === MODES.HSK ? currentIndex : freeIndex;
    const setter = mode === MODES.HSK ? setCurrentIndex : setFreeIndex;
    if (idx > 0) setter(idx - 1);
  };

  const progress = mode === MODES.HSK ? hskProgress : freeProgress;
  const charList = mode === MODES.HSK
    ? currentHskData
    : freeChars.map(c => ({ char: c }));
  const listIndex = mode === MODES.HSK ? currentIndex : freeIndex;
  const listSetter = mode === MODES.HSK ? setCurrentIndex : setFreeIndex;

  // Info panel data
  const displayPinyin = mode === MODES.HSK
    ? (typeof currentChar === 'object' ? currentChar?.pinyin : null)
    : aiInfo?.pinyin;
  const displayMeaning = mode === MODES.HSK
    ? (typeof currentChar === 'object' ? currentChar?.meaning : null)
    : aiInfo?.meaning;

  const hskDoneCount = Object.keys(hskProgress).filter(k => hskProgress[k]).length;

  return (
    <div className="app">
      {/* ─── Header ─── */}
      <header className="app-header">
        <div className="header-logo">
          <span className="logo-hanzi">写</span>
          <div>
            <h1>Master Xie Hanzi</h1>
            <p className="header-sub">Luyện viết chữ Hán</p>
          </div>
        </div>
        <div className="header-right">
          <div className="header-stat">
            <span className="stat-number">{hskDoneCount}</span>
            <span className="stat-label">HSK đã học</span>
          </div>
          <button
            className="icon-btn"
            title="In bảng tập viết"
            onClick={() => window.print()}
          >
            🖨️
          </button>
          <button
            id="btn-settings"
            className="icon-btn"
            onClick={() => setShowSettings(true)}
            title="Cài đặt Qwen API"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* ─── Mode Tabs ─── */}
      <div className="mode-tabs">
        <button
          className={`mode-tab ${mode === MODES.HSK && hskLevel === 1 ? 'active' : ''}`}
          onClick={() => { setMode(MODES.HSK); if (hskLevel !== 1) { setHskLevel(1); setCurrentIndex(0); } }}
        >
          📚 HSK 1
        </button>
        <button
          className={`mode-tab ${mode === MODES.HSK && hskLevel === 2 ? 'active' : ''}`}
          onClick={() => { setMode(MODES.HSK); if (hskLevel !== 2) { setHskLevel(2); setCurrentIndex(0); } }}
        >
          📚 HSK 2
        </button>
        <button
          className={`mode-tab ${mode === MODES.HSK && hskLevel === 3 ? 'active' : ''}`}
          onClick={() => { setMode(MODES.HSK); if (hskLevel !== 3) { setHskLevel(3); setCurrentIndex(0); } }}
        >
          📚 HSK 3
        </button>
        <button
          id="tab-free"
          className={`mode-tab ${mode === MODES.FREE ? 'active' : ''}`}
          onClick={() => setMode(MODES.FREE)}
        >
          ✏️ Tập viết tự do
        </button>
      </div>

      {/* ─── Free Mode Input ─── */}
      {mode === MODES.FREE && (
        <form className="free-input-bar" onSubmit={handleFreeSubmit}>
          <input
            id="free-char-input"
            type="text"
            className="free-input"
            placeholder="Nhập chữ Hán bạn muốn luyện (VD: 学习汉语)..."
            value={freeInput}
            onChange={e => setFreeInput(e.target.value)}
          />
          <button id="btn-free-submit" type="submit" className="btn-primary">
            Bắt đầu
          </button>
          {!apiKey && (
            <button
              type="button"
              className="btn-set-key"
              onClick={() => setShowSettings(true)}
            >
              🔑 Cài Qwen API Key
            </button>
          )}
        </form>
      )}

      {/* ─── Main Layout ─── */}
      <main className="app-main">
        {/* Sidebar */}
        {(mode === MODES.HSK || freeChars.length > 0) && (
          <aside className="app-sidebar">
            <LessonSidebar
              characters={charList}
              currentIndex={listIndex}
              progress={progress}
              onSelect={listSetter}
            />
          </aside>
        )}

        {/* Center Panel */}
        <section className="app-center">
          {charsArray.length > 0 ? (
            <>
              {/* Character Info */}
              <div className="char-info">
                <div className="char-display">{rawChar}</div>
                <div className="char-meta">
                  {displayPinyin ? (
                    <span className="char-pinyin">{displayPinyin}</span>
                  ) : aiLoading ? (
                    <span className="char-loading">⏳ đang tra cứu Qwen...</span>
                  ) : aiError ? (
                    <span className="char-error" title={aiError}>⚠️ {aiError}</span>
                  ) : mode === MODES.FREE && !apiKey ? (
                    <span className="char-hint">🔑 Thêm API Key để xem Pinyin</span>
                  ) : null}
                  {displayMeaning && (
                    <span className="char-meaning">{displayMeaning}</span>
                  )}
                </div>
              </div>

              {/* Canvas */}
              <HanziCanvas
                key={rawChar}
                characters={charsArray}
                onComplete={handleComplete}
              />

              {/* Navigation */}
              <div className="nav-buttons">
                <button
                  id="btn-prev"
                  className="nav-btn"
                  onClick={navigatePrev}
                  disabled={listIndex === 0}
                >
                  ← Chữ trước
                </button>
                <span className="nav-indicator">
                  {listIndex + 1} / {charList.length}
                </span>
                <button
                  id="btn-next"
                  className="nav-btn"
                  onClick={navigateNext}
                  disabled={listIndex === charList.length - 1}
                >
                  Chữ tiếp →
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">
              {mode === MODES.FREE ? (
                <>
                  <div className="empty-icon">✍️</div>
                  <h2>Nhập chữ Hán để bắt đầu</h2>
                  <p>Gõ các chữ Hán bạn muốn luyện viết vào ô bên trên và nhấn "Bắt đầu".</p>
                </>
              ) : (
                <>
                  <div className="empty-icon">📚</div>
                  <h2>Chọn chữ từ danh sách</h2>
                  <p>Nhấn vào bất kỳ chữ Hán nào bên trái để bắt đầu luyện tập.</p>
                </>
              )}
            </div>
          )}
        </section>
      </main>

      {/* ─── Settings Modal ─── */}
      {showSettings && (
        <SettingsModal
          apiKey={apiKey}
          onSave={setApiKey}
          onClose={() => setShowSettings(false)}
        />
      )}
      {/* Hidden Print Template */}
      <PrintSheet
        character={rawChar || ''}
        pinyin={displayPinyin || ''}
        meaning={displayMeaning || ''}
      />
    </div>
  );
}
