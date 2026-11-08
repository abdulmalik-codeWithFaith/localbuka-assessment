import { BrowserRouter, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { CurrentUserProvider } from './context/CurrentUserProvider'
import { DiscoverPage } from './pages/DiscoverPage'
import { RewardsPage } from './pages/RewardsPage'

export default function App() {
  return (
    <CurrentUserProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DiscoverPage />} />
            <Route path="rewards" element={<RewardsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CurrentUserProvider>
  )
}
