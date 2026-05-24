import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Nav from './components/Nav'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MyBooks from './pages/MyBooks'
import BookDetail from './pages/BookDetail'
import AddBook from './pages/AddBook'
import Stats from './pages/Stats'
import Discover from './pages/Discover'
import Lists from './pages/Lists'
import Friends from './pages/Friends'
import Articles from './pages/Articles'
import Profile from './pages/Profile'
import ScanBooks from './pages/ScanBooks'

export type OutletCtx = { user: Session['user'] }

function ProtectedLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (!session) return <Navigate to="/login" replace />

  return (
    <>
      <Nav user={session.user} />
      <Outlet context={{ user: session.user } satisfies OutletCtx} />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/books" element={<MyBooks />} />
          <Route path="/books/add" element={<AddBook />} />
          <Route path="/books/scan" element={<ScanBooks />} />
          <Route path="/books/:id" element={<BookDetail />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/lists" element={<Lists />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
