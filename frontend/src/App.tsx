import { Routes, Route } from "react-router-dom"
import Home from "./pages/Home"
import StockDetail from "./pages/StockDetail"

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/stock/:symbol" element={<StockDetail />} />
    </Routes>
  )
}

export default App