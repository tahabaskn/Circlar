import React, { useState, useEffect } from 'react';
import { HiOutlinePencilAlt } from "react-icons/hi";
import { MdDelete } from "react-icons/md";
import { IoCloudDone } from "react-icons/io5";

const API_URL = 'http://127.0.0.1:8000/tasks';

const Notes = ({ showNoteModal, setShowNoteModal }) => {
    const [notes, setNotes] = useState([]);
    const [selectedNote, setSelectedNote] = useState(null);
    const [noteContent, setNoteContent] = useState('');

    const fetchNotes = async () => {
        try {
            const response = await fetch(`${API_URL}/notes/`);
            if (!response.ok) {
                throw new Error('Notları getirirken hata oluştu');
            }
            const data = await response.json();
            setNotes(data);
        } catch (error) {
            console.error('Notları getirirken hata oluştu', error);
        }
    };

    const saveNote = async () => {
        if (selectedNote !== null) {
            try {
                const response = await fetch(`${API_URL}/notes/${selectedNote.id}/`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ content: noteContent })
                });
                if (!response.ok) {
                    throw new Error('Not güncellenirken hata oluştu');
                }
                const data = await response.json();
                setNotes(prev => prev.map(n => n.id === selectedNote.id ? data : n));
                return true;  // Başarılı durum
            } catch (error) {
                console.error('Not güncellenirken hata oluştu', error);
                return false;  // Başarısız durum
            }
        } else {
            try {
                const response = await fetch(`${API_URL}/notes/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ content: noteContent })
                });
                if (!response.ok) {
                    throw new Error('Not kaydedilirken hata oluştu');
                }
                const data = await response.json();
                setNotes(prev => [...prev, data]);
                setSelectedNote(data);
                return true;  // Başarılı durum
            } catch (error) {
                console.error('Not kaydedilirken hata oluştu', error);
                return false;  // Başarısız durum
            }
        }
    };

    const deleteNote = async (id) => {
        try {
            await fetch(`${API_URL}/notes/${id}/`, {
                method: 'DELETE',
            });
            setNotes(prev => prev.filter(note => note.id !== id));
            if (selectedNote?.id === id) {
                setSelectedNote(null);
                setNoteContent('');
            }
        } catch (error) {
            console.error('Not silinirken hata oluştu', error);
        }
    };

    const handleNoteSelect = (note) => {
        setSelectedNote(note);
        setNoteContent(note.content);
    };

    const handleNewNote = () => {
        setSelectedNote(null);
        setNoteContent('');
    };

    const handleContentChange = (content) => {
        setNoteContent(content);
    };

    useEffect(() => {
        fetchNotes();
    }, []);

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    const handleCloseModal = async (e) => {
        e.stopPropagation();
        if (await saveNote()) {
            setShowNoteModal(false);
        } else {
            alert("Not kaydedilirken hata oluştu. Lütfen tekrar deneyin.");
        }
    };

    const handleBackdropClick = (e) => {
        if (window.confirm("Değişiklikler kaydedilmedi. Yine de çıkmak istiyor musunuz?")) {
            setShowNoteModal(false);
        }
    };

    return (
        <div>
            <p
                onClick={(e) => {
                    e.stopPropagation();
                    setShowNoteModal(true);
                }}
                className="text-gray-3 border cursor-pointer px-2 py-1 ml-3 rounded-md hover:bg-orange hover:text-white transition-all duration-400 ease-in-out"
            >
                Notlar
            </p>
            {showNoteModal && (
                <div 
                    className="fixed inset-0 flex items-center justify-center bg-gray-2 bg-opacity-50 backdrop-blur-sm z-50"
                    onClick={handleBackdropClick}
                >
                    <div className="bg-gray-1 text-gray-3 p-6 rounded-lg shadow-[0_10px_50px_rgba(230,99,0,0.4)] w-2/3 h-3/4 animate-modal-grow"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex h-full">
                            <div className="w-1/3 h-full overflow-y-scroll border-r border-gray-700 p-4">
                                <h2 className="text-xl font-bold mb-4">Notlar</h2>
                                <ul>
                                    {notes.map(note => (
                                        <li
                                            key={note.id}
                                            className={`p-2 mb-2 border border-2 cursor-pointer shadow-sm shadow-[0_25px_50px_-15px_rgba(0,0,0,0.1)] hover:bg-orange hover:text-white rounded-md transition-all ${selectedNote?.id === note.id ? 'bg-white text-black' : ''}`}
                                            onClick={() => handleNoteSelect(note)}
                                        >
                                            {note.content.substring(0, 20)}...
                                            <div className="text-sm text-gray-400">{new Date(note.created_at).toLocaleString()}</div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="w-2/3 h-full px-4 flex flex-col relative">
                                {selectedNote && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteNote(selectedNote.id);
                                        }}
                                        className="absolute bottom-2 left-3 h-8 w-8 text-2xl text-gray-3 hover:bg-orange hover:text-white rounded-md flex items-center justify-center"
                                    >
                                        <MdDelete/>
                                    </button>
                                )}
                                <button
                                    onClick={handleNewNote}
                                    className="absolute right-2 top-1 h-8 w-8 text-2xl text-gray-3 hover:text-white hover:bg-orange rounded-md flex items-center justify-center"
                                >
                                    <HiOutlinePencilAlt />
                                </button>
                                <h2 className="text-xl font-bold mb-4">
                                    {selectedNote !== null ? "Notu Düzenle" : "Yeni Not"}
                                </h2>
                                <textarea
                                    value={noteContent}
                                    onChange={(e) => handleContentChange(e.target.value)}
                                    className="w-full h-full bg-white text-black p-4 rounded-md resize-none focus:outline-none"
                                    placeholder="Notunuzu buraya yazın..."
                                />
                                <div className="flex justify-end space-x-2 mt-4">
                                    <button
                                        onClick={handleCloseModal}
                                        className="h-8 w-8 text-2xl text-gray-3 hover:text-white hover:bg-orange rounded-md flex items-center justify-center"
                                    >
                                        <IoCloudDone/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notes;
