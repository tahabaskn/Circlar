import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import WeeklyPlanner from './pages/Home';
import Progress from './pages/Progess';
import BookTrackingPage from './pages/BookTrack';
import Stopwatch from './components/StopWatch';

const App: React.FC = () => {
    const [completedTasks, setCompletedTasks] = useState<{ [date: string]: { [taskName: string]: boolean } }>({});

    return (
        <Router>
            <div>
            <Stopwatch />
            <Routes>
                <Route path="/" element={<WeeklyPlanner completedTasks={completedTasks} setCompletedTasks={setCompletedTasks} />} />
                <Route path="/progress" element={<Progress completedTasks={completedTasks} />} />
                <Route path="/book-tracking" element={<BookTrackingPage />} />
            </Routes>
            </div>
        </Router>
    );
};

export default App;
