import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Admin } from './pages/Admin'
import { ShopFrontend } from './pages/ShopFrontend'
import { ShopList } from './pages/ShopList'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ShopList />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/shop/:shopId" element={<ShopFrontend />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
