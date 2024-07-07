import React, { useState, useEffect } from 'react';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Modal from 'react-modal';
import { useNavigate } from 'react-router-dom';
import { FaStickyNote } from 'react-icons/fa';
import axios from 'axios';
import { IoArrowBackCircle } from "react-icons/io5";

interface Book {
    id: string;
    title: string;
    author: string;
    status: string;
    startDate: string;
    endDate: string;
    thumbnail: string;
    pages: number;
    order: number;
    notes?: string;
}

Modal.setAppElement('#root');

const BookTrackingPage: React.FC = () => {
    const [books, setBooks] = useState<Book[]>([]);
    const [selectedBookImage, setSelectedBookImage] = useState<string | null>(null);
    const navigate = useNavigate();
    const [newBook, setNewBook] = useState<Book>({
        id: '',
        title: '',
        author: '',
        status: 'Okunuyor',
        startDate: '',
        endDate: '',
        thumbnail: '',
        pages: 0,
        order: 0
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Book[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const toTitleCase = (str: string) => {
        return str.replace(/\w\S*/g, (txt) => {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    };

    const fetchBooks = async () => {
        const response = await fetch('http://127.0.0.1:8000/tasks/books/');
        const data = await response.json();
        setBooks(data);
    };

    const addBook = async (book: Book) => {
        const bookToAdd = {
            ...book,
            title: toTitleCase(book.title),
            author: toTitleCase(book.author),
            startDate: book.startDate ? new Date(book.startDate).toISOString().split('T')[0] : '',
            endDate: book.endDate ? new Date(book.endDate).toISOString().split('T')[0] : '',
        };

        const response = await fetch('http://127.0.0.1:8000/tasks/books/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookToAdd)
        });
        const addedBook = await response.json();
        setBooks([...books, addedBook]);
    };

    const updateBooks = async () => {
        const promises = books.map(async (book) => {
            const bookToUpdate = {
                ...book,
                startDate: book.startDate ? new Date(book.startDate).toISOString().split('T')[0] : '',
                endDate: book.endDate ? new Date(book.endDate).toISOString().split('T')[0] : '',
            };

            const response = await fetch(`http://127.0.0.1:8000/tasks/books/${bookToUpdate.id}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bookToUpdate)
            });
            return response.ok;
        });
        await Promise.all(promises);
        setIsEditing(false);
    };

    const deleteBook = async (id: string) => {
        await fetch(`http://127.0.0.1:8000/tasks/books/${id}/`, {
            method: 'DELETE'
        });
        setBooks(books.filter(book => book.id !== id));
    };

    const updateBooksOrder = async (updatedBooks: Book[]) => {
        await fetch('http://127.0.0.1:8000/tasks/books/reorder/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedBooks)
        });
    };

    const handleSearch = async (term: string) => {
        if (!term) {
            setSearchResults([]);
            return;
        }
    
        const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${term}&langRestrict=tr`
        );
        const data = await response.json();
        const results = data.items.map((item: any) => ({
            id: item.id,
            title: item.volumeInfo.title,
            author: item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'Unknown',
            status: 'Okunuyor',
            startDate: '',
            endDate: '',
            thumbnail: item.volumeInfo.imageLinks ? item.volumeInfo.imageLinks.thumbnail : '',
            pages: item.volumeInfo.pageCount || 0,
            order: books.length
        }));
    
        setSearchResults(results);
    };
    
    useEffect(() => {
        fetchBooks();
    }, []);

    const moveBook = (dragIndex: number, hoverIndex: number) => {
        const draggedBook = books[dragIndex];
        const updatedBooks = [...books];
        updatedBooks.splice(dragIndex, 1);
        updatedBooks.splice(hoverIndex, 0, draggedBook);

        setBooks(
            updatedBooks.map((book, index) => ({
                ...book,
                order: index
            }))
        );

        updateBooksOrder(updatedBooks);
    };

    const BookItem: React.FC<{ book: Book; index: number }> = ({ book, index }) => {
        const ref = React.useRef<HTMLDivElement>(null);
        const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
        const [editedNotes, setEditedNotes] = useState(book.notes || '');
        const openNoteModal = () => {
            setEditedNotes(book.notes || '');
            setIsNoteModalOpen(true);
          };
        const closeNoteModal = () => setIsNoteModalOpen(false);
        const saveNotes = async () => {
            try {
                const response = await axios.patch(`http://127.0.0.1:8000/tasks/books/${book.id}/`, { notes: editedNotes });
                const updatedBook = response.data;
                setBooks(books.map(b => (b.id === book.id ? updatedBook : b)));
                closeNoteModal();
            } catch (error) {
                console.error("Error updating notes:", error);
            }
        };
        const [, drop] = useDrop({
            accept: 'BOOK',
            hover(item: { index: number }) {
                if (!ref.current) {
                    return;
                }
                const dragIndex = item.index;
                const hoverIndex = index;
                if (dragIndex === hoverIndex) {
                    return;
                }
                moveBook(dragIndex, hoverIndex);
                item.index = hoverIndex;
            },
        });
        const [{ isDragging }, drag] = useDrag({
            type: 'BOOK',
            item: { index },
            collect: (monitor) => ({
                isDragging: monitor.isDragging(),
            }),
            canDrag: () => book.status === 'Okunacak',
        });
        drag(drop(ref));
    
        return (
            <div
                ref={ref}
                className={`bg-gray-1 p-4 rounded-md ${book.status === 'Okundu' ? 'bg-green-800' : ''}`}
                style={{ opacity: isDragging ? 0.5 : 1 }}
            >
                <div className="relative">
                    {book.status === 'Okunacak' && (
                        <div className="absolute top-0 left-0 bg-orange text-white px-2 py-1 rounded-tr-md rounded-bl-md">
                            {index + 1}
                        </div>
                    )}
                    <img
                        src={book.thumbnail}
                        alt={book.title}
                        className="flex justify-center w-32 h-48 max-h-60 object-cover rounded-md mx-auto mb-2 cursor-pointer border-4 border-grey-600"
                        onClick={() => setSelectedBookImage(book.thumbnail)}
                    />
                    {isEditing && (
                        <>
                            <input
                                type="text"
                                value={book.title}
                                onChange={(e) => setBooks(books.map(b => b.id === book.id ? { ...b, title: e.target.value } : b))}
                                className="mb-2 py-1 px-2 border-gray-2 border block w-full rounded-md border-gray-700 bg-wheat-1 text-gray-3 shadow-sm focus:boutline-none"
                            />
                            <input
                                type="text"
                                value={book.author}
                                onChange={(e) => setBooks(books.map(b => b.id === book.id ? { ...b, author: e.target.value } : b))}
                                className="mb-2 py-1 px-2 border-gray-2 border block w-full rounded-md border-gray-700 bg-wheat-1 text-gray-3 shadow-sm focus:boutline-none"
                            />
                            <select
                                value={book.status}
                                onChange={(e) => setBooks(books.map(b => b.id === book.id ? { ...b, status: e.target.value } : b))}
                                className="mb-2 py-1 px-2 border-gray-2 border block w-full rounded-md border-gray-700 bg-wheat-1 text-gray-3 shadow-sm focus:boutline-none"
                            >
                                <option value="Okunuyor">Okunuyor</option>
                                <option value="Okundu">Okundu</option>
                                <option value="Okunacak">Okunacak</option>
                            </select>
                            <input
                                type="date"
                                value={book.startDate}
                                onChange={(e) => setBooks(books.map(b => b.id === book.id ? { ...b, startDate: e.target.value } : b))}
                                className="mb-2 py-1 px-2 border-gray-2 border block w-full rounded-md border-gray-700 bg-wheat-1 text-gray-3 shadow-sm focus:boutline-none"
                            />
                            <input
                                type="date"
                                value={book.endDate}
                                onChange={(e) => setBooks(books.map(b => b.id === book.id ? { ...b, endDate: e.target.value } : b))}
                                className="mb-2 py-1 px-2 border-gray-2 border block w-full rounded-md border-gray-700 bg-wheat-1 text-gray-3 shadow-sm focus:outline-none"
                            />
                            <input
                                type="text"
                                value={book.thumbnail}
                                onChange={(e) => setBooks(books.map(b => b.id === book.id ? { ...b, thumbnail: e.target.value } : b))}
                                className="mb-2 py-1 px-2 border-gray-2 border block w-full rounded-md border-gray-700 bg-wheat-1 text-gray-3 shadow-sm focus:boutline-none"
                            />
                            <input
                                type="number"
                                value={book.pages}
                                onChange={(e) => setBooks(books.map(b => b.id === book.id ? { ...b, pages: parseInt(e.target.value) } : b))}
                                className="mb-2 py-1 px-2 border-gray-2 border block w-full rounded-md border-gray-700 bg-wheat-1 text-gray-3 shadow-sm focus:boutline-none"
                            />
                            <button
                                onClick={() => deleteBook(book.id)}
                                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-orange focus:outline-none"
                            >
                                Sil
                            </button>
                        </>
                    )}
                    <FaStickyNote className={`absolute top-0 right-0 cursor-pointer ${book.status === "Okundu" ? "text-white" : "text-gray-2"}`} onClick={openNoteModal} />
                    <Modal 
                        isOpen={isNoteModalOpen}
                        onRequestClose={closeNoteModal} 
                        className="z-100" 
                    >
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col justify-center items-center z-10 backdrop-blur-sm animate-modal-grow" onClick={closeNoteModal}>
                            <div className="w-144 p-4 bg-gray-1 rounded-md shadow-lg" onClick={(e) => e.stopPropagation()}>
                                <h2 className="text-center text-orange font-bold text-2xl mb-4">{book.title}</h2>
                                <textarea
                                    value={editedNotes}
                                    onChange={(e) => setEditedNotes(e.target.value)}
                                    className="w-full h-128 p-2 border rounded-md bg-gray-1 text-gray-3 focus:outline-none shadow-sm resize-none"
                                />
                                <div className="flex justify-end mt-4">
                                    <button 
                                        onClick={saveNotes} 
                                        className="px-4 py-2 bg-orange text-white hover:bg-orange-2 transition-all rounded-md mr-2 focus:outline-none"
                                    >
                                        Altını Çiz
                                    </button>
                                    <button 
                                        onClick={closeNoteModal} 
                                        className="px-4 py-2 bg-navy text-white hover:bg-navy-3 transition-all rounded-md focus:outline-none"
                                    >
                                        İptal
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Modal>
                </div>
                {!isEditing && (
                    <>
                        <p className={`flex justify-center font-bold text-gray-3 ${book.status === "Okundu" ? "text-white" : ""}`}>{book.title}</p>
                        <p className={`text-gray-3 ${book.status === "Okundu" ? "text-white" : ""}`}>{book.author}</p>
                        <p className={`text-gray-3 ${book.status === "Okundu" ? "text-white" : ""}`}>{book.status}</p>
                        {book.startDate !== '0001-01-01' && <p className={`text-gray-3 ${book.status === "Okundu" ? "text-white" : ""}`}>Başlama: {book.startDate}</p>}
                        {book.endDate !== '0001-01-01' && <p className={`text-gray-3 ${book.status === "Okundu" ? "text-white" : ""}`}>Bitiş: {book.endDate}</p>}
                        <p className={`text-gray-3 ${book.status === "Okundu" ? "text-white" : ""}`}>Sayfa Sayısı: {book.pages}</p>
                    </>
                )}
            </div>
        );
    };
    
    return (
        <DndProvider backend={HTML5Backend}>
            <div className="p-8 text-gray-3 bg-wheat-1 min-h-screen">
            <button
                    onClick={() => navigate('/')}
                    className="absolute left-4 top-4 text-orange bg-white rounded-full bg-orange hover:bg-orange hover:text-white transition-all focus:outline-none"
                >
                    <IoArrowBackCircle className='text-5xl rounded-full'/>
                </button>
                <h1 className="text-4xl font-bold mb-6 text-center text-orange">Kütüphane</h1>
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-10 backdrop-blur-sm animate-modal-grow" onClick={() => setIsModalOpen(false)}>
                        <div className="bg-gray-2 px-8 py-4 text-white max-w-3xl mx-auto rounded-md shadow-lg" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-2 right-2 text-gray-500 hover:text-gray-300"
                            >
                                &times;
                            </button>
                            <div className="flex flex-col justify-center items-center w-128">
                            <h1 className='text-4xl text-center mb-8'>Kitap Ekle</h1>
                                <input
                                    type="text"
                                    placeholder="Kitap Ara"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        handleSearch(e.target.value);
                                    }}
                                    className="mt-1 block w-full rounded-md border-gray-700 bg-white px-2 mb-2 text-black shadow-sm focus:outline-none"
                                />
                                {searchTerm && searchResults.length > 0 && (
                                    <div className="mt-4 border rounded-md p-2 max-h-40 w-128 overflow-y-auto transition-all">
                                        {searchResults.map((book) => (
                                            <div
                                                key={book.id}
                                                className="flex items-center py-1 px-2 cursor-pointer hover:bg-gray-3 rounded-md shadow-[0_5px_70px_rgba(0,0,0,0.2)] mt-1"
                                                onClick={() => setNewBook(book)}
                                            >
                                                <img src={book.thumbnail} alt={book.title} className="w-10 h-10 object-cover mr-2" />
                                                <div>
                                                    <p className="text-white">{book.title}</p>
                                                    <p className="text-gray-400">{book.author}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <input
                                    type="text"
                                    placeholder="Kitap Adı"
                                    value={newBook.title}
                                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                                    className="mt-4 block w-full rounded-md border-gray-700 bg-white px-2 mb-2 text-black shadow-sm focus:outline-none"
                                />
                                <input
                                    type="text"
                                    placeholder="Yazar"
                                    value={newBook.author}
                                    onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-700 bg-white px-2 mb-2 text-black shadow-sm focus:outline-none"
                                />
                                <select
                                    value={newBook.status}
                                    onChange={(e) => setNewBook({ ...newBook, status: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-700 placeholder:text-gray-400 bg-white px-1 mb-2 text-black shadow-sm focus:outline-none"
                                >
                                    <option value="Okunuyor">Okunuyor</option>
                                    <option value="Okundu">Okundu</option>
                                    <option value="Okunacak">Okunacak</option>
                                </select>
                                <input
                                    type="date"
                                    value={newBook.startDate}
                                    onChange={(e) => setNewBook({ ...newBook, startDate: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-700 bg-white px-2 mb-2 text-black placeholder:text-gray-400 custom-select shadow-sm focus:outline-none"
                                />
                                <input
                                    type="date"
                                    value={newBook.endDate}
                                    onChange={(e) => setNewBook({ ...newBook, endDate: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-700 bg-white px-2 mb-2 text-black shadow-sm focus:outline-none"
                                />
                                <input
                                    type="text"
                                    placeholder="Küçükresim URLsi"
                                    value={newBook.thumbnail}
                                    onChange={(e) => setNewBook({ ...newBook, thumbnail: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-700 bg-white px-2 mb-2 text-black shadow-sm focus:outline-none"
                                />
                                <input
                                    type="number"
                                    placeholder="Pages"
                                    value={newBook.pages}
                                    onChange={(e) => setNewBook({ ...newBook, pages: parseInt(e.target.value) })}
                                    className="mt-1 block w-full rounded-md border-gray-700 bg-white px-2 mb-2 text-black shadow-sm focus:outline-none"
                                />
                                <button
                                    onClick={() => addBook(newBook)}
                                    className="mt-4 px-4 py-2 bg-orange text-white rounded-md hover:bg-orange-2 active:scale-105 focus:outline-none"
                                >
                                    Ekle
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="flex justify-end mb-6">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2 bg-orange text-white rounded-md hover:bg-orange-2 focus:outline-none"
                    >
                        Kitap Ekle
                    </button>
                </div>
                <div className="grid grid-cols-5 gap-4">
                    {books.map((book, index) => (
                        <BookItem key={book.id} book={book} index={index} />
                    ))}
                </div>
                <button
                    onClick={() => {
                        if (isEditing) {
                            updateBooks();
                        } else {
                            setIsEditing(true);
                        }
                    }}
                    className="mt-6 px-4 py-2 bg-orange text-white rounded-md hover:bg-orange-2"
                >
                    {isEditing ? 'Değişiklikleri Kaydet' : 'Kitapları Düzenle'}
                </button>
                {selectedBookImage && (
                    <div
                        className="fixed inset-0 bg-gray-2 bg-opacity-50 flex items-center justify-center z-50"
                        onClick={() => setSelectedBookImage(null)}
                    >
                        <img src={selectedBookImage} alt="Selected Book" className="w-3/4 max-w-md h-auto object-cover rounded-md shadow-lg" />
                    </div>
                )}
            </div>
        </DndProvider>
    );
};

export default BookTrackingPage;
