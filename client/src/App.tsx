import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { EntryPage } from '@/pages/EntryPage'
import { LobbyPage } from '@/pages/LobbyPage'
import { RoomPage } from '@/pages/RoomPage'

/**
 * 화면은 셋뿐임. 방 주소를 URL 에 두는 이유는 링크 하나로 친구를 부를 수 있게 하기 위함이며,
 * 그 링크로 들어온 사람은 방 화면에서 곧바로 입장 처리됨.
 */
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EntryPage />} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/room/:roomId" element={<RoomPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
