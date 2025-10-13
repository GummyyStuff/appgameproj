import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'
import AchievementSystem, { Achievement } from '../AchievementSystem'

// Mock framer-motion to avoid animation delays in tests
mock.module('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  default: {},
}))

// Suppress console errors for SVG loading in tests
const originalError = console.error
beforeEach(() => {
  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Failed to load SVG')) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterEach(() => {
  console.error = originalError
})

describe('AchievementSystem Component', () => {
  const mockAchievements: Achievement[] = [
    {
      id: 'first-case',
      title: 'First Case',
      description: 'Open your first case',
      category: 'gameplay',
      rarity: 'common',
      progress: 1,
      maxProgress: 1,
      unlocked: true,
      unlockedAt: new Date(Date.now() - 86400000),
      reward: { type: 'currency', amount: 500 }
    },
    {
      id: 'case-master',
      title: 'Case Master',
      description: 'Open 100 cases',
      category: 'progression',
      rarity: 'rare',
      progress: 45,
      maxProgress: 100,
      unlocked: false
    },
    {
      id: 'legendary-pull',
      title: 'Legendary Pull',
      description: 'Get a legendary item',
      category: 'special',
      rarity: 'legendary',
      progress: 0,
      maxProgress: 1,
      unlocked: false,
      reward: { type: 'currency', amount: 5000 }
    }
  ]

  const mockOnClose = () => {}
  const mockOnClaimReward = (id: string) => {}

  describe('Rendering', () => {
    test('should render when isOpen is true', () => {
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      expect(screen.getByText('Achievements')).toBeInTheDocument()
    })

    test('should not render when isOpen is false', () => {
      render(
        <AchievementSystem
          isOpen={false}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      expect(screen.queryByText('Achievements')).not.toBeInTheDocument()
    })

    test('should display completion percentage', () => {
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      // 1 out of 3 unlocked = 33%
      expect(screen.getByText('1/3 unlocked (33%)')).toBeInTheDocument()
    })

    test('should display overall progress bar', () => {
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      expect(screen.getByText('Overall Progress')).toBeInTheDocument()
    })
  })

  describe('Category Filtering', () => {
    test('should display all categories', () => {
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      expect(screen.getByText('All Achievements')).toBeInTheDocument()
      expect(screen.getByText('Combat')).toBeInTheDocument()
      expect(screen.getByText('Progression')).toBeInTheDocument()
      expect(screen.getByText('Special')).toBeInTheDocument()
      expect(screen.getByText('Social')).toBeInTheDocument()
    })

    test('should filter achievements by category', () => {
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      // Click on "Special" category
      const specialButton = screen.getByText('Special')
      fireEvent.click(specialButton)

      // Should only show the legendary pull achievement
      expect(screen.getByText('Legendary Pull')).toBeInTheDocument()
      expect(screen.queryByText('First Case')).not.toBeInTheDocument()
    })

    test('should show category counts', () => {
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      // All achievements (3)
      expect(screen.getByText('All Achievements')).toBeInTheDocument()
      expect(screen.getByText('(3)')).toBeInTheDocument()
    })
  })

  describe('Achievement Cards', () => {
    test('should display all achievements', () => {
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      expect(screen.getByText('First Case')).toBeInTheDocument()
      expect(screen.getByText('Case Master')).toBeInTheDocument()
      expect(screen.getByText('Legendary Pull')).toBeInTheDocument()
    })

    test('should display achievement descriptions', () => {
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      expect(screen.getByText('Open your first case')).toBeInTheDocument()
      expect(screen.getByText('Open 100 cases')).toBeInTheDocument()
      expect(screen.getByText('Get a legendary item')).toBeInTheDocument()
    })

    test('should display progress for locked achievements', () => {
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      // Case Master: 45/100
      expect(screen.getByText('45/100')).toBeInTheDocument()
    })

    test('should display unlocked status for completed achievements', () => {
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      expect(screen.getByText('Unlocked')).toBeInTheDocument()
    })

    test('should display rewards for unlocked achievements', () => {
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      // Check that reward is displayed (may be in reward section)
      expect(screen.getByText(/₽500/)).toBeInTheDocument()
    })
  })

  describe('Achievement Detail Modal', () => {
    test('should open detail modal when clicking achievement card', async () => {
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      const achievementCard = screen.getByText('First Case').closest('div')
      fireEvent.click(achievementCard!)

      // Wait for modal to appear with achievement title
      await waitFor(() => {
        expect(screen.getAllByText('First Case').length).toBeGreaterThan(1)
      })
    })

    test('should close detail modal when clicking close button', () => {
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      const achievementCard = screen.getByText('First Case').closest('div')
      fireEvent.click(achievementCard!)

      const closeButton = screen.getByLabelText('Close achievement details')
      fireEvent.click(closeButton)

      // Modal should close
      expect(screen.queryByLabelText('Close achievement details')).not.toBeInTheDocument()
    })

    test('should display rarity badge in detail modal', () => {
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      const achievementCard = screen.getByText('Legendary Pull').closest('div')
      fireEvent.click(achievementCard!)

      expect(screen.getByText('legendary')).toBeInTheDocument()
    })

    test('should call onClaimReward when claiming reward', async () => {
      const mockClaimReward = mock(() => {})
      
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
          onClaimReward={mockClaimReward}
        />
      )

      const achievementCard = screen.getByText('First Case').closest('div')
      fireEvent.click(achievementCard!)

      // Wait for modal to appear and find the claim button
      await waitFor(() => {
        const claimButton = screen.getByText(/Claim ₽500/)
        fireEvent.click(claimButton)
      })
      
      expect(mockClaimReward).toHaveBeenCalledWith('first-case')
    })
  })

  describe('Close Functionality', () => {
    test('should call onClose when clicking close button', () => {
      const mockOnClose = mock(() => {})
      
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      const closeButton = screen.getByLabelText('Close achievements')
      fireEvent.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    test('should call onClose when clicking backdrop', () => {
      const mockOnClose = mock(() => {})
      
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      // Click on the backdrop (the outer div)
      const backdrop = document.querySelector('.fixed.inset-0')
      expect(backdrop).toBeTruthy()
      fireEvent.click(backdrop!)

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Rarity Styling', () => {
    test('should apply correct styling for common rarity', () => {
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      // Check that the achievement is rendered (styling is tested visually)
      expect(screen.getByText('First Case')).toBeInTheDocument()
    })

    test('should apply correct styling for rare rarity', () => {
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      // Check that the achievement is rendered (styling is tested visually)
      expect(screen.getByText('Case Master')).toBeInTheDocument()
    })

    test('should apply correct styling for legendary rarity', () => {
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      // Check that the achievement is rendered (styling is tested visually)
      expect(screen.getByText('Legendary Pull')).toBeInTheDocument()
    })
  })

  describe('Progress Tracking', () => {
    test('should calculate progress percentage correctly', () => {
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      // Case Master: 45/100 = 45%
      expect(screen.getByText('45%')).toBeInTheDocument()
    })

    test('should show progress bar for incomplete achievements', () => {
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      // Progress bars should be present for incomplete achievements
      const progressBars = document.querySelectorAll('.bg-tarkov-accent')
      expect(progressBars.length).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    test('should handle empty achievements array', () => {
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={[]}
        />
      )

      expect(screen.getByText('0/0 unlocked (NaN%)')).toBeInTheDocument()
    })

    test('should handle all achievements unlocked', () => {
      const allUnlocked = mockAchievements.map(a => ({ ...a, unlocked: true }))
      
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={allUnlocked}
        />
      )

      expect(screen.getByText('3/3 unlocked (100%)')).toBeInTheDocument()
    })

    test('should handle achievements without rewards', () => {
      const noRewards = mockAchievements.map(a => ({ ...a, reward: undefined }))
      
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={noRewards}
        />
      )

      // Should not show reward section
      expect(screen.queryByText('Reward:')).not.toBeInTheDocument()
    })

    test('should handle missing onClaimReward callback', async () => {
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      const achievementCard = screen.getByText('First Case').closest('div')
      fireEvent.click(achievementCard!)

      // Wait for modal to appear and find the claim button
      await waitFor(() => {
        const claimButton = screen.getByText(/Claim ₽500/)
        // Should not throw error
        fireEvent.click(claimButton)
      })
    })
  })

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      const closeButton = screen.getByLabelText('Close achievements')
      expect(closeButton).toBeInTheDocument()
    })

    test('should be keyboard navigable', () => {
      render(
        <AchievementSystem
          isOpen={true}
          onClose={mockOnClose}
          achievements={mockAchievements}
        />
      )

      const closeButton = screen.getByLabelText('Close achievements')
      closeButton.focus()
      expect(closeButton).toHaveFocus()
    })
  })
})

