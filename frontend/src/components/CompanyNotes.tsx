import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Paperclip, 
  Download, 
  X, 
  Loader2, 
  Calendar,
  User as UserIcon,
  AlertCircle,
  File as FileIcon,
  Edit2
} from 'lucide-react';
import { 
  getCompanyNotes, 
  createNote, 
  updateNote, 
  deleteNote, 
  uploadAttachment, 
  getDownloadUrl, 
  deleteAttachment, 
  Note, 
  Attachment 
} from '../api/notes';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface CompanyNotesProps {
  companyId: string;
  onClose?: () => void;
}

const CompanyNotes: React.FC<CompanyNotesProps> = ({ companyId, onClose }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [isUploading, setIsUploading] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCompanyNotes(companyId);
      setNotes(data);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.title.trim()) return;

    try {
      await createNote(companyId, newNote);
      setNewNote({ title: '', content: '' });
      setIsCreating(false);
      fetchNotes();
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote || !editingNote.title.trim()) return;

    try {
      await updateNote(companyId, editingNote.id, { 
        title: editingNote.title, 
        content: editingNote.content 
      });
      setEditingNote(null);
      fetchNotes();
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      await deleteNote(companyId, noteId);
      fetchNotes();
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleFileUpload = async (noteId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    // 25MB limit check
    if (file.size > 25 * 1024 * 1024) {
      alert('File size exceeds 25MB limit.');
      return;
    }

    setIsUploading(noteId);
    try {
      await uploadAttachment(noteId, file);
      fetchNotes();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Allowed types: PDF, Excel, Images.');
    } finally {
      setIsUploading(null);
    }
  };

  const handleDownload = async (noteId: string, attachment: Attachment) => {
    try {
      const url = await getDownloadUrl(noteId, attachment.id);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleDeleteAttachment = async (noteId: string, attachmentId: string) => {
    if (!window.confirm('Delete this attachment?')) return;
    try {
      await deleteAttachment(noteId, attachmentId);
      fetchNotes();
    } catch (error) {
      console.error('Delete attachment failed:', error);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex flex-col h-full bg-white text-black">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Research Notes</h2>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-semibold">Due Diligence & Archives</p>
        </div>
        <div className="flex items-center space-x-2">
          {!isCreating && !editingNote && (
            <button
              onClick={() => setIsCreating(true)}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Note
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
        {isCreating && (
          <form onSubmit={handleCreateNote} className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 space-y-4">
            <input
              autoFocus
              className="w-full text-lg font-bold border-none focus:ring-0 placeholder-gray-300 p-0"
              placeholder="Note Title..."
              value={newNote.title}
              onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
            />
            <textarea
              className="w-full text-sm border-none focus:ring-0 placeholder-gray-300 p-0 resize-none min-h-[100px]"
              placeholder="Start writing research notes..."
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
            />
            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-50">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newNote.title.trim()}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-blue-700 disabled:opacity-50"
              >
                Save Note
              </button>
            </div>
          </form>
        )}

        {notes.length === 0 && !isLoading && !isCreating && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-gray-900 font-bold">No research notes yet</h3>
            <p className="text-gray-500 text-sm mt-1">Start tracking company history and attachments.</p>
          </div>
        )}

        {notes.map((note) => (
          <div key={note.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group">
            {editingNote?.id === note.id ? (
              <form onSubmit={handleUpdateNote} className="p-4 space-y-4">
                <input
                  autoFocus
                  className="w-full text-lg font-bold border-none focus:ring-0 p-0"
                  value={editingNote.title}
                  onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                />
                <textarea
                  className="w-full text-sm border-none focus:ring-0 p-0 resize-none min-h-[100px]"
                  value={editingNote.content}
                  onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                />
                <div className="flex justify-end space-x-2 pt-2 border-t border-gray-50">
                  <button
                    type="button"
                    onClick={() => setEditingNote(null)}
                    className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-blue-700"
                  >
                    Update
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-bold text-gray-900">{note.title}</h3>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingNote(note)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  <span className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {format(new Date(note.createdAt), 'MMM d, yyyy')}
                  </span>
                  <span className="flex items-center">
                    <UserIcon className="w-3 h-3 mr-1" />
                    System User
                  </span>
                </div>
                <div className="mt-4 text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </div>

                {/* Attachments Section */}
                <div className="mt-6 pt-4 border-t border-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                      <Paperclip className="w-3 h-3 mr-1.5" />
                      Attachments ({note.attachments.length})
                    </span>
                    <label className="cursor-pointer text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider flex items-center">
                      {isUploading === note.id ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Plus className="w-3 h-3 mr-1" />
                      )}
                      Upload File
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleFileUpload(note.id, e)}
                        disabled={!!isUploading}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {note.attachments.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100 group/file">
                        <div className="flex items-center space-x-2 min-w-0">
                          <div className="w-8 h-8 bg-white rounded border border-gray-100 flex items-center justify-center flex-shrink-0">
                            <FileIcon className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-700 truncate max-w-[150px]" title={file.filename}>
                              {file.filename}
                            </p>
                            <p className="text-[10px] text-gray-400">{formatSize(file.fileSize)}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleDownload(note.id, file)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAttachment(note.id, file.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompanyNotes;
