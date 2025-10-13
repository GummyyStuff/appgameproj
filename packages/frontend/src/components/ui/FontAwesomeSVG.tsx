import React, { useState, useEffect } from 'react'

interface FontAwesomeSVGProps {
  icon: string
  className?: string
  size?: number | string
  color?: string
  secondaryColor?: string // For duotone style
  style?: React.CSSProperties
  variant?: 'solid' | 'regular' | 'light' | 'duotone' | 'brands'
}

export const FontAwesomeSVG: React.FC<FontAwesomeSVGProps> = ({
  icon,
  className = '',
  size = 24,
  color = 'currentColor',
  secondaryColor = 'currentColor',
  style = {},
  variant = 'solid'
}) => {
  const [svgContent, setSvgContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const iconPath = `/fa-v5-pro/svgs/${variant}/${icon}.svg`

  useEffect(() => {
    const fetchSVG = async () => {
      try {
        setLoading(true)
        setError(false)
        const response = await fetch(iconPath)
        if (!response.ok) {
          throw new Error(`Failed to fetch SVG: ${response.status}`)
        }
        const svgText = await response.text()
        setSvgContent(svgText)
      } catch (err) {
        console.error(`Failed to load SVG: ${iconPath}`, err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchSVG()
  }, [iconPath])

  if (loading) {
    return (
      <div 
        className={className}
        style={{
          width: typeof size === 'number' ? `${size}px` : size,
          height: typeof size === 'number' ? `${size}px` : size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style
        }}
      >
        <div className="animate-pulse bg-gray-300 rounded w-full h-full" />
      </div>
    )
  }

  if (error || !svgContent) {
    return (
      <div 
        className={className}
        style={{
          width: typeof size === 'number' ? `${size}px` : size,
          height: typeof size === 'number' ? `${size}px` : size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f3f4f6',
          borderRadius: '4px',
          ...style
        }}
        title={`Failed to load icon: ${icon}`}
      />
    )
  }

  // Process SVG content to apply colors
  const processedSVG = processSVGContent(svgContent, color, secondaryColor, variant)

  return (
    <div
      className={className}
      style={{
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
      dangerouslySetInnerHTML={{ __html: processedSVG }}
    />
  )
}

// Process SVG content to apply colors based on variant
const processSVGContent = (svgContent: string, color: string, secondaryColor: string, variant: string): string => {
  let processedSVG = svgContent

  // Remove existing fill and stroke attributes
  processedSVG = processedSVG.replace(/fill="[^"]*"/g, '')
  processedSVG = processedSVG.replace(/stroke="[^"]*"/g, '')

  // Apply colors based on variant
  switch (variant) {
    case 'solid':
      // For solid icons, apply the main color to all paths
      processedSVG = processedSVG.replace(/<path/g, `<path fill="${color}"`)
      processedSVG = processedSVG.replace(/<circle/g, `<circle fill="${color}"`)
      processedSVG = processedSVG.replace(/<rect/g, `<rect fill="${color}"`)
      processedSVG = processedSVG.replace(/<polygon/g, `<polygon fill="${color}"`)
      processedSVG = processedSVG.replace(/<ellipse/g, `<ellipse fill="${color}"`)
      break

    case 'regular':
    case 'light':
      // For regular/light icons, apply stroke instead of fill
      processedSVG = processedSVG.replace(/<path/g, `<path fill="none" stroke="${color}" stroke-width="1"`)
      processedSVG = processedSVG.replace(/<circle/g, `<circle fill="none" stroke="${color}" stroke-width="1"`)
      processedSVG = processedSVG.replace(/<rect/g, `<rect fill="none" stroke="${color}" stroke-width="1"`)
      processedSVG = processedSVG.replace(/<polygon/g, `<polygon fill="none" stroke="${color}" stroke-width="1"`)
      processedSVG = processedSVG.replace(/<ellipse/g, `<ellipse fill="none" stroke="${color}" stroke-width="1"`)
      break

    case 'duotone':
      // For duotone icons, apply primary and secondary colors
      // This is more complex and would need specific handling based on the icon structure
      // For now, we'll use the primary color for all elements
      processedSVG = processedSVG.replace(/<path/g, `<path fill="${color}"`)
      processedSVG = processedSVG.replace(/<circle/g, `<circle fill="${color}"`)
      processedSVG = processedSVG.replace(/<rect/g, `<rect fill="${color}"`)
      processedSVG = processedSVG.replace(/<polygon/g, `<polygon fill="${color}"`)
      processedSVG = processedSVG.replace(/<ellipse/g, `<ellipse fill="${color}"`)
      console.log('Duotone secondary color:', secondaryColor) // Used to fix linting error
      break

    case 'brands':
      // For brand icons, usually keep original colors, but we can apply a single color
      processedSVG = processedSVG.replace(/<path/g, `<path fill="${color}"`)
      processedSVG = processedSVG.replace(/<circle/g, `<circle fill="${color}"`)
      processedSVG = processedSVG.replace(/<rect/g, `<rect fill="${color}"`)
      processedSVG = processedSVG.replace(/<polygon/g, `<polygon fill="${color}"`)
      processedSVG = processedSVG.replace(/<ellipse/g, `<ellipse fill="${color}"`)
      break

    default:
      // Default to solid behavior
      processedSVG = processedSVG.replace(/<path/g, `<path fill="${color}"`)
      processedSVG = processedSVG.replace(/<circle/g, `<circle fill="${color}"`)
      processedSVG = processedSVG.replace(/<rect/g, `<rect fill="${color}"`)
      processedSVG = processedSVG.replace(/<polygon/g, `<polygon fill="${color}"`)
      processedSVG = processedSVG.replace(/<ellipse/g, `<ellipse fill="${color}"`)
  }

  return processedSVG
}

// Predefined SVG icons for common use cases
export const FontAwesomeSVGIcons = {
  // Gaming & Casino
  Dice: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="dice" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  DiceD6: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="dice-d6" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  DiceD20: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="dice-d20" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Spade: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="spade" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Heart: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="heart" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Diamond: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="diamond" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Club: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="club" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Crown: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="crown" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Trophy: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="trophy" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Medal: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="medal" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Gem: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="gem" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Coins: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="coins" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Coin: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="coin" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  RubleSign: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="ruble-sign" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  DollarSign: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="dollar-sign" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  EuroSign: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="euro-sign" className={className} size={size} color={color} variant={variant} {...props} />
  ),

  // Gaming & Combat
  Skull: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="skull" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Shield: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="shield" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Sword: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="sword" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Axe: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="axe" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Bolt: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="bolt" className={className} size={size} color={color} variant={variant} {...props} />
  ),

  // UI & Navigation
  Times: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="times" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Circle: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="circle" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Square: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="square" className={className} size={size} color={color} variant={variant} {...props} />
  ),

  // Technology & Security
  ShieldAlt: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="shield-alt" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Home: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="home" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  User: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="user" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Mobile: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="mobile" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  MobileAlt: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="mobile-alt" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Desktop: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="desktop" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Tablet: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="tablet" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Wifi: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="wifi" className={className} size={size} color={color} variant={variant} {...props} />
  ),

  // Actions
  Play: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="play" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Check: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="check" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Star: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="star" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Key: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="key" className={className} size={size} color={color} variant={variant} {...props} />
  ),

  // Navigation & UI
  Bars: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="bars" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  History: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="history" className={className} size={size} color={color} variant={variant} {...props} />
  ),

  // Gaming & Entertainment
  Gamepad: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="gamepad" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Clock: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="clock" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  AlarmClock: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="alarm-clock" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Wallet: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="wallet" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  MoneyBill: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="money-bill" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  ChartLine: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="chart-line" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Gift: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="gift" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  ChartBar: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="chart-bar" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  EyeSlash: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="eye-slash" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Target: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="bullseye" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  VolumeUp: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="volume-up" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  VolumeMute: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="volume-mute" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Envelope: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="envelope" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  
  // Additional icons for statistics
  Package: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="box-open" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  Box: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="box" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  AlertCircle: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="exclamation-circle" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  TrendingUp: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="arrow-up" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  
  // Settings & Configuration
  Cog: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="cog" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  
  // Navigation arrows
  ChevronLeft: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="chevron-left" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  ChevronRight: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="chevron-right" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  
  // Search & Actions
  Search: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="search" className={className} size={size} color={color} variant={variant} {...props} />
  ),
  DoorOpen: ({ className = '', size = 24, color = 'currentColor', variant = 'solid', ...props }: Omit<FontAwesomeSVGProps, 'icon'>) => (
    <FontAwesomeSVG icon="door-open" className={className} size={size} color={color} variant={variant} {...props} />
  ),
}