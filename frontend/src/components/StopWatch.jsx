import React, { useState, useEffect } from 'react';

const Stopwatch = () => {
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [hovered, setHovered] = useState(false);

    useEffect(() => {
        let timer;
        if (isRunning) {
            timer = setInterval(() => {
                setTime(prevTime => prevTime + 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isRunning]);

    useEffect(() => {
        let timer;
        if (!hovered) {
            timer = setTimeout(() => {
                setIsMinimized(true);
            }, 2000);
        }
        return () => clearTimeout(timer);
    }, [hovered]);

    useEffect(() => {
        const originalTitle = document.title;
        if (time === 0) {
            document.title = originalTitle;
        } else {
            document.title = ` ${originalTitle} - ${formatTime(time)}`;
        }
        return () => {
            document.title = originalTitle;
        };
    }, [time]);

    const handleStartStop = () => {
        setIsRunning(!isRunning);
    };

    const handleReset = () => {
        setIsRunning(false);
        setTime(0);
    };

    const formatTime = (time) => {
        const getSeconds = `0${(time % 60)}`.slice(-2);
        const minutes = `${Math.floor(time / 60)}`;
        const getMinutes = `0${minutes % 60}`.slice(-2);
        const getHours = `0${Math.floor(time / 3600)}`.slice(-2);
        return `${getHours}:${getMinutes}:${getSeconds}`;
    };

    return (
        <div
            className={`fixed top-1 right-1 bg-navy-2 p-4 rounded-md shadow-lg text-white z-50 transition-all cursor-pointer ${!hovered && isMinimized ? 'opacity-30 scale-75 top-0 right-0' : 'opacity-100'}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => setIsMinimized(!isMinimized)}
        >
            <div className="text-2xl font-mono">{formatTime(time)}</div>
            {!isMinimized && (
                <div className="mt-2">
                    <button
                        onClick={handleStartStop}
                        className={`px-4 py-2 ${isRunning ? 'bg-gray-2' : 'bg-orange'} text-white rounded-md hover:${isRunning ? 'bg-gray-2' : 'bg-orange'} focus:outline-none focus:ring-2 focus:ring-opacity-50`}
                    >
                        {isRunning ? 'Durdur' : 'Başlat'}
                    </button>
                    <button
                        onClick={handleReset}
                        className="ml-2 px-4 py-2 bg-gray-3 text-white rounded-md hover:bg-orange focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                    >
                        Sıfırla
                    </button>
                </div>
            )}
        </div>
    );
};

export default Stopwatch;
