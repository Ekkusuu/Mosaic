import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import './components/Color.css';
import './components/ColorThemeHoneycomb.css';
import './components/ColorThemeForest.css';
import './components/ColorThemeSakura.css';
import './components/ColorThemeCoffee.css';
import MainPage from './components/MainPage';
import Auth from './components/Auth';
import ProfilePage from './components/ProfilePage';
import RequireAuth from './components/RequireAuth';
import PublicProfile from "./components/PublicProfile.tsx";
import FaceVerificationPage from './components/FaceVerificationPage';
import EmailVerificationPage from './components/EmailVerificationPage';
import MobileSelfie from './components/MobileSelfie';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/verify-face" element={<FaceVerificationPage />} />
                    <Route path="/verify-email" element={<EmailVerificationPage />} />
                    <Route path="/mobile-selfie" element={<MobileSelfie />} />
                    <Route path="/" element={<RequireAuth><MainPage /></RequireAuth>} />
                    <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                    <Route path="/pp" element={<PublicProfile />} />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;