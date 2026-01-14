import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import Main from './pages/Main'
import Login from './pages/Auth/Login'
import CreateAccount from './pages/Auth/CreateAccount'
import PrivateRoute from './components/PrivateRoute'
import NotFound from './pages/NotFound'
import { GOOGLE_CLIENT_ID } from './config/api'

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
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