import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconProp } from '@fortawesome/fontawesome-svg-core'

interface FontAwesomeSVGProps {
  icon: string
  className?: string
  size?: number | string
  color?: string
  secondaryColor?: string
  style?: React.CSSProperties
  variant?: 'solid' | 'regular' | 'light' | 'duotone' | 'brands'
  spin?: boolean
  pulse?: boolean
}

const sizeMap: Record<string, 'xs' | 'sm' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | '8xl' | '9xl'> = {
  12: 'xs',
  14: 'xs',
  16: 'sm',
  18: 'sm',
  20: 'lg',
  24: 'xl',
  28: '2xl',
  32: '3xl',
  36: '4xl',
  40: '5xl',
  48: '6xl',
  64: '7xl',
  80: '8xl',
}

const getSizeToken = (size: number | string): 'xs' | 'sm' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | '8xl' | '9xl' | undefined => {
  if (typeof size === 'number') {
    return sizeMap[size] ?? 'xl'
  }
  return size as 'xs' | 'sm' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | '8xl' | '9xl'
}

const getIconPrefix = (variant: string): string => {
  switch (variant) {
    case 'regular': return 'far'
    case 'light': return 'fal'
    case 'duotone': return 'fad'
    case 'brands': return 'fab'
    default: return 'fas'
  }
}

export const FontAwesomeSVG: React.FC<FontAwesomeSVGProps> = ({
  icon,
  className = '',
  size = 24,
  color = 'currentColor',
  style = {},
  variant = 'solid',
  spin = false,
  pulse = false,
}) => {
  const iconPrefix = getIconPrefix(variant)
  const iconValue: IconProp = [iconPrefix, icon]

  return (
    <FontAwesomeIcon
      icon={iconValue}
      className={className}
      size={getSizeToken(size)}
      spin={spin}
      pulse={pulse}
      style={{ color, ...style }}
    />
  )
}

type IconComponentProps = Omit<FontAwesomeSVGProps, 'icon'>

const createIcon = (iconName: string): React.FC<IconComponentProps> => {
  return ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }) => (
    <FontAwesomeSVG icon={iconName} className={className} size={size} color={color} variant={variant} {...props} />
  )
}

export const FontAwesomeSVGIcons = {
  Dice: createIcon('dice'),
  DiceD6: createIcon('dice-d6'),
  DiceD20: createIcon('dice-d20'),
  Heart: createIcon('heart'),
  Diamond: createIcon('diamond'),
  Crown: createIcon('crown'),
  Trophy: createIcon('trophy'),
  Medal: createIcon('medal'),
  Gem: createIcon('gem'),
  Coins: createIcon('coins'),
  Coin: createIcon('coin'),
  RubleSign: createIcon('ruble-sign'),
  DollarSign: createIcon('dollar-sign'),
  EuroSign: createIcon('euro-sign'),
  Skull: createIcon('skull'),
  Axe: createIcon('axe'),
  Sword: createIcon('sword'),
  Shield: createIcon('shield'),
  Bolt: createIcon('bolt'),
  Times: createIcon('times'),
  Circle: createIcon('circle'),
  Square: createIcon('square'),
  ShieldAlt: createIcon('shield-alt'),
  Home: createIcon('home'),
  User: createIcon('user'),
  Mobile: createIcon('mobile'),
  MobileAlt: createIcon('mobile-alt'),
  Desktop: createIcon('desktop'),
  Tablet: createIcon('tablet'),
  Wifi: createIcon('wifi'),
  Play: createIcon('play'),
  Check: createIcon('check'),
  Star: createIcon('star'),
  Key: createIcon('key'),
  Bars: createIcon('bars'),
  History: createIcon('history'),
  Gamepad: createIcon('gamepad'),
  Clock: createIcon('clock'),
  AlarmClock: createIcon('alarm-clock'),
  Wallet: createIcon('wallet'),
  MoneyBill: createIcon('money-bill'),
  ChartLine: createIcon('chart-line'),
  ChartBar: createIcon('chart-bar'),
  Gift: createIcon('gift'),
  Search: createIcon('search'),
  DoorOpen: createIcon('door-open'),
  EyeSlash: createIcon('eye-slash'),
  Target: createIcon('bullseye'),
  VolumeUp: createIcon('volume-up'),
  VolumeMute: createIcon('volume-mute'),
  Envelope: createIcon('envelope'),
  Package: createIcon('box-open'),
  Box: createIcon('box'),
  AlertCircle: createIcon('exclamation-circle'),
  TrendingUp: createIcon('arrow-up'),
  Cog: createIcon('cog'),
  ChevronLeft: createIcon('chevron-left'),
  ChevronRight: createIcon('chevron-right'),
}
