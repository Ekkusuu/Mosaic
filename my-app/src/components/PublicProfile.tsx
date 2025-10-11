import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './PublicProfile.css';
import HexagonBackground from './HexagonBackground';
import NotesPopup from './NotesPopup';
import QuestionPopup from './QuestionPopup';
import CommentsPopup from './CommentsPopup';
import NoteViewer from './NoteViewer';

const PublicProfile: React.FC = () => {
    const navigate = useNavigate();
    const [showHonorPopup, setShowHonorPopup] = useState(false);
    const [showFollowersPopup, setShowFollowersPopup] = useState(false);
    const [showFollowingPopup, setShowFollowingPopup] = useState(false);
    const [showNotesPopup, setShowNotesPopup] = useState(false);
    const [showQuestionsPopup, setShowQuestionsPopup] = useState(false);
    const [showCommentsPopup, setShowCommentsPopup] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [selectedNote, setSelectedNote] = useState<any>(null);
    const [isNoteViewerOpen, setIsNoteViewerOpen] = useState(false);

    // Mock profile data for the public user
    const profileData = {
        name: 'Sarah Mitchell',
        username: 'sarahm',
        bio: 'Physics PhD student | Quantum mechanics enthusiast | Science communicator',
        university: 'MIT',
        year: '4th year',
        speciality: 'Quantum Physics',
        avatarUrl: null as string | null,
        honorLevel: 4
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    const handleFollowToggle = () => {
        setIsFollowing(!isFollowing);
        console.log(isFollowing ? 'Unfollowed' : 'Followed', profileData.username);
    };

    // Honor levels data
    const honorLevels = [
        {
            level: 1,
            name: 'Restricted',
            benefits: [],
            restrictions: ['Limited to 10 notes', 'No sharing capabilities', 'Basic upload limit (1MB)', 'No collaboration tools']
        },
        {
            level: 2,
            name: 'Limited',
            benefits: [],
            restrictions: ['Limited to 50 notes', 'Basic sharing only', 'Standard upload limit (5MB)', 'No advanced features']
        },
        {
            level: 3,
            name: 'Student',
            benefits: ['Full collaboration suite', 'Priority support', 'Advanced search', 'Unlimited notes'],
            restrictions: ['None']
        },
        {
            level: 4,
            name: 'Scholar',
            benefits: [
                '+ All Student benefits',
                'Premium templates',
                'Advanced analytics',
                'Beta features access',
                'Priority queue'
            ],
            restrictions: ['None']
        },
        {
            level: 5,
            name: 'Master',
            benefits: [
                '+ All Scholar benefits',
                'Direct developer contact',
                'Feature voting rights',
                'Custom integrations',
                'Exclusive Master features'
            ],
            restrictions: ['None']
        }
    ];

    const publicNotes = [
        {
            id: 1,
            title: 'Quantum Entanglement Fundamentals',
            description: 'Deep dive into quantum entanglement, Bell\'s theorem, and EPR paradox',
            subject: 'Physics',
            visibility: 'Public'
        },
        {
            id: 2,
            title: 'Schrödinger Equation Applications',
            description: 'Solving the time-dependent and time-independent Schrödinger equations',
            subject: 'Physics',
            visibility: 'Public'
        },
        {
            id: 3,
            title: 'Statistical Mechanics Overview',
            description: 'Ensemble theory, partition functions, and thermodynamic potentials',
            subject: 'Physics',
            visibility: 'Public'
        },
        {
            id: 4,
            title: 'Quantum Computing Basics',
            description: 'Introduction to qubits, quantum gates, and simple quantum algorithms',
            subject: 'Computer Science',
            visibility: 'Public'
        }
    ];

    // Mock data for questions
    const userQuestions = [
        { id: 1, title: 'What are the practical applications of quantum tunneling?', timestamp: '3 hours ago', votes: 12, answers: 7 },
        { id: 2, title: 'How to interpret wave function collapse in quantum mechanics?', timestamp: '2 days ago', votes: 18, answers: 11 },
        { id: 3, title: 'Best resources for learning quantum field theory?', timestamp: '5 days ago', votes: 9, answers: 4 }
    ];

    // Mock data for comments
    const userComments = [
        { id: 1, content: 'Excellent breakdown of the double-slit experiment! The visualization really helps.', timestamp: '1 day ago' },
        { id: 2, content: 'Have you considered adding more details about the Copenhagen interpretation?', timestamp: '3 days ago' },
        { id: 3, content: 'This is exactly what I needed for my quantum mechanics final. Thank you!', timestamp: '1 week ago' }
    ];

    // Mock data for tags
    const userTags: string[] = ['quantum-mechanics', 'physics', 'thermodynamics', 'quantum-computing'];

    // Mock data for followers (increased count)
    const followers = [
        { id: 1, name: 'Michael Chen', username: 'michaelc', avatarUrl: null, bio: 'Physics major, interested in particle physics' },
        { id: 2, name: 'Emily Rodriguez', username: 'emilyr', avatarUrl: null, bio: 'Quantum computing researcher' },
        { id: 3, name: 'James Wilson', username: 'jamesw', avatarUrl: null, bio: 'Engineering student with physics background' },
        { id: 4, name: 'Lisa Thompson', username: 'lisat', avatarUrl: null, bio: 'PhD candidate in theoretical physics' },
        { id: 5, name: 'David Park', username: 'davidp', avatarUrl: null, bio: 'Science educator and content creator' }
    ];

    // Mock data for following
    const following = [
        { id: 1, name: 'Richard Feynman Jr', username: 'rfeynman', avatarUrl: null, bio: 'Theoretical physicist and lecturer' },
        { id: 2, name: 'Marie Curie Institute', username: 'curielab', avatarUrl: null, bio: 'Research institution account' },
        { id: 3, name: 'Neil deGrasse', username: 'neiltyson', avatarUrl: null, bio: 'Astrophysicist and science communicator' }
    ];

    // Mock activity data: posts per month for the last 12 months
    const activityData = [8, 12, 15, 10, 14, 18, 22, 19, 16, 24, 20, 28];
    const maxActivity = Math.max(...activityData, 1);

    const handleViewNote = (note: any) => {
        const detailedNote = {
            ...note,
            content: `<h2>Introduction</h2>
<p>This is the content of ${note.title.toLowerCase()}. In a real application, this content would come from your backend database.</p>

<h3>Key Points</h3>
<ul>
  <li>Important concept #1</li>
  <li>Important concept #2</li>
  <li>Important concept #3</li>
</ul>

<blockquote>This is a relevant quote that adds value to the discussion and provides additional context.</blockquote>

<h3>Implementation Details</h3>
<p>When implementing this concept, consider the following approach:</p>

<pre><code>function example() {
  const data = fetchData();
  return data.map(item => ({
    id: item.id,
    name: item.name,
    processed: true
  }));
}</code></pre>

<p>Make sure to follow best practices for optimal results.</p>`,
            author: {
                name: profileData.name,
                username: profileData.username,
                honorLevel: profileData.honorLevel
            },
            createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            views: Math.floor(Math.random() * 1000) + 100,
            likes: Math.floor(Math.random() * 100) + 10,
            tags: note.subject ? [note.subject.toLowerCase()] : [],
            attachments: []
        };

        setSelectedNote(detailedNote);
        setIsNoteViewerOpen(true);
    };

    const closeNoteViewer = () => {
        setIsNoteViewerOpen(false);
        setSelectedNote(null);
    };

    return (
        <div className="public-profile-container">
            <HexagonBackground />
            <button
                onClick={() => navigate('/')}
                className="back-btn"
                aria-label="Go back"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
            </button>

            <div className="public-profile-content">
                <div className="public-profile-layout">
                    {/* Left sidebar */}
                    <div className="public-profile-sidebar">
                        <div className="public-profile-avatar">
                            {profileData.avatarUrl ? (
                                <img src={profileData.avatarUrl} alt={profileData.name} />
                            ) : (
                                getInitials(profileData.name)
                            )}
                        </div>
                        <div className="public-profile-name">{profileData.name}</div>
                        <div className="public-profile-username">@{profileData.username}</div>
                        {profileData.bio && (
                            <div className="public-profile-bio">{profileData.bio}</div>
                        )}

                        {/* Academic info */}
                        {(profileData.university || profileData.year || profileData.speciality) && (
                            <div className="academic-info">
                                {profileData.university && (
                                    <div className="academic-item">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                                            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                                        </svg>
                                        <span>{profileData.university}</span>
                                    </div>
                                )}
                                {profileData.year && (
                                    <div className="academic-item">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                            <line x1="16" y1="2" x2="16" y2="6"/>
                                            <line x1="8" y1="2" x2="8" y2="6"/>
                                            <line x1="3" y1="10" x2="21" y2="10"/>
                                        </svg>
                                        <span>{profileData.year}</span>
                                    </div>
                                )}
                                {profileData.speciality && (
                                    <div className="academic-item">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                                        </svg>
                                        <span>{profileData.speciality}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="public-profile-stats">
                            <button
                                className="stat-item clickable"
                                onClick={() => setShowFollowersPopup(true)}
                            >
                                <span className="stat-number">{followers.length}</span>
                                <span>followers</span>
                            </button>
                            <button
                                className="stat-item clickable"
                                onClick={() => setShowFollowingPopup(true)}
                            >
                                <span className="stat-number">{following.length}</span>
                                <span>following</span>
                            </button>
                            <button
                                className="honor-level"
                                onClick={() => setShowHonorPopup(true)}
                            >
                                <div className="honor-badge">{profileData.honorLevel}</div>
                                <span>honor</span>
                            </button>
                        </div>

                        <button
                            onClick={handleFollowToggle}
                            className={`follow-profile-btn ${isFollowing ? 'following' : ''}`}
                        >
                            {isFollowing ? (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                    Following
                                </>
                            ) : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="12" y1="5" x2="12" y2="19"/>
                                        <line x1="5" y1="12" x2="19" y2="12"/>
                                    </svg>
                                    Follow
                                </>
                            )}
                        </button>
                    </div>

                    {/* Main content */}
                    <div className="public-profile-main">
                        {/* Activity Section */}
                        <div className="content-section">
                            <div className="section-header">
                                <h2 className="section-title">Activity</h2>
                            </div>
                            <div className="activity-card">
                                <div className="activity-stats">
                                    <div className="stat">
                                        <div className="stat-value">{userQuestions.length}</div>
                                        <div className="stat-label">questions</div>
                                    </div>
                                    <div className="stat">
                                        <div className="stat-value">{userComments.length}</div>
                                        <div className="stat-label">comments</div>
                                    </div>
                                    <div className="stat">
                                        <div className="stat-value">{publicNotes.length}</div>
                                        <div className="stat-label">notes</div>
                                    </div>
                                </div>
                                <div className="sparkline-wrap">
                                    <svg viewBox="0 0 240 60" preserveAspectRatio="none" className="sparkline">
                                        <polyline
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            points={activityData.map((v, i) => {
                                                const x = (i / (activityData.length - 1)) * 240;
                                                const y = 60 - (v / maxActivity) * 50 - 5;
                                                return `${x},${y}`;
                                            }).join(' ')}
                                        />
                                    </svg>
                                    <div className="sparkline-footer">last 12 months</div>
                                </div>
                            </div>
                        </div>

                        {/* Public Notes Section */}
                        <div className="content-section">
                            <div className="section-header">
                                <h2 className="section-title">Public notes</h2>
                            </div>
                            <div className="notes-grid">
                                {publicNotes.map(note => (
                                    <div 
                                        key={note.id} 
                                        className="note-card"
                                        onClick={() => handleViewNote(note)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="note-header">
                                            <div className="note-header-left">
                                                <div className="note-title">
                                                    {note.title}
                                                </div>
                                                <span className="note-visibility">{note.visibility}</span>
                                            </div>
                                        </div>
                                        <p className="note-description">
                                            {note.description}
                                        </p>
                                        <div className="note-meta">
                                            <div className="note-subject">
                                                <span className={`subject-dot ${note.subject.toLowerCase().replace(/\s+/g, '-')}`}></span>
                                                <span>{note.subject}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                className="see-all-btn"
                                onClick={() => setShowNotesPopup(true)}
                            >
                                See all public notes
                            </button>
                        </div>

                        {/* Questions Section */}
                        <div className="content-section">
                            <div className="section-header">
                                <h2 className="section-title">Questions</h2>
                            </div>
                            <div className="list-container">
                                {userQuestions.map(q => (
                                    <div 
                                        key={q.id} 
                                        className="list-item"
                                        onClick={() => console.log('Question clicked:', q.title)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="item-title">{q.title}</div>
                                        <div className="item-meta">
                                            <span className="badge">{q.votes} votes</span>
                                            <span className="badge">{q.answers} answers</span>
                                            <span className="muted">{q.timestamp}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                className="see-all-btn"
                                onClick={() => setShowQuestionsPopup(true)}
                            >
                                See all questions
                            </button>
                        </div>

                        {/* Comments Section */}
                        <div className="content-section">
                            <div className="section-header">
                                <h2 className="section-title">Comments</h2>
                            </div>
                            <div className="list-container">
                                {userComments.map(c => (
                                    <div 
                                        key={c.id} 
                                        className="list-item"
                                        onClick={() => console.log('Comment clicked:', c.content)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="item-body">{c.content}</div>
                                        <div className="item-meta">
                                            <span className="muted">{c.timestamp}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                className="see-all-btn"
                                onClick={() => setShowCommentsPopup(true)}
                            >
                                See all comments
                            </button>
                        </div>

                        {/* Tags Section */}
                        <div className="content-section">
                            <div className="section-header">
                                <h2 className="section-title">Tags</h2>
                            </div>
                            <div className="tags-container">
                                {userTags.length === 0 ? (
                                    <div className="empty-state">No tags yet</div>
                                ) : (
                                    <div className="tag-list">
                                        {userTags.map(tag => (
                                            <span key={tag} className="tag">{tag}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Honor Level Popup */}
            {showHonorPopup && (
                <div className="honor-popup-overlay" onClick={() => setShowHonorPopup(false)}>
                    <div className="honor-popup" onClick={(e) => e.stopPropagation()}>
                        <div className="honor-popup-header">
                            <h3 className="honor-popup-title">Honor Levels</h3>
                        </div>
                        <div className="honor-levels-container">
                            {honorLevels.map((honor) => (
                                <div
                                    key={honor.level}
                                    className={`honor-level-card ${honor.level === profileData.honorLevel ? 'current' : ''}`}
                                >
                                    <div className="honor-level-header">
                                        <div className="honor-level-badge">{honor.level}</div>
                                        <div className="honor-level-name">{honor.name}</div>
                                        {honor.level === profileData.honorLevel && (
                                            <div className="current-badge">Current</div>
                                        )}
                                    </div>
                                    <div className="honor-level-content">
                                        {honor.benefits.length > 0 && (
                                            <div className="honor-section">
                                                <h4 className="honor-section-title">Benefits</h4>
                                                <ul className="honor-list">
                                                    {honor.benefits.map((benefit, index) => (
                                                        <li key={index} className={`honor-item benefit ${benefit.startsWith('+') ? 'inherited' : ''}`}>
                                                            {benefit.startsWith('+') ? (
                                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                                    <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                                                </svg>
                                                            ) : (
                                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                                </svg>
                                                            )}
                                                            {benefit}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {honor.restrictions[0] !== 'None' && (
                                            <div className="honor-section">
                                                <h4 className="honor-section-title">Restrictions</h4>
                                                <ul className="honor-list">
                                                    {honor.restrictions.map((restriction, index) => (
                                                        <li key={index} className="honor-item restriction">
                                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                                <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                                            </svg>
                                                            {restriction}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Followers Popup */}
            {showFollowersPopup && (
                <div className="follow-popup-overlay" onClick={() => setShowFollowersPopup(false)}>
                    <div className="follow-popup" onClick={(e) => e.stopPropagation()}>
                        <div className="follow-popup-header">
                            <h3 className="follow-popup-title">Followers</h3>
                        </div>
                        <div className="follow-list">
                            {followers.map((user) => (
                                <div key={user.id} className="follow-item">
                                    <div className="follow-avatar">
                                        {user.avatarUrl ? (
                                            <img src={user.avatarUrl} alt={user.name} />
                                        ) : (
                                            user.name.split(' ').map(n => n[0]).join('').toUpperCase()
                                        )}
                                    </div>
                                    <div className="follow-info">
                                        <div className="follow-name">{user.name}</div>
                                        <div className="follow-username">@{user.username}</div>
                                        {user.bio && <div className="follow-bio">{user.bio}</div>}
                                    </div>
                                    <button className="follow-btn">View</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Following Popup */}
            {showFollowingPopup && (
                <div className="follow-popup-overlay" onClick={() => setShowFollowingPopup(false)}>
                    <div className="follow-popup" onClick={(e) => e.stopPropagation()}>
                        <div className="follow-popup-header">
                            <h3 className="follow-popup-title">Following</h3>
                        </div>
                        <div className="follow-list">
                            {following.map((user) => (
                                <div key={user.id} className="follow-item">
                                    <div className="follow-avatar">
                                        {user.avatarUrl ? (
                                            <img src={user.avatarUrl} alt={user.name} />
                                        ) : (
                                            user.name.split(' ').map(n => n[0]).join('').toUpperCase()
                                        )}
                                    </div>
                                    <div className="follow-info">
                                        <div className="follow-name">{user.name}</div>
                                        <div className="follow-username">@{user.username}</div>
                                        {user.bio && <div className="follow-bio">{user.bio}</div>}
                                    </div>
                                    <button className="follow-btn">View</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Notes Popup */}
            <NotesPopup
                isOpen={showNotesPopup}
                onClose={() => setShowNotesPopup(false)}
                notes={publicNotes}
                onViewNote={handleViewNote}
            />

            {/* Questions Popup */}
            <QuestionPopup
                isOpen={showQuestionsPopup}
                onClose={() => setShowQuestionsPopup(false)}
                questions={userQuestions}
            />

            {/* Comments Popup */}
            <CommentsPopup
                isOpen={showCommentsPopup}
                onClose={() => setShowCommentsPopup(false)}
                comments={userComments}
            />

            {/* Note Viewer */}
            <NoteViewer
                isOpen={isNoteViewerOpen}
                onClose={closeNoteViewer}
                note={selectedNote}
            />
        </div>
    );
};

export default PublicProfile;