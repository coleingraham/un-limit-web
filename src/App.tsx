import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { InstrumentConfigProvider } from './hooks/useInstrumentConfig.tsx'
import InstrumentPage from './pages/InstrumentPage.tsx'
import SettingsPage from './pages/SettingsPage.tsx'
import SynthDefEditorPage from './pages/SynthDefEditorPage.tsx'

function App() {
  return (
    <InstrumentConfigProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<InstrumentPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/editor" element={<SynthDefEditorPage />} />
        </Routes>
      </BrowserRouter>
    </InstrumentConfigProvider>
  )
}

export default App
