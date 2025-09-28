// Animation system types for case opening game
import { Easing } from 'framer-motion'

export type AnimationType = 'carousel' | 'reveal'

export interface AnimationConfig {
  type: AnimationType
  duration: number
  easing: Easing | Easing[]
  items?: CarouselItemData[]
  winningIndex?: number
}

export interface AnimationPhase {
  name: string
  duration: number
  easing: string
  effects?: VisualEffect[]
}

export interface VisualEffect {
  type: 'glow' | 'particles' | 'shake' | 'blur'
  intensity: number
  duration: number
}

export interface RevealAnimationConfig {
  duration: number
  easing: string
  revealDelay?: number
}

export interface CarouselAnimationConfig {
  items: CarouselItemData[]
  winningIndex: number
  duration: number
  easing: string
  visibleItems?: number
  itemWidth?: number
}

// Import CarouselItemData from the carousel component
export type { CarouselItemData } from '../components/games/CaseOpeningCarousel'
