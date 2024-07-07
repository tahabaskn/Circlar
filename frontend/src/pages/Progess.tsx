import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { IoArrowBackCircle } from "react-icons/io5";
import { MdOutlineDone } from "react-icons/md";

interface ProgressProps {
    completedTasks: { [date: string]: { [taskName: string]: boolean } };
}

const Progress: React.FC<ProgressProps> = ({ completedTasks }) => {
    const [progressData, setProgressData] = useState<{ [date: string]: { [taskName: string]: boolean } }>({});
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProgress = async () => {
            try {
                const response = await axios.get('http://127.0.0.1:8000/tasks/weekly-schedules/get_weekly_progress/');
                setProgressData(response.data);
            } catch (error) {
                console.error('İlerleme verisi çekilemedi:', error);
            }
        };

        fetchProgress();
    }, []);

    return (
        <div className="px-8 py-4 text-gray-3 bg-gray-3900 min-h-screen">
            <button
                onClick={() => navigate('/')}
                className="absolute left-4 top-4 text-orange bg-white rounded-full bg-orange hover:bg-orange hover:text-white transition-all focus:outline-none"
            >
                <IoArrowBackCircle className='text-5xl rounded-full' />
            </button>
            <h1 className="text-4xl font-bold mb-12 text-orange text-center">İlerleme</h1>
            <div className="grid grid-cols-7 gap-4">
                {Object.entries(progressData).map(([date, tasks]) => (
                    <div key={date} className="bg-gray-3800 p-4 rounded-md">
                        <h2 className="text-2xl font-bold mb-4 text-center">{date}</h2>
                        <ul>
                            {Object.entries(tasks).map(([taskName, completed]) => (
                                <li key={taskName} className={`flex items-center justify-between p-2 mb-1 border-2 hover:bg-orange-2 transition-all hover:text-white hover:scale-105 hover:border-white rounded-md ${completed ? 'bg-orange text-white' : 'bg-gray-1'}`}>
                                    {taskName} {completed && <MdOutlineDone className='text-xl'/>}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Progress;
