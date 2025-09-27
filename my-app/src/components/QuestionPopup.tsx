import React from 'react';
import './QuestionPopup.css';

interface Question {
    id: number;
    title: string;
    timestamp: string;
    votes: number;
    answers: number;
    tags?: string[];
    subject?: string;
    description?: string;
    status?: 'open' | 'answered' | 'closed';
}

interface QuestionPopupProps {
    isOpen: boolean;
    onClose: () => void;
    questions: Question[];
}

const QuestionPopup: React.FC<QuestionPopupProps> = ({ isOpen, onClose, questions }) => {
    if (!isOpen) return null;

    const getStatusClass = (status: string = 'open') => {
        switch (status) {
            case 'answered':
                return 'question-status answered';
            case 'closed':
                return 'question-status closed';
            default:
                return 'question-status open';
        }
    };

    const getSubjectDotClass = (subject: string = '') => {
        switch (subject.toLowerCase()) {
            case 'mathematics':
                return 'subject-dot mathematics';
            case 'physics':
                return 'subject-dot physics';
            case 'chemistry':
                return 'subject-dot chemistry';
            case 'biology':
                return 'subject-dot biology';
            case 'computer science':
                return 'subject-dot computer-science';
            case 'economics':
                return 'subject-dot economics';
            case 'psychology':
                return 'subject-dot psychology';
            case 'history':
                return 'subject-dot history';
            case 'literature':
                return 'subject-dot literature';
            case 'engineering':
                return 'subject-dot engineering';
            case 'medicine':
                return 'subject-dot medicine';
            case 'law':
                return 'subject-dot law';
            default:
                return 'subject-dot';
        }
    };

    // Add some additional mock questions for demonstration
    const allQuestions = [
        ...questions,
        {
            id: 5,
            title: 'What are the best study techniques for memorizing large amounts of information?',
            timestamp: '4 days ago',
            votes: 12,
            answers: 8,
            tags: ['study-methods', 'memory', 'productivity'],
            subject: 'Psychology',
            description: 'I need to memorize a lot of material for my upcoming exams. What proven techniques work best?',
            status: 'answered' as const
        },
        {
            id: 6,
            title: 'How do you solve differential equations with separation of variables?',
            timestamp: '1 week ago',
            votes: 6,
            answers: 3,
            tags: ['calculus', 'differential-equations', 'mathematics'],
            subject: 'Mathematics',
            description: 'I\'m struggling with the method of separation of variables in differential equations.',
            status: 'answered' as const
        },
        {
            id: 7,
            title: 'What is the difference between prokaryotic and eukaryotic cells?',
            timestamp: '1 week ago',
            votes: 9,
            answers: 4,
            tags: ['cell-biology', 'basic-concepts'],
            subject: 'Biology',
            description: 'Can someone explain the key structural and functional differences?',
            status: 'answered' as const
        },
        {
            id: 8,
            title: 'How does supply and demand affect market equilibrium?',
            timestamp: '2 weeks ago',
            votes: 5,
            answers: 2,
            tags: ['microeconomics', 'market-theory'],
            subject: 'Economics',
            description: 'I need help understanding how these forces interact to determine prices.',
            status: 'open' as const
        },
        {
            id: 9,
            title: 'What are the main causes of World War I?',
            timestamp: '2 weeks ago',
            votes: 8,
            answers: 6,
            tags: ['world-war-1', 'european-history'],
            subject: 'History',
            description: 'Looking for a comprehensive overview of the political and economic factors.',
            status: 'answered' as const
        },
        {
            id: 10,
            title: 'How do you balance chemical equations systematically?',
            timestamp: '3 weeks ago',
            votes: 11,
            answers: 7,
            tags: ['chemical-equations', 'stoichiometry'],
            subject: 'Chemistry',
            description: 'Is there a step-by-step method that works for complex equations?',
            status: 'answered' as const
        }
    ];

    return (
        <div className="questions-popup-overlay" onClick={onClose}>
            <div className="questions-popup" onClick={(e) => e.stopPropagation()}>
                <div className="questions-popup-header">
                    <h2 className="questions-popup-title">All My Questions</h2>
                    <div className="questions-popup-stats">
                        <span className="questions-count">{allQuestions.length} questions</span>
                        <div className="questions-filter">
                            <select className="filter-select">
                                <option value="all">All questions</option>
                                <option value="open">Open only</option>
                                <option value="answered">Answered only</option>
                                <option value="closed">Closed only</option>
                            </select>
                            <select className="sort-select">
                                <option value="recent">Recently asked</option>
                                <option value="votes">Most votes</option>
                                <option value="answers">Most answers</option>
                            </select>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="questions-popup-close"
                        aria-label="Close popup"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <div className="questions-popup-content">
                    <div className="questions-list-popup">
                        {allQuestions.map((question) => (
                            <div key={question.id} className="question-card-popup">
                                <div className="question-card-header">
                                    <div className="question-title-section">
                                        <h3 className="question-title-popup">{question.title}</h3>
                                        <span className={getStatusClass(question.status)}>
                                            {question.status || 'open'}
                                        </span>
                                    </div>
                                    <div className="question-actions">
                                        <button className="question-action-btn" aria-label="Edit question">
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Z" fill="currentColor"/>
                                                <path d="m5.738 9.262l3 3" stroke="currentColor" strokeWidth="0.75"/>
                                            </svg>
                                        </button>
                                        <button className="question-action-btn" aria-label="More options">
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <circle cx="8" cy="2" r="1.5" fill="currentColor"/>
                                                <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                                                <circle cx="8" cy="14" r="1.5" fill="currentColor"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {question.description && (
                                    <p className="question-description-popup">{question.description}</p>
                                )}

                                <div className="question-stats-popup">
                                    <div className="stat-item">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M8 1l2.5 5 5.5.5-4 4 1 5.5L8 13l-5 2.5 1-5.5-4-4 5.5-.5L8 1z" stroke="currentColor" strokeWidth="1" fill="none"/>
                                        </svg>
                                        <span>{question.votes} votes</span>
                                    </div>
                                    <div className="stat-item">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4.414l-2.707 2.707A1 1 0 0 1 0 13V2a1 1 0 0 1 1-1h13z" stroke="currentColor" strokeWidth="1" fill="none"/>
                                        </svg>
                                        <span>{question.answers} answers</span>
                                    </div>
                                    <span className="question-timestamp">{question.timestamp}</span>
                                </div>

                                <div className="question-meta-popup">
                                    {question.subject && (
                                        <div className="question-subject-popup">
                                            <div className={getSubjectDotClass(question.subject)}></div>
                                            <span>{question.subject}</span>
                                        </div>
                                    )}
                                </div>

                                {question.tags && question.tags.length > 0 && (
                                    <div className="question-tags-popup">
                                        {question.tags.map((tag, index) => (
                                            <span key={index} className="question-tag">{tag}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuestionPopup;