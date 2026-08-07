import { useState, useEffect } from 'react'
import axios from 'axios'

export default function StatusBadge() {
  const [status, setStatus] = useState('pending')

  useEffect(() => {
    const check = async () => {
      try {
        const res = await axios.get('/health', { timeout: 3000 })
        setStatus(res.data?.status === 'ok' ? 'online' : 'offline')
      } catch {
        setStatus('offline')
      }
    }
    check()
    const t = setInterval(check, 15000)
    return () => clearInterval(t)
  }, [])

  const labels = { online: 'Platform API', offline: 'API Offline', pending: 'Connecting…' }

  return (
    <span className={`status-badge ${status}`}>
      <span className={`status-dot ${status}`} />
      {labels[status]}
    </span>
  )
}
