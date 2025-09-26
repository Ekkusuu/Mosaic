import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './MainPage.css';
import Logo from './Logo';
import HexagonBackground from './HexagonBackground';

// Navbar Component
interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

interface NavbarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ isOpen, onClose }) => {
  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9,22 9,12 15,12 15,22" />
        </svg>
      ),
      href: '#home'
    },
    {
      id: 'about',
      label: 'About',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      href: '#about'
    },
    {
      id: 'contact',
      label: 'Contact',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      ),
      href: '#contact'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
      href: '#settings'
    },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className={`overlay ${isOpen ? 'overlay-visible' : ''}`}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="logo-container">
            <h2 className="logo-title"><Logo /></h2>
          </div>
          <button onClick={onClose} className="close-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.id}>
                <a href={item.href} className="nav-item" onClick={onClose}>
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
        </div>
      </div>
    </>
  );
};

// Main Page Component
const MainPage: React.FC = () => {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'notes' | 'ai'>('posts');
  const [chatMessages, setChatMessages] = useState<{ id: number; role: 'user' | 'assistant'; content: string }[]>([
    { id: 1, role: 'assistant', content: 'Hi! I\'m Mosaic AI. How can I help?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const openNav = () => setIsNavOpen(true);
  const closeNav = () => setIsNavOpen(false);
  const navigate = useNavigate();

  // Mock feed data (feel free to wire to backend later)
  const postFeed = useMemo(
    () => [
      { id: 1, title: 'Cleanup MySQL tables after duplicate records', tags: ['mysql'], votes: 0, answers: 0, views: 7, time: '1 min ago' },
      { id: 2, title: 'Spring Migration - getting NoClassDefFoundError during bootrun', tags: ['spring-boot', 'spring-mvc'], votes: 0, answers: 0, views: 3, time: '2 mins ago' },
      { id: 3, title: 'Why do two links to the same element scroll differently?', tags: ['html', 'anchor', 'hashlink'], votes: 0, answers: 0, views: 45, time: '2 mins ago' },
    ],
    []
  );

  const publicNotesFeed = useMemo(
    () => [
      { id: 11, title: 'React component patterns', tags: ['react', 'typescript'], summary: 'Practical patterns for scalable components and hooks.' },
      { id: 12, title: 'SQL cheat sheet', tags: ['sql', 'mysql'], summary: 'Most used selects, joins, windows, with examples.' },
      { id: 13, title: 'Spring Boot quickstart', tags: ['spring-boot', 'java'], summary: 'Annotations, profiles, test slices, and common pitfalls.' },
    ],
    []
  );

  return (
    <div className="main-page">
      <HexagonBackground />
      {/* Menu Button */}
      <button onClick={openNav} className="menu-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Profile Button (top-right) */}
      <button className="profile-btn" aria-label="Profile" onClick={() => { navigate('/profile'); }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>

      {/* Navbar */}
      <Navbar isOpen={isNavOpen} onClose={closeNav} />

      {/* Page Content */}
      <div className="main-foreground">
        <main className="home-layout">
          {/* Top Search */}
          <form
            className="search-bar"
            role="search"
            aria-label="Search posts and notes"
            onSubmit={(e) => { e.preventDefault(); setActiveTab('posts'); }}
          >
            <span className="search-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              className="search-input"
              type="search"
              placeholder="Search Mosaic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="search-submit" type="submit">Search</button>
          </form>
          {/* Left rail (separate from slide-out menu) */}
          <aside className="left-rail" aria-label="Home sections">
            <div className="brand-block">
              <div className="brand-title">Mosaic</div>
              <div className="brand-sub">Find great answers and public notes</div>
            </div>
            <div className="rail-nav" role="navigation" aria-label="Browse">
              <div className="rail-header">
                <span className="rail-icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </span>
                <h3 className="rail-title">Browse</h3>
              </div>

              <div className="rail-group">
                <button
                  className={`rail-btn ${activeTab === 'posts' ? 'active' : ''}`}
                  onClick={() => setActiveTab('posts')}
                >
                  <span className="btn-icon" aria-hidden>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="2.5 2.5 19 20">                      
                    <path d="M21 15V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10"></path>                      
                    <path d="M7 22h10a2 2 0 0 0 2-2v-5H5v5a2 2 0 0 0 2 2z"></path>                    
                    </svg>
                  </span>
                  Posts
                </button>
                <button
                  className={`rail-btn ${activeTab === 'notes' ? 'active' : ''}`}
                  onClick={() => setActiveTab('notes')}
                >
                  <span className="btn-icon" aria-hidden>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="1.5 3.5 17 13">
                      <path d="M4 4h12a2 2 0 0 1 2 2v10l-4-3-4 3-4-3-4 3V6a2 2 0 0 1 2-2z" />
                    </svg>
                  </span>
                  Public notes
                </button>
                <button
                  className={`rail-btn ${activeTab === 'ai' ? 'active' : ''}`}
                  onClick={() => setActiveTab('ai')}
                >
                  <span className="btn-icon" aria-hidden>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="2.5 2.5 19 15">
                      <path d="M12 3c4.97 0 9 3.134 9 7 0 2.18-1.255 4.13-3.236 5.428.06.515.236 1.54.236 1.54s-1.3-.27-2.08-.59C14.7 16.79 13.38 17 12 17c-4.97 0-9-3.134-9-7s4.03-7 9-7z" />
                    </svg>
                  </span>
                  AI
                </button>
              </div>
            </div>
          </aside>

          {/* Main feed */}
          <section className="feed" aria-live="polite">
            {activeTab === 'posts' ? (
              <>
                <div className="section-header"><h2 className="section-title">Interesting posts for you</h2></div>
                <div className="posts-container">
                  {postFeed.map(post => (
                    <article key={post.id} className="post-row">
                      <div className="card-stats">
                        <span className="stat"><strong>{post.votes}</strong> votes</span>
                        <span className="stat"><strong>{post.answers}</strong> answers</span>
                        <span className="stat muted">{post.views} views</span>
                      </div>
                      <a href="#" className="card-title">{post.title}</a>
                      <div className="card-footer">
                        <div className="tags">
                          {post.tags.map(t => (
                            <span key={t} className="tag">{t}</span>
                          ))}
                        </div>
                        <span className="muted time">{post.time}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : activeTab === 'notes' ? (
              <>
                <div className="section-header"><h2 className="section-title">Public notes for your tags</h2></div>
                <div className="notes-container">
                  <div className="card-grid">
                    {publicNotesFeed.map(note => (
                      <article key={note.id} className="note-card">
                        <a href="#" className="card-title">{note.title}</a>
                        <p className="note-summary">{note.summary}</p>
                        <div className="tags">
                          {note.tags.map(t => (
                            <span key={t} className="tag">{t}</span>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="section-header"><h2 className="section-title">Mosaic AI Assistant</h2><div className="section-subtitle">Ask questions about posts, notes, or anything technical.</div></div>
                <div className="ai-chat-container">
                  <div className="ai-messages">
                    {chatMessages.map(m => (
                      <div key={m.id} className={`ai-message ${m.role}`}>
                        <div className="bubble">{m.content}</div>
                      </div>
                    ))}
                  </div>
                  <form
                    className="ai-input-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const trimmed = chatInput.trim();
                      if (!trimmed) return;
                      const userMsg = { id: Date.now(), role: 'user' as const, content: trimmed };
                      setChatMessages(prev => [...prev, userMsg, { id: Date.now() + 1, role: 'assistant', content: 'This is a placeholder response. Wire me to your backend when ready.' }]);
                      setChatInput('');
                      setAttachedFiles([]);
                    }}
                  >
                    <input
                      id="ai-file-input"
                      type="file"
                      multiple
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length) {
                          setAttachedFiles(prev => {
                            const existing = new Set(prev.map(f => f.name + f.size));
                            const uniques = files.filter(f => !existing.has(f.name + f.size));
                            return [...prev, ...uniques];
                          });
                        }
                        e.currentTarget.value = '';
                      }}
                    />
                    <button
                      className="ai-attach"
                      type="button"
                      aria-label="Attach files"
                      title={attachedFiles.length ? `${attachedFiles.length} file(s) selected` : 'Attach files'}
                      onClick={() => {
                        const el = document.getElementById('ai-file-input') as HTMLInputElement | null;
                        el?.click();
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 1 1-8.49-8.49l9.19-9.19a4 4 0 1 1 5.66 5.66l-9.2 9.19a2 2 0 1 1-2.83-2.83l8.49-8.48" />
                      </svg>
                      {attachedFiles.length > 0 && (
                        <span className="ai-attach-count" aria-hidden>{attachedFiles.length}</span>
                      )}
                    </button>
                    <input
                      className="ai-input"
                      placeholder="Message Mosaic AI..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                    />
                    <button className="ai-send" type="submit" aria-label="Send">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 2L11 13" />
                        <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                      </svg>
                    </button>
                  </form>
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default MainPage;