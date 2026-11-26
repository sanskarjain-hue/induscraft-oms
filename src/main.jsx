import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
// Icons (the "ti ti-..." classes) and the DM Sans font are bundled with the app,
// not fetched from a CDN, so they can't disappear because of a blocked network.
import '@tabler/icons-webfont/tabler-icons.min.css'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import './styles.css'
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
