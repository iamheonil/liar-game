import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/global.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('루트 엘리먼트를 찾지 못함')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
