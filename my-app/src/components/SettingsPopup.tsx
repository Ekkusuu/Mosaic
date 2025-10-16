import React, { useState } from 'react';
import './SettingsPopup.css';
import { useTheme } from '../contexts/ThemeContext';

interface SettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPopup: React.FC<SettingsPopupProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<'account' | 'preferences' | 'privacy' | 'notifications'>('account');
  const { theme, setTheme } = useTheme();
  
  // Mock settings state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [publicProfile, setPublicProfile] = useState(true);
  const [showEmail, setShowEmail] = useState(false);
  const [language, setLanguage] = useState('en');

  if (!isOpen) return null;

  return (
    <div className="settings-popup-overlay" onClick={onClose}>
      <div className="settings-popup" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-popup-header">
          <h2 className="settings-popup-title">Settings</h2>
          <button className="settings-popup-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="settings-popup-body">
          {/* Sidebar Navigation */}
          <div className="settings-sidebar">
            <nav className="settings-nav">
              <button
                className={`settings-nav-item ${activeSection === 'account' ? 'active' : ''}`}
                onClick={() => setActiveSection('account')}
              >
                <span className="settings-nav-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                Account
              </button>
              
              <button
                className={`settings-nav-item ${activeSection === 'preferences' ? 'active' : ''}`}
                onClick={() => setActiveSection('preferences')}
              >
                <span className="settings-nav-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </span>
                Preferences
              </button>

              <button
                className={`settings-nav-item ${activeSection === 'privacy' ? 'active' : ''}`}
                onClick={() => setActiveSection('privacy')}
              >
                <span className="settings-nav-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </span>
                Privacy
              </button>

              <button
                className={`settings-nav-item ${activeSection === 'notifications' ? 'active' : ''}`}
                onClick={() => setActiveSection('notifications')}
              >
                <span className="settings-nav-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </span>
                Notifications
              </button>
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="settings-content">
            {activeSection === 'account' && (
              <div className="settings-section">
                <h3 className="settings-section-title">Account Security</h3>
                <p className="settings-section-description">
                  Manage your password and account security settings.
                </p>

                <div className="settings-group">
                  <h4 className="settings-subsection-title">Change Password</h4>
                  <div className="settings-item">
                    <label className="settings-label" htmlFor="current-password">Current Password</label>
                    <input
                      id="current-password"
                      type="password"
                      className="settings-input"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="settings-item">
                    <label className="settings-label" htmlFor="new-password">New Password</label>
                    <input
                      id="new-password"
                      type="password"
                      className="settings-input"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="settings-item">
                    <label className="settings-label" htmlFor="confirm-password">Confirm New Password</label>
                    <input
                      id="confirm-password"
                      type="password"
                      className="settings-input"
                      placeholder="••••••••"
                    />
                  </div>

                  <button className="settings-btn settings-btn-primary">
                    Update Password
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'preferences' && (
              <div className="settings-section">
                <h3 className="settings-section-title">Preferences</h3>
                <p className="settings-section-description">
                  Customize your Mosaic experience.
                </p>

                <div className="settings-group">
                  <div className="settings-item">
                    <label className="settings-label" htmlFor="theme">Theme</label>
                    <select
                      id="theme"
                      className="settings-select"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value as 'default' | 'honeycomb' | 'forest' | 'coffee' | 'sakura')}
                    >
                      <option value="default">Default (Dark)</option>
                      <option value="honeycomb">Honeycomb (Golden)</option>
                      <option value="forest">Forest (Green)</option>
                      <option value="coffee">Coffee (Warm Browns)</option>
                      <option value="sakura">Sakura (Cherry Blossom)</option>
                    </select>
                  </div>

                  <div className="settings-item">
                    <label className="settings-label" htmlFor="language">Language</label>
                    <select
                      id="language"
                      className="settings-select"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="ja">日本語</option>
                    </select>
                  </div>

                  <div className="settings-item">
                    <label className="settings-label" htmlFor="timezone">Timezone</label>
                    <select id="timezone" className="settings-select">
                      <option value="utc">UTC</option>
                      <option value="est">Eastern Time</option>
                      <option value="pst">Pacific Time</option>
                      <option value="cst">Central Time</option>
                      <option value="mst">Mountain Time</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'privacy' && (
              <div className="settings-section">
                <h3 className="settings-section-title">Privacy & Security</h3>
                <p className="settings-section-description">
                  Control who can see your information and how your data is used.
                </p>

                <div className="settings-group">
                  <div className="settings-item-row">
                    <div className="settings-item-info">
                      <div className="settings-item-label">Public Profile</div>
                      <div className="settings-item-description">Allow others to view your profile</div>
                    </div>
                    <label className="settings-toggle">
                      <input
                        type="checkbox"
                        checked={publicProfile}
                        onChange={(e) => setPublicProfile(e.target.checked)}
                      />
                      <span className="settings-toggle-slider"></span>
                    </label>
                  </div>

                  <div className="settings-item-row">
                    <div className="settings-item-info">
                      <div className="settings-item-label">Show Email</div>
                      <div className="settings-item-description">Display email address on your public profile</div>
                    </div>
                    <label className="settings-toggle">
                      <input
                        type="checkbox"
                        checked={showEmail}
                        onChange={(e) => setShowEmail(e.target.checked)}
                      />
                      <span className="settings-toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="settings-divider" />

                <div className="settings-group">
                  <h4 className="settings-subsection-title">Data & Privacy</h4>
                  <button className="settings-btn settings-btn-secondary">
                    Download Your Data
                  </button>
                  <button className="settings-btn settings-btn-danger">
                    Delete Account
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="settings-section">
                <h3 className="settings-section-title">Notifications</h3>
                <p className="settings-section-description">
                  Choose how you want to be notified about activity.
                </p>

                <div className="settings-group">
                  <div className="settings-item-row">
                    <div className="settings-item-info">
                      <div className="settings-item-label">Email Notifications</div>
                      <div className="settings-item-description">Receive updates via email</div>
                    </div>
                    <label className="settings-toggle">
                      <input
                        type="checkbox"
                        checked={emailNotifications}
                        onChange={(e) => setEmailNotifications(e.target.checked)}
                      />
                      <span className="settings-toggle-slider"></span>
                    </label>
                  </div>

                  <div className="settings-item-row">
                    <div className="settings-item-info">
                      <div className="settings-item-label">Push Notifications</div>
                      <div className="settings-item-description">Receive browser push notifications</div>
                    </div>
                    <label className="settings-toggle">
                      <input
                        type="checkbox"
                        checked={pushNotifications}
                        onChange={(e) => setPushNotifications(e.target.checked)}
                      />
                      <span className="settings-toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="settings-divider" />

                <div className="settings-group">
                  <h4 className="settings-subsection-title">Email Preferences</h4>
                  <p className="settings-description-text">Select which emails you want to receive</p>
                  
                  <div className="settings-checkbox-group">
                    <label className="settings-checkbox-item">
                      <input type="checkbox" defaultChecked />
                      <span>New answers to your questions</span>
                    </label>
                    <label className="settings-checkbox-item">
                      <input type="checkbox" defaultChecked />
                      <span>Comments on your posts</span>
                    </label>
                    <label className="settings-checkbox-item">
                      <input type="checkbox" />
                      <span>Weekly digest of popular posts</span>
                    </label>
                    <label className="settings-checkbox-item">
                      <input type="checkbox" />
                      <span>New followers</span>
                    </label>
                    <label className="settings-checkbox-item">
                      <input type="checkbox" defaultChecked />
                      <span>Security alerts</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="settings-popup-footer">
          <button className="settings-btn settings-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="settings-btn settings-btn-primary" onClick={onClose}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPopup;
