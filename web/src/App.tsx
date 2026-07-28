import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { WalletProvider } from './context/WalletContext'
import { Layout } from './components/Layout'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Onboarding } from './pages/Onboarding'
import { Board } from './pages/Board'
import { ListingDetail } from './pages/ListingDetail'
import { MyWork } from './pages/MyWork'
import { Credits } from './pages/Credits'
import { Profile } from './pages/Profile'
import { Sponsor } from './pages/Sponsor'

export default function App() {
  return (
    <AuthProvider>
      <WalletProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Landing />} />
              <Route path="login" element={<Login />} />
              <Route path="signup" element={<Signup />} />
              <Route path="onboarding" element={<Onboarding />} />
              <Route path="board" element={<Board />} />
              <Route path="listings/:id" element={<ListingDetail />} />
              <Route path="my-work" element={<MyWork />} />
              <Route path="credits" element={<Credits />} />
              <Route path="profile" element={<Profile />} />
              <Route path="sponsor" element={<Sponsor />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </WalletProvider>
    </AuthProvider>
  )
}
