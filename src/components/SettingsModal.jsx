/* SettingsModal.jsx */
import { useState } from 'react';
import './SettingsModal.css';

export function SettingsModal({ apiKey, onSave, onClose }) {
  const [key, setKey] = useState(apiKey || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(key.trim());
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="btn-close" onClick={onClose}>×</button>
        <h2>Cài đặt Qwen AI</h2>
        <p>Để tra cứu nghĩa và Pinyin bằng AI, bạn cần cung cấp API Key của Qwen (DashScope).</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="apiKey">Qwen API Key:</label>
            <input
              id="apiKey"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-..."
              autoComplete="off"
            />
            <small className="help-text">
              Lấy API Key tại: <a href="https://dashscope.aliyun.com/" target="_blank" rel="noopener noreferrer">DashScope (Aliyun)</a>. Key của bạn chỉ được lưu cục bộ trên trình duyệt này.
            </small>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-primary">Lưu cài đặt</button>
          </div>
        </form>
      </div>
    </div>
  );
}
