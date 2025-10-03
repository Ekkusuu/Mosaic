import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import MainPage from './components/MainPage';
import Auth from './components/Auth';
import ProfilePage from './components/ProfilePage';
import RequireAuth from './components/RequireAuth';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<RequireAuth><MainPage /></RequireAuth>} />
                <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;