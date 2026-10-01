import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Recuperacion from './Recuperacion.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Recuperacion><App /></Recuperacion>
  </StrictMode>,
)
