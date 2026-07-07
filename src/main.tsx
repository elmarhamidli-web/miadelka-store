import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './App.css'
import App from './App.tsx'
import { StoreProvider } from './context/StoreContext.tsx'
import { ProductsProvider } from './data/productsStore.tsx'
import { I18nProvider } from './i18n'
import { DEFAULT_LOCALE } from './i18n/registry'

document.documentElement.lang = DEFAULT_LOCALE

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <ProductsProvider>
          <StoreProvider>
            <App />
          </StoreProvider>
        </ProductsProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
)
