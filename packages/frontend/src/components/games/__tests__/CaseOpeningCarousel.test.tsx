import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import CaseOpeningCarousel from '../CaseOpeningCarousel'
import type { CarouselItemData } from '../CaseOpeningCarousel'
import type { TarkovItem } from '../ItemReveal'

vi.mock('../../../hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({
    playCaseOpen: vi.fn(),
    playCaseReveal: vi.fn(),
    playRarityReveal: vi.fn(),
    playBetSound: vi.fn(),
    playWinSound: vi.fn(),
    playLoseSound: vi.fn(),
    playSpinSound: vi.fn(),
    playCardSound: vi.fn(),
    setVolume: vi.fn(),
    toggleMute: vi.fn(),
    isMuted: false,
  }),
}))

vi.mock('../../utils/currency', () => ({
  formatCurrency: (amount: number) => `₽${amount.toLocaleString()}`,
}))

const createTarkovItem = (overrides: Partial<TarkovItem> = {}): TarkovItem => ({
  id: 'item-1',
  name: 'Test Item',
  rarity: 'rare',
  base_value: 1000,
  category: 'electronics',
  is_active: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  ...overrides,
})

const createCarouselItems = (count: number, winningIndex: number): CarouselItemData[] =>
  Array.from({ length: count }, (_, i) => ({
    item: createTarkovItem({
      id: `item-${i}`,
      name: `Item ${i}`,
      rarity: i === winningIndex ? 'legendary' : 'common',
      base_value: i === winningIndex ? 50000 : 100 + i * 10,
    }),
    id: `carousel-${i}`,
    isWinning: i === winningIndex,
  }))

const defaultProps = {
  items: createCarouselItems(50, 30),
  winningIndex: 30,
  isSpinning: false,
  onSpinComplete: vi.fn(),
}

describe('CaseOpeningCarousel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
  })

  test('renders the carousel container', () => {
    const { container } = render(<CaseOpeningCarousel {...defaultProps} />)
    expect(container.querySelector('.overflow-hidden')).toBeTruthy()
  })

  test('renders all carousel items', () => {
    render(<CaseOpeningCarousel {...defaultProps} />)
    expect(screen.getByText('Item 0')).toBeTruthy()
    expect(screen.getByText('Item 49')).toBeTruthy()
  })

  test('renders the center pointer indicators', () => {
    const { container } = render(<CaseOpeningCarousel {...defaultProps} />)
    const topPointer = container.querySelector('.border-b-tarkov-accent')
    const bottomPointer = container.querySelector('.border-t-tarkov-accent')
    expect(topPointer).toBeTruthy()
    expect(bottomPointer).toBeTruthy()
  })

  test('renders the center highlight area', () => {
    const { container } = render(<CaseOpeningCarousel {...defaultProps} />)
    const highlight = container.querySelector('.bg-tarkov-accent\\/10')
    expect(highlight).toBeTruthy()
  })

  test('renders item names from carousel data', () => {
    render(<CaseOpeningCarousel {...defaultProps} />)
    expect(screen.getByText('Item 30')).toBeTruthy()
  })

  test('renders formatted currency values', () => {
    render(<CaseOpeningCarousel {...defaultProps} />)
    expect(screen.getByText('₽100')).toBeTruthy()
  })

  test('handles empty items array without crashing', () => {
    expect(() => {
      render(<CaseOpeningCarousel {...defaultProps} items={[]} winningIndex={0} />)
    }).not.toThrow()
  })

  test('renders gradient fade edges', () => {
    const { container } = render(<CaseOpeningCarousel {...defaultProps} />)
    const leftFade = container.querySelector('.from-tarkov-dark')
    const rightFade = container.querySelector('.bg-gradient-to-l')
    expect(leftFade).toBeTruthy()
    expect(rightFade).toBeTruthy()
  })

  test('renders items with different rarities', () => {
    const rarities: Array<'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'> = [
      'common', 'uncommon', 'rare', 'epic', 'legendary',
    ]
    const items: CarouselItemData[] = rarities.map((rarity, i) => ({
      item: createTarkovItem({
        id: `rarity-${i}`,
        name: `${rarity} Item`,
        rarity,
      }),
      id: `carousel-rarity-${i}`,
      isWinning: false,
    }))

    render(<CaseOpeningCarousel {...defaultProps} items={items} winningIndex={0} />)
    expect(screen.getByText('common Item')).toBeTruthy()
    expect(screen.getByText('legendary Item')).toBeTruthy()
  })

  test('renders category icons for items without images', () => {
    const items: CarouselItemData[] = [
      {
        item: createTarkovItem({ id: 'med', name: 'Medical Item', category: 'medical' }),
        id: 'c-med',
        isWinning: false,
      },
      {
        item: createTarkovItem({ id: 'elec', name: 'Electronics Item', category: 'electronics' }),
        id: 'c-elec',
        isWinning: false,
      },
    ]

    render(<CaseOpeningCarousel {...defaultProps} items={items} winningIndex={0} />)
    expect(screen.getByText('🏥')).toBeTruthy()
    expect(screen.getByText('💻')).toBeTruthy()
  })

  test('handles large item arrays', () => {
    const largeItems = createCarouselItems(1000, 500)
    expect(() => {
      render(<CaseOpeningCarousel {...defaultProps} items={largeItems} winningIndex={500} />)
    }).not.toThrow()
    expect(screen.getByText('Item 0')).toBeTruthy()
    expect(screen.getByText('Item 999')).toBeTruthy()
  })

  test('clamps winning index to valid range', () => {
    expect(() => {
      render(<CaseOpeningCarousel {...defaultProps} winningIndex={-1} />)
    }).not.toThrow()
  })

  test('renders items with missing rarity as common', () => {
    const items: CarouselItemData[] = [
      {
        item: {
          ...createTarkovItem(),
          id: 'no-rarity',
          name: 'No Rarity',
          rarity: undefined as any,
        },
        id: 'c-no-rarity',
        isWinning: false,
      },
    ]

    render(<CaseOpeningCarousel {...defaultProps} items={items} winningIndex={0} />)
    expect(screen.getByText('No Rarity')).toBeTruthy()
  })
})
