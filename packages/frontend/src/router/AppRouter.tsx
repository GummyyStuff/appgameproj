import React, { Suspense, lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import HomePage from '../pages/HomePage'
import LoginPage from '../pages/LoginPage'
import ProtectedRoute from '../components/auth/ProtectedRoute'

// Lazy load game pages for better performance
const RoulettePage = lazy(() => import('../pages/RoulettePage'))
const StockMarketPage = lazy(() => import('../pages/StockMarketPage'))
const CaseOpeningPage = lazy(() => import('../pages/CaseOpeningPage'))
const ProfilePage = lazy(() => import('../pages/ProfilePage'))
const LeaderboardPage = lazy(() => import('../pages/LeaderboardPage'))

// Loading component for lazy routes
const PageLoader = () => (
  <div className="min-h-screen bg-tarkov-darker flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tarkov-accent mx-auto mb-4"></div>
      <p className="text-tarkov-accent">Loading...</p>
    </div>
  </div>
)

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ProfilePage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'roulette',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <RoulettePage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'stock-market',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <StockMarketPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'cases',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <CaseOpeningPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'leaderboard',
        element: (
          <Suspense fallback={<PageLoader />}>
            <LeaderboardPage />
          </Suspense>
        ),
      },
    ],
  },
])

const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />
}

export default AppRouter