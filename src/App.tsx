import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { InstrumentConfigProvider } from './hooks/useInstrumentConfig.tsx'
import { MicrosynthEngine } from './utils/MicrosynthEngine.ts'
import InstrumentPage from './pages/InstrumentPage.tsx'
import SettingsPage from './pages/SettingsPage.tsx'
import SynthDefEditorPage from './pages/SynthDefEditorPage.tsx'

// Install native DOM listeners for mobile audio unlock as early as possible
MicrosynthEngine.installUnlock();

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
