import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { ArcElement, Tooltip, Legend, Chart, ChartEvent } from 'chart.js';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import Notes from '../components/Notes.jsx';
import { useNavigate } from 'react-router-dom';
import { MdAddTask } from "react-icons/md";


Chart.register(ArcElement, Tooltip, Legend);

interface ApiTask {
    id: number;
    title: string;
    duration: number;
    days: number;
    is_short_task: boolean;
    is_deleted?: boolean;
}

interface Task extends ApiTask {
    title: string;
    completed?: boolean;
    hours: number;
}

interface TaskDictionary {
    [id: number]: Task;
}

interface DailySchedule {
    [taskName: string]: { hours: number; completed?: boolean; id?: number}; // Meal and sleep hours in DailySchedule
}

interface WeeklySchedule {
    [day: string]: DailySchedule;
}

interface WeeklyPlannerProps {
    completedTasks: { [date: string]: { [taskName: string]: boolean } };
    setCompletedTasks: React.Dispatch<React.SetStateAction<{ [date: string]: { [taskName: string]: boolean } }>>;
}

const API_URL = 'http://127.0.0.1:8000/tasks';
const WEEKLY_SCHEDULE_URL = 'http://127.0.0.1:8000/tasks/weekly-schedules';

const WeeklyPlanner: React.FC<WeeklyPlannerProps> = ({ completedTasks, setCompletedTasks }) => {
    const [taskName, setTaskName] = useState<string>('');
    const [taskHours, setTaskHours] = useState<number>(0);
    const [taskDays, setTaskDays] = useState<number>(7);
    const [isShortTask, setIsShortTask] = useState<boolean>(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tasks, setTasks] = useState<TaskDictionary>({});
    const [shortTasks, setShortTasks] = useState<TaskDictionary>({});
    const [sleepHours, setSleepHours] = useState<number>(8);
    const [mealHours, setMealHours] = useState<number>(2);
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
    const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
    const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, task: Task | null }>({ visible: false, x: 0, y: 0, task: null });
    const [newDay, setNewDay] = useState<string>('');
    const [newHours, setNewHours] = useState<number>(0);
    const [isOpen, setIsOpen] = useState(false);
    const currentDayIndex = new Date().getDay();
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const [chartData, setChartData] = useState<any[]>([]);
    const [error, setError] = useState<string>('');
    const [showModal, setShowModal] = useState<boolean>(false);
    const [editTask, setEditTask] = useState<ApiTask | null>(null);
    const [showNoteModal, setShowNoteModal] = useState<boolean>(false);
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
    const [selectedTaskDay, setSelectedTaskDay] = useState<string>('');
    const navigate = useNavigate();
    const taskColorsRef = useRef<{ [key: string]: string }>({});
    const [pulse, setPulse] = useState(false);

    const handleClick = () => {
        setPulse(true);
        distributeTasks();
        setTimeout(() => setPulse(false), 300); // Animasyon süresi ile eşleştirildi
    };

    const handleTaskComplete = async (taskName: string, dayIndex: number) => {
        const todayIndex = new Date().getDay() - 1;
        if (dayIndex !== todayIndex) return;
    
        const task = Object.values(tasks).find(t => t.title === taskName);
        if (!task) return;
    
        const scheduleResponse = await fetch(`${WEEKLY_SCHEDULE_URL}/`);
        const scheduleData = await scheduleResponse.json();
        const scheduleItem = scheduleData.find((item: any) => item.task === task.id && item.day === days[todayIndex]);
    
        if (!scheduleItem) return;
    
        const today = new Date().toISOString().split('T')[0];
        const isCompleted = scheduleItem.completed;
    
        setCompletedTasks((prev) => ({
            ...prev,
            [today]: {
                ...prev[today],
                [taskName]: !isCompleted
            }
        }));
    
        await markTaskComplete(scheduleItem.id, !isCompleted);
        fetchSchedule();
    };
    
    const generateChartData = useCallback((schedule: WeeklySchedule): any[] => {
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const taskColors = taskColorsRef.current;
        const colorPalette = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FFCD56'];
        const completedColor = '#4CAF50';
    
        let colorIndex = 0;
        const chartData = days.map(day => {
            const dayTasks = schedule[day];
    
            const taskData = [];
            const taskLabels = [];
            const taskColorsForDay = [];
    
            Object.entries(dayTasks).forEach(([taskName, taskDetails]) => {
                if (taskName !== "Sleep" && taskName !== "Meal") {
                    taskData.push(taskDetails.hours);
                    taskLabels.push(taskName);
                    taskColorsForDay.push(taskDetails.completed ? completedColor : (taskColors[taskName] || colorPalette[colorIndex++ % colorPalette.length]));
                    if (!taskColors[taskName]) {
                        taskColors[taskName] = colorPalette[colorIndex % colorPalette.length];
                    }
                }
            });
    
            taskData.push(sleepHours);
            taskLabels.push('Sleep');
            taskColorsForDay.push('#5FBCFA');
    
            taskData.push(mealHours);
            taskLabels.push('Meal');
            taskColorsForDay.push('#FFA07A');
    
            const totalHours = taskData.reduce((acc: number, val: number) => acc + val, 0);
            if (totalHours < 24) {
                taskData.push(24 - totalHours);
                taskLabels.push('Free Time');
                taskColorsForDay.push('#C0C0C0');
            }
    
            return {
                labels: taskLabels,
                datasets: [{
                    data: taskData,
                    backgroundColor: taskColorsForDay,
                    borderWidth: 1,
                    hoverBorderColor: '#ffffff',
                    hoverBorderWidth: 2,
                    cutout: '70%'
                }]
            };
        });
    
        return chartData;
    }, [sleepHours, mealHours]);
    
    
    const fetchSchedule = useCallback(async () => {
        try {
            const response = await fetch(`${WEEKLY_SCHEDULE_URL}/`);
            if (!response.ok) {
                throw new Error('Failed to fetch schedule');
            }
            const data = await response.json();
            console.log('Fetched schedule data:', data); // Veriyi kontrol etmek için ekleyin
            const scheduleData: WeeklySchedule = data.reduce((acc: WeeklySchedule, schedule: any) => {
                const task = tasks[schedule.task];
                if (task) {
                    if (!acc[schedule.day]) {
                        acc[schedule.day] = {};
                    }
                    acc[schedule.day][task.title] = { 
                        hours: schedule.hours, 
                        completed: schedule.completed, 
                        id: schedule.id, 
                    };
                }
                return acc;
            }, {
                Monday: {},
                Tuesday: {},
                Wednesday: {},
                Thursday: {},
                Friday: {},
                Saturday: {},
                Sunday: {}
            });

            console.log('Schedule data for chart:', scheduleData);
            setChartData(generateChartData(scheduleData));
        } catch (error) {
            console.error('Failed to fetch schedule', error);
        }
    }, [tasks, generateChartData]);

    const markTaskComplete = async (scheduleId: number, complete: boolean) => {
        try {
            const url = `${WEEKLY_SCHEDULE_URL}/${scheduleId}/${complete ? 'mark_complete' : 'mark_incomplete'}/`;
            await fetch(url, {
                method: 'POST'
            });
            fetchSchedule();  // Fetch updated schedule to update chart data
        } catch (error) {
            console.error('Failed to mark task as complete/incomplete', error);
        }
    };

    const fetchTasks = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/tasks/`);
            if (!response.ok) {
                throw new Error('Failed to fetch tasks');
            }
            const data: ApiTask[] = await response.json();
            const tasksObj: TaskDictionary = data.reduce((acc, task) => ({
                ...acc,
                [task.id]: { ...task, title: task.title },
            }), {});
            setTasks(tasksObj);
        } catch (error) {
            console.error('Failed to fetch tasks', error);
        }
    }, []);

    const fetchShortTasks = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/short-tasks/`);
            if (!response.ok) {
                throw new Error('Failed to fetch short tasks');
            }
            const data = await response.json();
            const formattedShortTasks: TaskDictionary = data.reduce((acc: TaskDictionary, task: ApiTask) => {
                acc[task.id] = { ...task, title: task.title, hours: task.duration };
                return acc;
            }, {});
            setShortTasks(formattedShortTasks);
        } catch (error) {
            console.error('Failed to fetch short tasks', error);
        }
    }, []);  

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    useEffect(() => {
        fetchShortTasks();
    }, [fetchShortTasks]);

    useEffect(() => {
        if (Object.keys(tasks).length > 0) {
            fetchSchedule();
        }
    }, [fetchSchedule, tasks]);

    const handleContextMenu = (e: React.MouseEvent, task: Task) => {
        e.preventDefault();
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY, task });
    };

    const handleContextMenuClose = () => {
        setContextMenu({ visible: false, x: 0, y: 0, task: null });
    };

    const handleTaskChange = (field: keyof ApiTask, value: any) => {
        if (editTask) {
            setEditTask({
                ...editTask,
                [field]: value
            });
        }
    };

    useEffect(() => {
        setTaskHours(0);
    }, [isShortTask]);

    const addTask = async () => {
        try {
            const newTask = {
                title: taskName,
                duration: taskHours,
                days: taskDays,
                is_short_task: isShortTask
            };
            const response = await fetch(`${API_URL}/tasks/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newTask)
            });
            const addedTask = await response.json();
            setTasks(prev => ({
                ...prev,
                [addedTask.id]: addedTask
            }));
            if (isShortTask) {
                setShortTasks(prev => ({
                    ...prev,
                    [addedTask.id]: addedTask
                }));
            }
            setTaskName('');
            setTaskHours(0);
            setTaskDays(7);
            setIsShortTask(false);
        } catch (error) {
            console.error('Failed to add task', error);
        }
    };

    const addShortTask = async () => {
        try {
            const newTask = {
                title: taskName,
                duration: taskHours,
                is_short_task: isShortTask
            };
            const response = await fetch(`${API_URL}/short-tasks/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newTask)
            });
            const addedTask = await response.json();
            setShortTasks(prev => ({
                ...prev,
                [addedTask.id]: addedTask
            }));
            setTaskName('');
            setTaskHours(0);
            setIsShortTask(true);
        } catch (error) {
            console.error('Failed to add short task', error);
        }
    };

    const deleteTask = async (id: number) => {
        try {
            await fetch(`${API_URL}/tasks/${id}/`, {
                method: 'DELETE'
            });
            setTasks(prev => {
                const updatedTasks = { ...prev };
                delete updatedTasks[id];
                return updatedTasks;
            });
            if (shortTasks[id]) {
                setShortTasks(prev => {
                    const updatedShortTasks = { ...prev };
                    delete updatedShortTasks[id];
                    return updatedShortTasks;
                });
            }
        } catch (error) {
            console.error('Failed to delete task', error);
        }
    };

    const confirmDeleteTask = (taskId: number) => {
        setTaskToDelete(taskId);
        setShowDeleteModal(true);
    };

    const handleDeleteTask = async () => {
        if (taskToDelete !== null) {
            await deleteExistingTask(taskToDelete);
            setShowDeleteModal(false);
            setTaskToDelete(null);
        }
    };

    const cancelDeleteTask = () => {
        setShowDeleteModal(false);
        setTaskToDelete(null);
    };

    const deleteExistingTask = async (task: number) => {
        await deleteTask(task);
        fetchTasks();
        fetchShortTasks();
    };

    const incrementHours = () => {
        setTaskHours(prevHours => {
            const newHours = prevHours + (isShortTask ? 0.25 : taskDays);
            return Math.min(newHours, 168 - 7 * (mealHours + sleepHours));
        });
    };

    const decrementHours = () => {
        setTaskHours(prevHours => {
            const newHours = prevHours - (isShortTask ? 0.25 : taskDays);
            return Math.max(newHours, 0);
        });
    };

    const incrementDays = () => {
        setTaskDays(prevDays => {
            const newDays = prevDays + 1;
            if (newDays <= 7) {
                setTaskHours(prevHours => {
                    const newHours = prevHours * newDays / prevDays;
                    return isShortTask ? Math.min(newHours, 2) : Math.min(newHours, 100);
                });
                return newDays;
            }
            return prevDays;
        });
    };

    const decrementDays = () => {
        setTaskDays(prevDays => {
            if (prevDays > 1) {
                const newDays = prevDays - 1;
                setTaskHours(prevHours => prevHours * newDays / prevDays);
                return newDays;
            }
            return prevDays;
        });
    };

    const incrementSleepHours = () => {
        setSleepHours(sleepHours + 1);
    };

    const decrementSleepHours = () => {
        if (sleepHours > 0) setSleepHours(sleepHours - 1);
    };

    const incrementMealHours = () => {
        setMealHours(mealHours + 1);
    };

    const decrementMealHours = () => {
        if (mealHours > 0) setMealHours(mealHours - 1);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskName.trim()) {
            setError('Task title cannot be left blank');
            return;
        }
        if (isShortTask) {
            addShortTask();
        } else {
            addTask();
        }
    };

    const softDeleteShortTask = async (taskId: number) => {
        try {
            const response = await fetch(`${API_URL}/short-tasks/${taskId}/soft_delete/`, {
                method: 'POST',
            });
            if (!response.ok) {
                throw new Error('Failed to soft delete short task');
            }
            setShortTasks(prev => {
                const updatedShortTasks = { ...prev };
                if (updatedShortTasks[taskId]) {
                    updatedShortTasks[taskId].is_deleted = true;
                }
                return updatedShortTasks;
            });
        } catch (error) {
            console.error('Failed to soft delete short task', error);
        }
    };

    const handleShortTaskDelete = async (taskId: number) => {
        setShortTasks(prev => {
            const updatedShortTasks = { ...prev };
            if (updatedShortTasks[taskId]) {
                updatedShortTasks[taskId].is_deleted = true;
            }
            return updatedShortTasks;
        });

        setTimeout(async () => {
            await softDeleteShortTask(taskId);
            fetchShortTasks();
        }, 500);
    };

    const distributeTasks = async () => {
        const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const totalAvailableHours = (24 - sleepHours - mealHours) * 7;
        const totalTaskHours = Object.values(tasks).reduce((a, b: Task) => a + b.duration, 0);
    
        if (totalTaskHours > totalAvailableHours) {
            setError('There are not many hours in a week, relax.');
            return;
        } else {
            setError('');
        }
    
        const newSchedule: WeeklySchedule = {
            Monday: {},
            Tuesday: {},
            Wednesday: {},
            Thursday: {},
            Friday: {},
            Saturday: {},
            Sunday: {}
        };
    
        let nextNegativeId = -1;  // Start with negative IDs
    
        daysOfWeek.forEach(day => {
            newSchedule[day]['Sleep'] = { hours: sleepHours, completed: false, id: nextNegativeId-- };
            newSchedule[day]['Meal'] = { hours: mealHours, completed: false, id: nextNegativeId-- };
        });
    
        const longTasks = Object.entries(tasks).filter(([_, task]: [string, Task]) => !task.is_short_task);
        const shortTasks = Object.entries(tasks).filter(([_, task]: [string, Task]) => task.is_short_task);
    
        longTasks.forEach(([taskId, task]: [string, Task]) => {
            const hoursPerDay = task.duration / task.days;
            const selectedDays: string[] = [];
    
            while (selectedDays.length < task.days) {
                const randomDay = daysOfWeek[Math.floor(Math.random() * daysOfWeek.length)];
                if (!selectedDays.includes(randomDay)) {
                    selectedDays.push(randomDay);
                    newSchedule[randomDay][task.title] = { hours: hoursPerDay, completed: false, id: parseInt(taskId) };
                }
            }
        });
    
        shortTasks.forEach(([taskId, task]: [string, Task]) => {
            let remainingHours = task.duration;
            while (remainingHours > 0) {
                const randomDay = daysOfWeek[Math.floor(Math.random() * daysOfWeek.length)];
                const randomHour = Math.min(Math.random() * 2, remainingHours); // Ensure we do not exceed remaining hours
    
                if (!newSchedule[randomDay][task.title]) {
                    newSchedule[randomDay][task.title] = { hours: 0, completed: false, id: parseInt(taskId) };
                }
    
                newSchedule[randomDay][task.title].hours += randomHour;
                remainingHours -= randomHour;
            }
        });
    
        console.log("New Schedule:", newSchedule); // Check the new schedule structure
    
        const scheduleData: { day: string, task: number | null, hours: number }[] = [];
        Object.entries(newSchedule).forEach(([day, tasks]) => {
            Object.entries(tasks).forEach(([taskName, task]) => {
                if (taskName !== 'Sleep' && taskName !== 'Meal') {
                    scheduleData.push({
                        day,
                        task: task.id ? task.id : null,
                        hours: task.hours
                    });
                }
            });
        });
    
        console.log("Schedule Data to be sent:", scheduleData); // Check the schedule data
    
        try {
            const response = await fetch(`${WEEKLY_SCHEDULE_URL}/create_bulk/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ schedules: scheduleData })
            });
            if (!response.ok) {
                throw new Error('Failed to create schedules');
            }
            setChartData(generateChartData(newSchedule));
        } catch (error) {
            console.error('Failed to create schedules', error);
        }
    };
    
    const moveTask = async (taskId: number, oldDay: string, newDay: string, newHours: number) => {
        const task = tasks[taskId];
        if (!task) return;
    
        const oldDayIndex = days.indexOf(oldDay);
        const newDayIndex = days.indexOf(newDay);
    
        const newScheduleData = [...chartData];
        const oldTaskIndex = newScheduleData[oldDayIndex].labels.indexOf(task.title);
        const newTaskIndex = newScheduleData[newDayIndex].labels.indexOf(task.title);
    
        if (oldTaskIndex !== -1) {
            newScheduleData[oldDayIndex].datasets[0].data[oldTaskIndex] -= newHours;
            if (newScheduleData[oldDayIndex].datasets[0].data[oldTaskIndex] <= 0) {
                newScheduleData[oldDayIndex].labels.splice(oldTaskIndex, 1);
                newScheduleData[oldDayIndex].datasets[0].data.splice(oldTaskIndex, 1);
                newScheduleData[oldDayIndex].datasets[0].backgroundColor.splice(oldTaskIndex, 1);
            }
        }
    
        if (newTaskIndex !== -1) {
            newScheduleData[newDayIndex].datasets[0].data[newTaskIndex] += newHours;
        } else {
            newScheduleData[newDayIndex].labels.push(task.title);
            newScheduleData[newDayIndex].datasets[0].data.push(newHours);
            newScheduleData[newDayIndex].datasets[0].backgroundColor.push(taskColorsRef.current[task.title] || '#36A2EB');
        }
    
        setChartData(newScheduleData);
    
        try {
            const response = await fetch(`${WEEKLY_SCHEDULE_URL}/move_task/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ taskId, oldDay, newDay, newHours })
            });
            if (!response.ok) {
                throw new Error('Failed to move task');
            }
        } catch (error) {
            console.error('Failed to move task', error);
        }
    };
    
    return (
        <div className="py-3 px-8 text-gray-3 bg-wheat-2 min-h-screen min-v-screen">
            <div className="flex justify-center mb-12">
            <div className='relative'>
            <p
                onClick={() => setShowModal(prev => !prev)}
                className="text-gray-3 border cursor-pointer rounded-md px-2 py-1 ml-3 hover:bg-orange hover:text-white transition-all duration-400 ease-in-out"
            >
                Short Tasks
            </p>
            {showModal && (
                <div className="absolute -left-16 mt-2 w-64 bg-gray-1 border-gray-2 p-4 rounded-md z-10 animate-modal-grow">
                    <ul className="space-y-2 max-h-108 overflow-y-scroll">
                        {Object.values(shortTasks).map((task) => (
                            <li key={task.id} className="bg-navy text-white p-2 rounded-md flex items-center">
                                <span>{task.title}</span>
                                {task.is_deleted && <span className="text-white ml-auto">Bitti</span>}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            </div>

                <Notes
                showNoteModal={showNoteModal}
                setShowNoteModal={setShowNoteModal}
                />
                                <button
                    onClick={() => navigate('/progress')}
                    className="text-gray-3 border cursor-pointer rounded-md px-2 py-1 ml-3  hover:bg-orange hover:text-white transition-all duration-400 ease-in-out"
                >
                    Progress
                </button>
                <button
                    onClick={() => navigate('/book-tracking')}
                    className="text-gray-3 border cursor-pointer rounded-md px-2 py-1 ml-3  hover:bg-orange hover:text-white transition-all duration-400 ease-in-out"
                >
                    Book Tracking
                </button>
                <button
                onClick={() => setIsModalOpen(true)}
                className="text-gray-3 border cursor-pointer rounded-md px-2 py-1 ml-3  hover:bg-orange hover:text-white transition-all duration-400 ease-in-out"
            >
                Open Form
            </button>

            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-2 bg-opacity-50 z-50 backdrop-blur-md" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-gray-1 p-6 rounded-md shadow-lg shadow-[0_20px_50px_rgba(8,_112,_184,_0.7)] text-gray-3 max-w-md w-full animate-modal-grow" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-2xl text-orange font-bold mb-4 text-center">Task and Hours</h2>
                        <form onSubmit={handleSubmit} className="flex flex-col justify-center items-center space-y-4">
                            <div className="flex flex-col items-center justify-center space-y-2">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Task Name"
                                        name="taskName"
                                        value={taskName}
                                        onChange={(e) => setTaskName(e.target.value)}
                                        className="mt-1 py-1 px-2 block w-full rounded-md border-gray-700 bg-white text-gray-3 shadow-sm focus:outline-none"
                                    />
                                </div>
                                <div className="flex flex-col items-center">
                                    <h1 className='text-orange-2 text-md'>Sleeping Hours</h1>
                                    <div className="flex items-center mt-1 w-36">
                                        <button
                                            onClick={decrementSleepHours}
                                            type="button"
                                            value={sleepHours}
                                            className="px-2 bg-gray-2 text-white rounded-l-md focus:outline-none"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            name="sleepHours"
                                            value={sleepHours}
                                            onChange={(e) => setSleepHours(Number(e.target.value))}
                                            className="w-full text-center px-2 bg-white text-gray-3 shadow-sm focus:outline-none"
                                        />
                                        <button
                                            onClick={incrementSleepHours}
                                            type="button"
                                            className="px-2 bg-gray-2 text-white rounded-r-md focus:outline-none"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center">
                                    <h1 className='text-orange-2'>Meal Hours</h1>
                                    <div className="flex items-center mt-1 w-36">
                                        <button
                                            onClick={decrementMealHours}
                                            type="button"
                                            className="px-2 bg-gray-2 text-white rounded-l-md focus:outline-none"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            name="mealHours"
                                            value={mealHours}
                                            onChange={(e) => setMealHours(Number(e.target.value))}
                                            className="w-full text-center px-2 bg-white text-gray-3 shadow-sm focus:outline-none"
                                        />
                                        <button
                                            onClick={incrementMealHours}
                                            type="button"
                                            className="px-2 bg-gray-2 text-white rounded-r-md focus:outline-none"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                {!isShortTask && (
                                    <>
                                        <div className="w-24 flex flex-col items-center w-36">
                                            <Tippy content="Weekly Hours">
                                                <label className="block text-md text-orange-2">Hours</label>
                                            </Tippy>
                                            <div className="flex items-center mt-1">
                                                <button
                                                    onClick={decrementHours}
                                                    type="button"
                                                    className="px-2 bg-gray-2 text-white rounded-l-md focus:outline-none"
                                                >
                                                    -
                                                </button>
                                                <input
                                                    type="number"
                                                    name="taskHours"
                                                    value={taskHours}
                                                    onChange={(e) => setTaskHours(Number(e.target.value))}
                                                    className="w-full text-center px-2 bg-white text-gray-3 shadow-sm focus:outline-none"
                                                    max={190}
                                                    step={1}
                                                />
                                                <button
                                                    onClick={incrementHours}
                                                    type="button"
                                                    className="px-2 bg-gray-2 text-white rounded-r-md focus:outline-none"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                        <div className="w-24 flex flex-col items-center w-36">
                                            <label className="block text-md text-orange-2">Days</label>
                                            <div className="flex items-center mt-1">
                                                <button
                                                    onClick={decrementDays}
                                                    type="button"
                                                    className="px-2 bg-gray-2 text-white rounded-l-md focus:outline-none"
                                                >
                                                    -
                                                </button>
                                                <input
                                                    type="number"
                                                    name="taskDays"
                                                    value={taskDays}
                                                    onChange={(e) => setTaskDays(Number(e.target.value))}
                                                    className="w-full text-center px-2 bg-white text-gray-3 shadow-sm appearance-none no-spin"
                                                />
                                                <button
                                                    onClick={incrementDays}
                                                    type="button"
                                                    className="px-2 bg-gray-2 text-white hover:scale-105 rounded-r-md focus:outline-none"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                                <div className="w-24 flex flex-col items-center">
                                    <label className="block text-md text-orange-2">Short Task</label>
                                    <input
                                        type="checkbox"
                                        checked={isShortTask}
                                        onChange={() => setIsShortTask(!isShortTask)}
                                        className="mt-1 h-5 w-5 text-blue-600 bg-orange border-gray-700 rounded focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end mt-6">
                                <button
                                    type="submit"
                                    className="px-12 py-2 border-2 border-gray-300 hover:border-white text-2xl cursor-pointer shadow-sm shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] hover:bg-orange-2 active:scale-105 transition-all hover:text-white rounded-md"
                                >
                                    <MdAddTask />
                                </button>
                            </div>
                            {error && <div className="mt-4 text-navy border px-2 py-1 rounded-md hover:text-white hover:bg-navy cursor-pointer transition-all">{error}</div>}
                        </form>
                    </div>
                </div>
            )}
            </div>

            <div>

        </div>
            <div className="mt-6 flex">
                <div className="w-1/2 pr-4">
                    <h2 className="text-2xl text-orange font-bold mb-4 text-center">Daily Tasks</h2>
                    <ul className="space-y-2">
                        {Object.values(tasks).filter(task => !task.is_short_task).map((task: Task) => (
                            <li key={task.id} className="flex hover:scale-101 transition-all cursor-pointer justify-between bg-gray-2 text-white items-center border border-gray-2 rounded-md p-2" onContextMenu={(e) => handleContextMenu(e, task)}>
                                <div>
                                    <span>{task.title}</span>
                                    <span className="ml-2">{task.duration} hours</span>
                                     <span className="ml-2">{task.days} days</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="w-1/2 pl-4">
                    <h2 className="text-2xl font-bold mb-4 text-orange text-center">Short Tasks</h2>
                    <ul className="space-y-2">
                        {Object.values(shortTasks).filter(task => !task.is_deleted).map((task: Task) => (
                            <li key={task.id} className={`flex hover:scale-101 transition-all cursor-pointer justify-between items-center bg-navy text-white p-2 rounded-md transform z-1 ${task.is_deleted ? '-translate-x-full' : ''}`}>
                                <div>
                                    <span>{task.title}</span>
                                </div>
                                <div className="relative">
                                    <div className="w-6 h-6 rounded-full bg-orange animate-pulse cursor-pointer border-2 border-gray-2" onClick={() => handleShortTaskDelete(task.id)}></div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

            </div>
            <div className='flex justify-center items-center mt-12'>
            <button
                    onClick={handleClick}
                    className={`text-2xl text-navy border-2 hover:bg-orange-2 hover:border-orange hover:text-white rounded-md px-2 py-1 transition-all duration-400 ease-in-out ${pulse ? 'animate-pulse' : ''}`}
                >
                    Distribute Tasks
                </button>
            </div>
            {contextMenu.visible && contextMenu.task && (
                <div style={{ position: 'absolute', top: contextMenu.y, left: contextMenu.x, zIndex: 1000 }} className="bg-gray-3 text-white rounded-md shadow-lg">
                    <ul className="p-2">
                        <li
                            className="p-2 hover:bg-orange rounded-t-md cursor-pointer"
                            onClick={() => {
                                if (contextMenu.task) {
                                    setEditTask(contextMenu.task);
                                    handleContextMenuClose();
                                }
                            }}
                        >
                            Edit
                        </li>
                        <li
                            className="p-2 hover:bg-orange rounded-b-md cursor-pointer"
                            onClick={() => {
                                if (contextMenu.task) {
                                    confirmDeleteTask(contextMenu.task.id);
                                    handleContextMenuClose();
                                }
                            }}
                        >
                            Delete
                        </li>
                    </ul>
                </div>
            )}
            <div className="mt-8 flex flex-col">
                {chartData.length > 0 && days.map((day, index) => (
                    <div key={day} className={`mt-4 ${index === currentDayIndex - 1 ? 'order-first' : ''}`}>
                        <h3 className={`text-xl font-bold mb-2 ${index === currentDayIndex - 1 ? 'text-navy-3 text-3xl' : 'text-navy-3'}`}>{day}</h3>
                        <div className={`relative ${index === currentDayIndex - 1 ? 'w-128 h-128 mx-auto' : 'w-64 h-64 mx-auto opacity-75'}`}>
                            <Doughnut
                                data={chartData[index]}
                                options={{
                                    onClick: (event: ChartEvent, elements, chart) => {
                                        if (elements.length > 0) {
                                            const clickedTask = chart.data.labels?.[elements[0].index];
                                            if (clickedTask) {
                                                handleTaskComplete(clickedTask as string, index); // Day index is 0-based
                                            }
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <button 
                onClick={() => setIsOpen(true)} 
                className="text-white px-4 py-2 bg-orange rounded-md hover:bg-orange-2"
            >
                Open Move Task Modal
            </button>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800 bg-opacity-75">
                    <div className="bg-white rounded-lg p-6 w-1/2">
                        <div className="flex space-x-4 mb-7">
                            <div className="flex-1">
                                <label className="block text-navy-2 text-lg font-medium text-gray-700">Task Name</label>
                                <select
                                    value={selectedTaskId || ''}
                                    onChange={(e) => {
                                        setSelectedTaskId(Number(e.target.value));
                                        setSelectedTaskDay(''); // Seçilen görev değiştiğinde gün seçimini sıfırlayın
                                    }}
                                    className="mt-1 px-1 py-1 block text-navy-2 w-full rounded-md border-gray-700 bg-gray-200 text-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                                >
                                    <option value="" disabled>Select Task</option>
                                    {Object.values(tasks).map(task => (
                                        <option key={task.id} value={task.id}>{task.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-navy-2 text-lg font-medium text-gray-700">Old Day</label>
                                <select
                                    value={selectedTaskDay || ''}
                                    onChange={(e) => setSelectedTaskDay(e.target.value)}
                                    className="mt-1 px-1 py-1 block text-navy-2 w-full rounded-md border-gray-700 bg-gray-200 text-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                                >
                                    <option value="" disabled>Select Day</option>
                                    {days.map(day => (
                                        <option key={day} value={day}>{day}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-navy-2 text-lg font-medium text-gray-700">New Day</label>
                                <select
                                    value={newDay}
                                    onChange={(e) => setNewDay(e.target.value)}
                                    className="mt-1 px-1 py-1 block w-full rounded-md border-gray-700 bg-gray-200 text-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                                >
                                    <option value="" disabled>Select Day</option>
                                    {days.map(day => (
                                        <option key={day} value={day}>{day}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-navy-2 text-lg font-medium text-gray-700">New Hours</label>
                                <input
                                    type="number"
                                    value={newHours}
                                    onChange={(e) => setNewHours(Number(e.target.value))}
                                    className="mt-1 px-2 py-1 block w-full rounded-md border-gray-700 bg-gray-200 text-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end space-x-4">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-700 px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (selectedTaskId && selectedTaskDay && newDay && newHours > 0) {
                                        moveTask(selectedTaskId, selectedTaskDay, newDay, newHours);
                                        setIsOpen(false);
                                    }
                                }}
                                className="text-white px-4 py-2 bg-orange rounded-md hover:bg-orange-2"
                            >
                                Move Task
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showDeleteModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-2 bg-opacity-50">
                    <div className="bg-gray-400 p-4 rounded-md shadow-lg">
                        <h2 className="text-xl text-white font-bold mb-4">Are you sure to delete?</h2>
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={handleDeleteTask}
                                className="px-2 py-1 bg-gray-2 text-white rounded-md hover:bg-orange focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                            >
                                Delete
                            </button>
                            <button
                                onClick={cancelDeleteTask}
                                className="px-2 py-1 text-white rounded-md hover:bg-orange focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {editTask && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-2 bg-opacity-80 backdrop-blur-sm">
                    <div className="bg-gray-1 p-4 rounded-md shadow-lg">
                        <h2 className="text-xl text-center text-orange font-bold mb-4">Edit Task</h2>
                        <div>
                            <label className="block text-md text-orange-2 mb-1 font-medium">Task Title</label>
                            <input
                                type="text"
                                name="title"
                                value={editTask.title}
                                onChange={(e) => handleTaskChange('title', e.target.value)}
                                className="mt-1 block w-full mb-2 px-2 rounded-md border-gray-70 focus:outline-none"
                            />
                            <label className="block text-md text-orange-2 mb-1 font-medium">Süre (Saat)</label>
                            <input
                                type="number"
                                name="duration"
                                max={190}
                                value={editTask.duration}
                                onChange={(e) => handleTaskChange('duration', parseFloat(e.target.value))}
                                className="mt-1 block w-full mb-2 px-2 rounded-md border-gray-70 focus:outline-none"
                            />
                            <label className="block text-md text-orange-2 mb-1 font-medium">Days</label>
                            <input
                                type="number"
                                name="days"
                                max={7}
                                value={editTask.days}
                                onChange={(e) => handleTaskChange('days', parseInt(e.target.value))}
                                className="mt-1 block w-full mb-2 px-2 rounded-md border-gray-70 focus:outline-none"
                            />
                            <div className="flex justify-end space-x-2 mt-4">
                                <button
                                    onClick={async () => {
                                        try {
                                            await fetch(`${API_URL}/tasks/${editTask.id}/`, {
                                                method: 'PUT',
                                                headers: {
                                                    'Content-Type': 'application/json'
                                                },
                                                body: JSON.stringify(editTask)
                                            });
                                            fetchTasks();
                                            fetchShortTasks();
                                            setEditTask(null);
                                        } catch (error) {
                                            console.error('Failed to update task', error);
                                        }
                                    }}
                                    className="px-2 py-1 bg-gray-400 text-white rounded-md hover:bg-orange transition-all focus:outline-none"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={() => setEditTask(null)}
                                    className="px-2 py-1 bg-gray-400 text-white rounded-md hover:bg-orange transition-all focus:outline-none"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WeeklyPlanner;
