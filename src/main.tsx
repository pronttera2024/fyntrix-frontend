import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { registerServiceWorker, setupInstallPrompt, setupNetworkDetection } from './pwa-register'
import TemporaryOverlay from './components/TemporaryOverlay'

// Register PWA service worker
registerServiceWorker()

// Setup PWA install prompt
setupInstallPrompt()

// Setup network status detection
setupNetworkDetection()

createRoot(document.getElementById('root')!).render(
<>
<TemporaryOverlay/>
<App />
</>)
