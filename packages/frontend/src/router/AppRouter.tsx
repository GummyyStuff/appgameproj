import React from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import HomePage from '../pages/HomePage'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import ForgotPasswordPage from '../pages/ForgotPasswordPage'
import ProfilePage from '../pages/ProfilePage'
import RoulettePage from '../pages/RoulettePage'
import BlackjackPage from '../pages/BlackjackPage'
import PlinkoPage from '../pages/PlinkoPage'
import HistoryPage from '../pages/HistoryPage'
import ProtectedRoute from '../components/auth/ProtectedRoute'

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
        path: 'register',
        element: <RegisterPage />,
      },
      {
        path: 'forgot-password',
        element: <ForgotPasswordPage />,
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'roulette',
        element: (
          <ProtectedRoute>
            <RoulettePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'blackjack',
        element: (
          <ProtectedRoute>
            <BlackjackPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'plinko',
        element: (
          <ProtectedRoute>
            <PlinkoPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'history',
        element: (
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
])

const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />
}

export default AppRouter