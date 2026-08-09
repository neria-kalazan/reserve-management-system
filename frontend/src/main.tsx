import '@fontsource/heebo/400.css'
import '@fontsource/heebo/500.css'
import '@fontsource/heebo/600.css'
import '@fontsource/heebo/700.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/App'
import { AppProviders } from '@/app/providers/app-providers'

import './index.css'

document.documentElement.lang = 'he'
document.documentElement.dir = 'rtl'
document.documentElement.classList.add('dark')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
