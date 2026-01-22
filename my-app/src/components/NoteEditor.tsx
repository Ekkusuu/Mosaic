import React, { useState, useRef, useEffect } from 'react';
import './NoteEditor.css';

interface Note {
    id?: number;
    title: string;
    content: string;
    subject: string;
    visibility: 'Public' | 'Private';
    tags: string[];
    attachments: File[];
}

interface NoteEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (note: Note) => void;
    existingNote?: Note;
    mode: 'create' | 'edit';
}

const NoteEditor: React.FC<NoteEditorProps> = ({ 
    isOpen, 
    onClose, 
    onSave, 
    existingNote, 
    mode = 'create' 
}) => {
    const [noteData, setNoteData] = useState<Note>({
        title: existingNote?.title || '',
        content: existingNote?.content || '',
        subject: existingNote?.subject || '',
        visibility: existingNote?.visibility || 'Private',
        tags: existingNote?.tags || [],
        attachments: existingNote?.attachments || []
    });

    const [newTag, setNewTag] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const subjects = [
        'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
        'Economics', 'Psychology', 'History', 'Literature', 'Engineering',
        'Medicine', 'Law', 'Philosophy', 'Art', 'Music', 'Other'
    ];

    // Convert markdown attachment syntax to HTML references
    const markdownToHtml = (markdown: string): string => {
        // Convert {attach: file="index", name="display name"} to HTML references
        return markdown.replace(/\{attach:\s*file="(\d+)"\s*,\s*name="([^"]+)"\}/g, (match, fileIndex, displayName) => {
            const index = parseInt(fileIndex);
            const file = noteData.attachments[index];
            
            if (!file) return match; // Keep original if file not found
            
            const isImage = file.type.startsWith('image/');
            const icon = isImage ? `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21,15 16,10 5,21"></polyline>
                </svg>
            ` : `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14,2 14,8 20,8"></polyline>
                </svg>
            `;
            
            const className = isImage ? 'image-reference' : 'document-reference';
            return `<span class="${className}" contenteditable="false" data-file-index="${fileIndex}" style="cursor: pointer;">${icon}${displayName}</span>`;
        });
    };

    // Convert HTML references to markdown attachment syntax
    const htmlToMarkdown = (html: string): string => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Find all reference elements
        const references = tempDiv.querySelectorAll('.document-reference, .image-reference');
        references.forEach(ref => {
            const fileIndex = ref.getAttribute('data-file-index') || '0';
            const displayName = ref.textContent?.trim() || '';
            const markdownRef = `{attach: file="${fileIndex}", name="${displayName}"}`;
            ref.replaceWith(markdownRef);
        });
        
        return tempDiv.innerHTML;
    };

    // Set initial content when component mounts or existingNote changes
    useEffect(() => {
        if (contentRef.current && isOpen) {
            // Clear first to avoid any content conflicts
            contentRef.current.innerHTML = '';
            // Then set the content if it exists
            if (noteData.content) {
                // Convert markdown format to HTML for editing
                const htmlContent = markdownToHtml(noteData.content);
                contentRef.current.innerHTML = htmlContent;
            }
            
            // Add event listeners for reference editing and content elements
            addReferenceEventListeners();
            addContentElementsListeners();
        }
    }, [isOpen]); // Only run when editor opens

    const addContentElementsListeners = () => {
        if (!contentRef.current) return;
        
        // Make code blocks and blockquotes properly editable
        const codeBlocks = contentRef.current.querySelectorAll('pre code');
        const blockquotes = contentRef.current.querySelectorAll('blockquote');
        
        codeBlocks.forEach(code => {
            code.setAttribute('contenteditable', 'true');
            code.addEventListener('input', handleContentChange);
            code.addEventListener('keydown', handleCodeBlockKeydown);
        });
        
        blockquotes.forEach(quote => {
            quote.setAttribute('contenteditable', 'true');
            quote.addEventListener('input', handleContentChange);
            quote.addEventListener('keydown', handleBlockquoteKeydown);
        });
    };

    const handleContentChange = () => {
        if (contentRef.current) {
            const content = contentRef.current.innerHTML;
            setNoteData(prev => ({ ...prev, content }));
        }
    };

    const handleSpaceKey = (e: React.KeyboardEvent) => {
        if (!contentRef.current) return;
        
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const currentNode = range.startContainer;

        if (currentNode.nodeType !== Node.TEXT_NODE) return;

        // Get text before cursor (including the space that was just typed)
        const textBeforeCursor = currentNode.textContent?.substring(0, range.startOffset) || '';
        
        // Check for markdown patterns and use the same formatText function as buttons
        if (/^##\s$/.test(textBeforeCursor)) {
            // Select and delete the "## "
            const newRange = document.createRange();
            newRange.setStart(currentNode, 0);
            newRange.setEnd(currentNode, 3); // "## " is 3 characters
            selection.removeAllRanges();
            selection.addRange(newRange);
            document.execCommand('delete', false);
            
            // Now apply heading format using the same method as button
            formatText('formatBlock', 'h2');
        } else if (/^###\s$/.test(textBeforeCursor)) {
            const newRange = document.createRange();
            newRange.setStart(currentNode, 0);
            newRange.setEnd(currentNode, 4); // "### " is 4 characters
            selection.removeAllRanges();
            selection.addRange(newRange);
            document.execCommand('delete', false);
            
            formatText('formatBlock', 'h3');
        } else if (/^-\s$/.test(textBeforeCursor) || /^\*\s$/.test(textBeforeCursor)) {
            const newRange = document.createRange();
            newRange.setStart(currentNode, 0);
            newRange.setEnd(currentNode, 2); // "- " or "* " is 2 characters
            selection.removeAllRanges();
            selection.addRange(newRange);
            document.execCommand('delete', false);
            
            formatText('insertUnorderedList');
        } else if (/^\d+\.\s$/.test(textBeforeCursor)) {
            const matchLen = textBeforeCursor.length; // Variable length for "1. ", "12. " etc
            const newRange = document.createRange();
            newRange.setStart(currentNode, 0);
            newRange.setEnd(currentNode, matchLen);
            selection.removeAllRanges();
            selection.addRange(newRange);
            document.execCommand('delete', false);
            
            formatText('insertOrderedList');
        } else if (/^>\s$/.test(textBeforeCursor)) {
            const newRange = document.createRange();
            newRange.setStart(currentNode, 0);
            newRange.setEnd(currentNode, 2); // "> " is 2 characters
            selection.removeAllRanges();
            selection.addRange(newRange);
            document.execCommand('delete', false);
            
            insertQuote();
        } else if (/^```\s$/.test(textBeforeCursor)) {
            const newRange = document.createRange();
            newRange.setStart(currentNode, 0);
            newRange.setEnd(currentNode, 4); // "``` " is 4 characters
            selection.removeAllRanges();
            selection.addRange(newRange);
            document.execCommand('delete', false);
            
            insertCodeBlock();
        }
    };

    const handleRealtimeMarkdown = () => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const currentNode = range.startContainer;
        
        if (currentNode.nodeType !== Node.TEXT_NODE) return;
        
        const textContent = currentNode.textContent || '';
        const cursorPos = range.startOffset;

        // Save cursor position
        const saveCursor = () => {
            const newRange = document.createRange();
            const sel = window.getSelection();
            try {
                newRange.setStart(currentNode, Math.min(cursorPos, currentNode.textContent?.length || 0));
                newRange.collapse(true);
                sel?.removeAllRanges();
                sel?.addRange(newRange);
            } catch (e) {
                // Cursor position invalid, ignore
            }
        };

        // Check for **bold** pattern
        const boldPattern = /\*\*([^*]+)\*\*/g;
        let boldMatch;
        let replacements: Array<{start: number, end: number, element: HTMLElement}> = [];
        
        while ((boldMatch = boldPattern.exec(textContent)) !== null) {
            const bold = document.createElement('strong');
            bold.textContent = boldMatch[1];
            replacements.push({
                start: boldMatch.index,
                end: boldMatch.index + boldMatch[0].length,
                element: bold
            });
        }

        // Check for *italic* pattern (but not **)
        const italicPattern = /(?<!\*)\*([^*]+)\*(?!\*)/g;
        let italicMatch;
        
        while ((italicMatch = italicPattern.exec(textContent)) !== null) {
            const italic = document.createElement('em');
            italic.textContent = italicMatch[1];
            replacements.push({
                start: italicMatch.index,
                end: italicMatch.index + italicMatch[0].length,
                element: italic
            });
        }

        // Check for `code` pattern
        const codePattern = /`([^`]+)`/g;
        let codeMatch;
        
        while ((codeMatch = codePattern.exec(textContent)) !== null) {
            const code = document.createElement('code');
            code.textContent = codeMatch[1];
            code.style.background = 'rgba(0, 0, 0, 0.05)';
            code.style.padding = '2px 4px';
            code.style.borderRadius = '3px';
            code.style.fontFamily = 'monospace';
            replacements.push({
                start: codeMatch.index,
                end: codeMatch.index + codeMatch[0].length,
                element: code
            });
        }

        if (replacements.length > 0) {
            const parent = currentNode.parentNode;
            if (!parent) return;

            // Sort replacements by start position (descending) to replace from end to start
            replacements.sort((a, b) => b.start - a.start);

            const fragment = document.createDocumentFragment();
            let lastEnd = textContent.length;
            let newCursorNode: Node | null = null;
            let newCursorOffset = cursorPos;

            // Build the fragment from end to start
            for (const replacement of replacements.reverse()) {
                // Add text after this replacement
                if (replacement.end < lastEnd) {
                    const afterText = textContent.substring(replacement.end, lastEnd);
                    const afterNode = document.createTextNode(afterText);
                    fragment.insertBefore(afterNode, fragment.firstChild);
                    
                    if (cursorPos >= replacement.end && cursorPos <= lastEnd) {
                        newCursorNode = afterNode;
                        newCursorOffset = cursorPos - replacement.end;
                    }
                }

                // Add the replacement element
                fragment.insertBefore(replacement.element, fragment.firstChild);
                
                if (cursorPos >= replacement.start && cursorPos <= replacement.end) {
                    newCursorNode = replacement.element.firstChild;
                    newCursorOffset = Math.min(cursorPos - replacement.start - 2, replacement.element.textContent?.length || 0);
                }

                lastEnd = replacement.start;
            }

            // Add text before first replacement
            if (lastEnd > 0) {
                const beforeText = textContent.substring(0, lastEnd);
                const beforeNode = document.createTextNode(beforeText);
                fragment.insertBefore(beforeNode, fragment.firstChild);
                
                if (cursorPos < lastEnd) {
                    newCursorNode = beforeNode;
                    newCursorOffset = cursorPos;
                }
            }

            // Replace the text node with the fragment
            parent.replaceChild(fragment, currentNode);

            // Restore cursor position
            if (newCursorNode) {
                try {
                    const newRange = document.createRange();
                    newRange.setStart(newCursorNode, Math.min(newCursorOffset, newCursorNode.textContent?.length || 0));
                    newRange.collapse(true);
                    const sel = window.getSelection();
                    sel?.removeAllRanges();
                    sel?.addRange(newRange);
                } catch (e) {
                    // Cursor position invalid, ignore
                }
            }

            handleContentChange();
        }
    };

    const handleCodeBlockKeydown = (e: Event) => {
        const keyEvent = e as KeyboardEvent;
        if (keyEvent.key === 'Tab') {
            keyEvent.preventDefault();
            // Insert tab character
            document.execCommand('insertText', false, '\t');
        } else if (keyEvent.key === 'Enter' && keyEvent.shiftKey) {
            keyEvent.preventDefault();
            // Insert line break within code block
            document.execCommand('insertText', false, '\n');
        }
    };

    const handleBlockquoteKeydown = (e: Event) => {
        const keyEvent = e as KeyboardEvent;
        if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
            keyEvent.preventDefault();
            // Exit blockquote and create new paragraph
            const blockquote = keyEvent.target as HTMLElement;
            const parent = blockquote.parentNode;
            if (parent) {
                const newP = document.createElement('p');
                newP.innerHTML = '<br>';
                parent.insertBefore(newP, blockquote.nextSibling);
                
                // Focus on new paragraph
                const range = document.createRange();
                range.setStart(newP, 0);
                range.setEnd(newP, 0);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
                
                handleContentChange();
            }
        }
    };

    const addReferenceEventListeners = () => {
        if (!contentRef.current) return;
        
        // Add click listeners to all references
        const references = contentRef.current.querySelectorAll('.document-reference, .image-reference');
        references.forEach(ref => {
            ref.addEventListener('click', handleReferenceClick);
        });
    };

    const handleReferenceClick = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        
        const reference = e.currentTarget as HTMLElement;
        if (reference.querySelector('input')) return; // Already editing
        
        const currentText = reference.textContent?.trim() || '';
        const fileIndex = reference.getAttribute('data-file-index');
        const isImage = reference.classList.contains('image-reference');
        
        // Create input element
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        input.className = 'reference-edit-input';
        input.style.cssText = `
            background: transparent;
            border: none;
            outline: none;
            color: inherit;
            font: inherit;
            width: ${Math.max(currentText.length * 8, 60)}px;
            padding: 0;
            margin: 0;
        `;
        
        // Store original content
        const originalContent = reference.innerHTML;
        
        // Replace content with input
        reference.innerHTML = '';
        reference.appendChild(input);
        input.focus();
        input.select();
        
        const saveEdit = () => {
            const newName = input.value.trim() || currentText;
            updateReferenceContent(reference, newName, fileIndex || '0', isImage);
            addReferenceEventListeners(); // Re-add listeners
        };
        
        const cancelEdit = () => {
            reference.innerHTML = originalContent;
            addReferenceEventListeners(); // Re-add listeners
        };
        
        // Handle keyboard events
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });
        
        // Handle blur (clicking outside)
        input.addEventListener('blur', saveEdit);
    };

    const updateReferenceContent = (reference: HTMLElement, newName: string, fileIndex: string, isImage: boolean) => {
        const icon = isImage ? `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21,15 16,10 5,21"></polyline>
            </svg>
        ` : `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14,2 14,8 20,8"></polyline>
            </svg>
        `;
        
        reference.innerHTML = `${icon}${newName}`;
        reference.setAttribute('data-file-index', fileIndex);
        
        // Update content state
        if (contentRef.current) {
            const content = contentRef.current.innerHTML;
            setNoteData(prev => ({ ...prev, content }));
        }
    };

    if (!isOpen) return null;

    const handleInputChange = (field: keyof Note, value: any) => {
        setNoteData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleAddTag = () => {
        if (newTag.trim() && !noteData.tags.includes(newTag.trim())) {
            handleInputChange('tags', [...noteData.tags, newTag.trim()]);
            setNewTag('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        handleInputChange('tags', noteData.tags.filter(tag => tag !== tagToRemove));
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    const handleFileUpload = (files: FileList) => {
        const newFiles = Array.from(files);
        handleInputChange('attachments', [...noteData.attachments, ...newFiles]);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            handleFileUpload(e.dataTransfer.files);
        }
    };

    const removeAttachment = (index: number) => {
        const newAttachments = noteData.attachments.filter((_, i) => i !== index);
        handleInputChange('attachments', newAttachments);
    };

    const handleSave = () => {
        if (!noteData.title.trim()) {
            alert('Please enter a title for your note');
            return;
        }
        
        // Convert HTML references back to markdown format before saving
        const htmlContent = contentRef.current?.innerHTML || '';
        const markdownContent = htmlToMarkdown(htmlContent);
        
        const finalNote = {
            ...noteData,
            content: markdownContent,
            id: existingNote?.id
        };
        
        onSave(finalNote);
        onClose();
    };

    const formatText = (command: string, value?: string) => {
        if (contentRef.current) {
            contentRef.current.focus();
            document.execCommand(command, false, value);
            // Update the content state after formatting
            const content = contentRef.current.innerHTML;
            setNoteData(prev => ({ ...prev, content }));
        }
    };

    const insertImage = () => {
        imageInputRef.current?.click();
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            // Add to attachments first
            const newAttachments = [...noteData.attachments, file];
            handleInputChange('attachments', newAttachments);
            
            // Insert image reference at cursor
            const imageIndex = newAttachments.length - 1;
            insertImageReference(file.name, imageIndex);
        }
    };

    const insertImageReference = (fileName: string, fileIndex: number) => {
        if (contentRef.current) {
            contentRef.current.focus();
            
            // Create image reference element
            const imgRef = document.createElement('span');
            imgRef.className = 'image-reference';
            imgRef.contentEditable = 'false';
            imgRef.setAttribute('data-file-index', fileIndex.toString());
            imgRef.style.cursor = 'pointer';
            
            imgRef.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21,15 16,10 5,21"></polyline>
                </svg>
                ${fileName}
            `;
            
            // Add click listener
            imgRef.addEventListener('click', handleReferenceClick);
            
            // Insert at cursor position
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(imgRef);
                
                // Add space after reference
                const space = document.createTextNode(' ');
                range.setStartAfter(imgRef);
                range.insertNode(space);
                range.setStartAfter(space);
                range.setEndAfter(space);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                // If no selection, append to end
                contentRef.current.appendChild(imgRef);
                contentRef.current.appendChild(document.createTextNode(' '));
            }
            
            // Update content state
            const content = contentRef.current.innerHTML;
            setNoteData(prev => ({ ...prev, content }));
        }
    };

    const insertCodeBlock = () => {
        if (contentRef.current) {
            contentRef.current.focus();
            
            // Create code block element
            const codeBlock = document.createElement('pre');
            const codeElement = document.createElement('code');
            codeElement.textContent = 'Your code here...';
            codeElement.style.display = 'block';
            codeElement.style.whiteSpace = 'pre';
            codeElement.setAttribute('contenteditable', 'true');
            codeBlock.appendChild(codeElement);
            
            // Add event listeners
            codeElement.addEventListener('input', handleContentChange);
            codeElement.addEventListener('keydown', handleCodeBlockKeydown);
            
            // Insert at cursor position or append to end
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                
                // Add line breaks before and after for proper formatting
                const beforeBr = document.createElement('br');
                const afterBr = document.createElement('br');
                
                range.insertNode(afterBr);
                range.insertNode(codeBlock);
                range.insertNode(beforeBr);
                
                // Position cursor after the code block
                range.setStartAfter(codeBlock);
                range.setEndAfter(codeBlock);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                contentRef.current.appendChild(document.createElement('br'));
                contentRef.current.appendChild(codeBlock);
                contentRef.current.appendChild(document.createElement('br'));
            }
            
            // Update content state
            const content = contentRef.current.innerHTML;
            setNoteData(prev => ({ ...prev, content }));
            
            // Focus on the code element for editing
            setTimeout(() => {
                codeElement.focus();
                const range = document.createRange();
                range.selectNodeContents(codeElement);
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(range);
            }, 0);
        }
    };

    const insertQuote = () => {
        if (contentRef.current) {
            contentRef.current.focus();
            
            // Create blockquote element
            const blockquote = document.createElement('blockquote');
            blockquote.textContent = 'Your quote here...';
            blockquote.setAttribute('contenteditable', 'true');
            
            // Add event listeners
            blockquote.addEventListener('input', handleContentChange);
            blockquote.addEventListener('keydown', handleBlockquoteKeydown);
            
            // Insert at cursor position or append to end
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                
                // Add line breaks before and after for proper formatting
                const beforeBr = document.createElement('br');
                const afterBr = document.createElement('br');
                
                range.insertNode(afterBr);
                range.insertNode(blockquote);
                range.insertNode(beforeBr);
                
                // Position cursor after the blockquote
                range.setStartAfter(blockquote);
                range.setEndAfter(blockquote);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                contentRef.current.appendChild(document.createElement('br'));
                contentRef.current.appendChild(blockquote);
                contentRef.current.appendChild(document.createElement('br'));
            }
            
            // Update content state
            const content = contentRef.current.innerHTML;
            setNoteData(prev => ({ ...prev, content }));
            
            // Focus on the blockquote for editing
            setTimeout(() => {
                blockquote.focus();
                const range = document.createRange();
                range.selectNodeContents(blockquote);
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(range);
            }, 0);
        }
    };

    const insertDocumentReference = (fileName: string, fileIndex: number) => {
        if (contentRef.current) {
            contentRef.current.focus();
            
            // Create document reference element
            const docRef = document.createElement('span');
            docRef.className = 'document-reference';
            docRef.contentEditable = 'false';
            docRef.setAttribute('data-file-index', fileIndex.toString());
            docRef.style.cursor = 'pointer';
            
            docRef.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14,2 14,8 20,8"></polyline>
                </svg>
                ${fileName}
            `;
            
            // Add click listener
            docRef.addEventListener('click', handleReferenceClick);
            
            // Insert at cursor position
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(docRef);
                
                // Add space after reference
                const space = document.createTextNode(' ');
                range.setStartAfter(docRef);
                range.insertNode(space);
                range.setStartAfter(space);
                range.setEndAfter(space);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                // If no selection, append to end
                contentRef.current.appendChild(docRef);
                contentRef.current.appendChild(document.createTextNode(' '));
            }
            
            // Update content state
            const content = contentRef.current.innerHTML;
            setNoteData(prev => ({ ...prev, content }));
        }
    };

    return (
        <div className="note-editor-overlay" onClick={onClose}>
            <div className="note-editor" onClick={(e) => e.stopPropagation()}>
                <div className="note-editor-header">
                    <h2 className="note-editor-title">
                        {mode === 'create' ? 'Create New Note' : 'Edit Note'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="note-editor-close"
                        aria-label="Close editor"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="note-editor-content">
                    {/* Basic Information */}
                    <div className="note-form-section">
                        <div className="form-group">
                            <label htmlFor="note-title">Title *</label>
                            <input
                                id="note-title"
                                type="text"
                                value={noteData.title}
                                onChange={(e) => handleInputChange('title', e.target.value)}
                                placeholder="Enter note title..."
                                className="form-input"
                                required
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="note-subject">Subject</label>
                                <select
                                    id="note-subject"
                                    value={noteData.subject}
                                    onChange={(e) => handleInputChange('subject', e.target.value)}
                                    className="form-select"
                                >
                                    <option value="">Select subject...</option>
                                    {subjects.map(subject => (
                                        <option key={subject} value={subject}>{subject}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="note-visibility">Visibility</label>
                                <select
                                    id="note-visibility"
                                    value={noteData.visibility}
                                    onChange={(e) => handleInputChange('visibility', e.target.value as 'Public' | 'Private')}
                                    className="form-select"
                                >
                                    <option value="Private">Private</option>
                                    <option value="Public">Public</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Rich Text Editor */}
                    <div className="note-form-section">
                        <label>Content</label>
                        <div className="text-editor">
                            <div className="editor-toolbar">
                                <button type="button" onClick={() => formatText('bold')} className="toolbar-btn">
                                    <strong>B</strong>
                                </button>
                                <button type="button" onClick={() => formatText('italic')} className="toolbar-btn">
                                    <em>I</em>
                                </button>
                                <button type="button" onClick={() => formatText('underline')} className="toolbar-btn">
                                    <u>U</u>
                                </button>
                                <div className="toolbar-divider"></div>
                                <button type="button" onClick={() => formatText('formatBlock', 'h2')} className="toolbar-btn">
                                    H1
                                </button>
                                <button type="button" onClick={() => formatText('formatBlock', 'h3')} className="toolbar-btn">
                                    H2
                                </button>
                                <button type="button" onClick={() => formatText('formatBlock', 'p')} className="toolbar-btn" title="Normal text">
                                    P
                                </button>
                                <div className="toolbar-divider"></div>
                                <button type="button" onClick={() => formatText('insertUnorderedList')} className="toolbar-btn">
                                    • List
                                </button>
                                <button type="button" onClick={() => formatText('insertOrderedList')} className="toolbar-btn">
                                    1. List
                                </button>
                                <div className="toolbar-divider"></div>
                                <button type="button" onClick={insertCodeBlock} className="toolbar-btn" title="Add code block">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="16,18 22,12 16,6"></polyline>
                                        <polyline points="8,6 2,12 8,18"></polyline>
                                    </svg>
                                </button>
                                <button type="button" onClick={insertQuote} className="toolbar-btn" title="Add quote">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
                                        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
                                    </svg>
                                </button>
                                <div className="toolbar-divider"></div>
                                <button type="button" onClick={insertImage} className="toolbar-btn" title="Add image">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                        <polyline points="21,15 16,10 5,21"></polyline>
                                    </svg>
                                </button>
                                {noteData.attachments.length > 0 && (
                                    <div className="attachments-references-dropdown">
                                        <button type="button" className="toolbar-btn dropdown-trigger" title="Insert file reference">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                                            </svg>
                                        </button>
                                        <div className="dropdown-content">
                                            {noteData.attachments.map((file, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() => {
                                                        if (file.type.startsWith('image/')) {
                                                            insertImageReference(file.name, index);
                                                        } else {
                                                            insertDocumentReference(file.name, index);
                                                        }
                                                    }}
                                                    className="dropdown-item"
                                                >
                                                    {file.type.startsWith('image/') ? (
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                            <polyline points="21,15 16,10 5,21"></polyline>
                                                        </svg>
                                                    ) : (
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                            <polyline points="14,2 14,8 20,8"></polyline>
                                                        </svg>
                                                    )}
                                                    {file.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div
                                ref={contentRef}
                                className="editor-content"
                                contentEditable
                                onInput={(e) => {
                                    handleRealtimeMarkdown();
                                    const content = e.currentTarget.innerHTML;
                                    setNoteData(prev => ({ ...prev, content }));
                                    // Re-add listeners for any new content elements
                                    setTimeout(() => {
                                        addReferenceEventListeners();
                                        addContentElementsListeners();
                                    }, 0);
                                }}
                                onKeyUp={(e) => {
                                    if (e.key === ' ') {
                                        handleSpaceKey(e);
                                    }
                                }}
                                suppressContentEditableWarning={true}
                            />
                        </div>
                    </div>

                    {/* File Upload Section */}
                    <div className="note-form-section">
                        <label>Attachments</label>
                        <div 
                            className={`file-upload-area ${isDragging ? 'dragging' : ''}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7,10 12,15 17,10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            <p>Drop files here or click to upload</p>
                            <p className="upload-hint">Images, PDFs, documents up to 10MB</p>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*,application/pdf,.doc,.docx,.txt,.md"
                            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                            style={{ display: 'none' }}
                        />
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                        />

                        {/* Attachment Preview */}
                        {noteData.attachments.length > 0 && (
                            <div className="attachments-preview">
                                {noteData.attachments.map((file, index) => (
                                    <div key={index} className="attachment-item">
                                        <div className="attachment-info">
                                            <span className="attachment-name">{file.name}</span>
                                            <span className="attachment-size">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeAttachment(index)}
                                            className="remove-attachment"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tags Section */}
                    <div className="note-form-section">
                        <label>Tags</label>
                        <div className="tags-input-container">
                            <input
                                type="text"
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Add tags..."
                                className="tag-input"
                            />
                            <button
                                type="button"
                                onClick={handleAddTag}
                                className="add-tag-btn"
                            >
                                Add
                            </button>
                        </div>
                        
                        {noteData.tags.length > 0 && (
                            <div className="tags-display">
                                {noteData.tags.map((tag, index) => (
                                    <span key={index} className="tag-item">
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTag(tag)}
                                            className="remove-tag"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="note-editor-footer">
                    <button
                        type="button"
                        onClick={onClose}
                        className="cancel-btn"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="save-btn"
                    >
                        {mode === 'create' ? 'Create Note' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NoteEditor;