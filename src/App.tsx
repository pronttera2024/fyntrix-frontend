import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Main from './pages/Main'
import Login from './pages/Auth/Login'
import CreateAccount from './pages/Auth/CreateAccount'
import PrivateRoute from './components/PrivateRoute'
import NotFound from './pages/NotFound'
import { GOOGLE_CLIENT_ID } from './config/api'

// Custom styles for exit toast progress bars
const customToastStyles = `
  .exit-toast-profit .Toastify__progress-bar {
    background: #16a34a !important;
  }
  .exit-toast-loss .Toastify__progress-bar {
    background: #dc2626 !important;
  }
  .Toastify__progress-bar {
    height: 4px !important;
  }
  
  /* Mobile-specific positioning fixes */
  @media (max-width: 768px) {
    .Toastify__toast-container--top-center {
      left: 50% !important;
      right: auto !important;
      transform: translateX(-50%) !important;
    }
    .Toastify__toast-container--top-right {
      left: 16px !important;
      right: 16px !important;
      transform: none !important;
    }
    .Toastify__toast {
      margin: 0 auto 8px auto !important;
    }
  }
`

function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <style>{customToastStyles}</style>
      <ToastContainer 
        position={isMobile ? "top-center" : "top-right"}
        newestOnTop={true}
        stacked={true}
      />
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/create-account" element={<CreateAccount />} />
          
          {/* Private routes */}
          <Route element={<PrivateRoute/>}>
            <Route path="/" element={<Main />} />
            {/* Add more Routes Below */}
          </Route>
          
          {/* 404 Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  )
}

export default App