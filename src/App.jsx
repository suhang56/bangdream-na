import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import LayoutShell from './components/LayoutShell/LayoutShell.jsx'
import Home from './pages/Home.jsx'
import Events from './pages/Events.jsx'
import EventDetail from './pages/EventDetail.jsx'
import Gallery from './pages/Gallery.jsx'
import GallerySubmit from './pages/GallerySubmit.jsx'
import Members from './pages/Members.jsx'
import News from './pages/News.jsx'
import NewsDetail from './pages/NewsDetail.jsx'
import About from './pages/About.jsx'
import Rules from './pages/Rules.jsx'
import Search from './pages/Search.jsx'
import Admin from './pages/Admin.jsx'
import NotFound from './pages/NotFound.jsx'
import './App.css'

function ChromeAndRoutes() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')
  const routes = (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/news" element={<News />} />
      <Route path="/news/:id" element={<NewsDetail />} />
      <Route path="/events" element={<Events />} />
      <Route path="/events/:slug" element={<EventDetail />} />
      <Route path="/gallery" element={<Gallery />} />
      <Route path="/gallery/submit" element={<GallerySubmit />} />
      <Route path="/members" element={<Members />} />
      <Route path="/about" element={<About />} />
      <Route path="/rules" element={<Rules />} />
      <Route path="/search" element={<Search />} />
      <Route path="/admin/*" element={<Admin />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
  return isAdmin ? routes : <LayoutShell>{routes}</LayoutShell>
}

export default function App() {
  return (
    <BrowserRouter>
      <ChromeAndRoutes />
    </BrowserRouter>
  )
}
