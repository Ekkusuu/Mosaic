import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import './components/Color.css';
import './components/ColorThemeHoneycomb.css';
import MainPage from './components/MainPage';
import Auth from './components/Auth';
import ProfilePage from './components/ProfilePage';
import RequireAuth from './components/RequireAuth';
import PublicProfile from "./components/PublicProfile.tsx";
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/" element={<RequireAuth><MainPage /></RequireAuth>} />
                    <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                    <Route path="/pp" element={<PublicProfile />} />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;