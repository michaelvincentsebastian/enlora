import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Dashboard from './pages/Dashboard'
import Setup from './pages/Setup'
import Storage from './pages/Storage'
import Pipeline from './pages/Pipeline'
import Connections from './pages/Connections'
import DataModeling from './pages/DataModeling'
import Analytics from './pages/Analytics'
import Catalog from './pages/Catalog'
import Workspace from './pages/Workspace'
import Infrastructure from './pages/Infrastructure'
import AI from './pages/AI'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <div className="main-content">
          <TopBar />
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/storage" element={<Storage />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/modeling" element={<DataModeling />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/infrastructure" element={<Infrastructure />} />
            <Route path="/ai" element={<AI />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}
