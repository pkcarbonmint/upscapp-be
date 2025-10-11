import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import DebugAppEntry from './DebugAppEntry.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DebugAppEntry />
  </StrictMode>,
)
