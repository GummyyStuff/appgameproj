import React from 'react'

interface FontAwesomeIconProps {
  icon: string
  className?: string
  size?: 'xs' | 'sm' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | '8xl' | '9xl'
  style?: 'solid' | 'regular' | 'light' | 'duotone' | 'brands'
  spin?: boolean
  pulse?: boolean
  fixedWidth?: boolean
  inverse?: boolean
  flip?: 'horizontal' | 'vertical' | 'both'
  rotate?: 90 | 180 | 270
  pull?: 'left' | 'right'
  border?: boolean
  list?: boolean
}

export const FontAwesomeIcon: React.FC<FontAwesomeIconProps> = ({
  icon,
  className = '',
  size,
  style = 'solid',
  spin = false,
  pulse = false,
  fixedWidth = false,
  inverse = false,
  flip,
  rotate,
  pull,
  border = false,
  list = false,
}) => {
  const classes = [
    'fa',
    `fa-${style}`,
    `fa-${icon}`,
    size ? `fa-${size}` : '',
    spin ? 'fa-spin' : '',
    pulse ? 'fa-pulse' : '',
    fixedWidth ? 'fa-fw' : '',
    inverse ? 'fa-inverse' : '',
    flip ? `fa-flip-${flip}` : '',
    rotate ? `fa-rotate-${rotate}` : '',
    pull ? `fa-pull-${pull}` : '',
    border ? 'fa-border' : '',
    list ? 'fa-li' : '',
    className
  ].filter(Boolean).join(' ')

  return <i className={classes} />
}

// Predefined Font Awesome icons commonly used in gaming/casino contexts
export const FontAwesomeIcons = {
  // Gaming & Casino
  Dice: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="dice" className={className} {...props} />
  ),
  DiceD6: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="dice-d6" className={className} {...props} />
  ),
  DiceD20: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="dice-d20" className={className} {...props} />
  ),
  Spade: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="spade" className={className} {...props} />
  ),
  Heart: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="heart" className={className} {...props} />
  ),
  Diamond: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="diamond" className={className} {...props} />
  ),
  Club: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="club" className={className} {...props} />
  ),
  Crown: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="crown" className={className} {...props} />
  ),
  Trophy: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="trophy" className={className} {...props} />
  ),
  Medal: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="medal" className={className} {...props} />
  ),
  Gem: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="gem" className={className} {...props} />
  ),
  Coins: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="coins" className={className} {...props} />
  ),
  DollarSign: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="dollar-sign" className={className} {...props} />
  ),
  EuroSign: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="euro-sign" className={className} {...props} />
  ),
  RubleSign: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="ruble-sign" className={className} {...props} />
  ),

  // UI & Navigation
  Home: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="home" className={className} {...props} />
  ),
  User: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="user" className={className} {...props} />
  ),
  Users: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="users" className={className} {...props} />
  ),
  Cog: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="cog" className={className} {...props} />
  ),
  Settings: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="cogs" className={className} {...props} />
  ),
  Bell: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="bell" className={className} {...props} />
  ),
  Search: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="search" className={className} {...props} />
  ),
  Filter: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="filter" className={className} {...props} />
  ),
  Sort: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="sort" className={className} {...props} />
  ),
  SortUp: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="sort-up" className={className} {...props} />
  ),
  SortDown: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="sort-down" className={className} {...props} />
  ),

  // Actions
  Play: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="play" className={className} {...props} />
  ),
  Pause: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="pause" className={className} {...props} />
  ),
  Stop: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="stop" className={className} {...props} />
  ),
  Refresh: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="sync" className={className} {...props} />
  ),
  Download: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="download" className={className} {...props} />
  ),
  Upload: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="upload" className={className} {...props} />
  ),
  Save: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="save" className={className} {...props} />
  ),
  Edit: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="edit" className={className} {...props} />
  ),
  Trash: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="trash" className={className} {...props} />
  ),
  Plus: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="plus" className={className} {...props} />
  ),
  Minus: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="minus" className={className} {...props} />
  ),
  Check: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="check" className={className} {...props} />
  ),
  Times: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="times" className={className} {...props} />
  ),
  Exclamation: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="exclamation" className={className} {...props} />
  ),
  Question: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="question" className={className} {...props} />
  ),
  Info: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="info" className={className} {...props} />
  ),

  // Arrows & Navigation
  ArrowLeft: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="arrow-left" className={className} {...props} />
  ),
  ArrowRight: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="arrow-right" className={className} {...props} />
  ),
  ArrowUp: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="arrow-up" className={className} {...props} />
  ),
  ArrowDown: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="arrow-down" className={className} {...props} />
  ),
  ChevronLeft: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="chevron-left" className={className} {...props} />
  ),
  ChevronRight: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="chevron-right" className={className} {...props} />
  ),
  ChevronUp: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="chevron-up" className={className} {...props} />
  ),
  ChevronDown: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="chevron-down" className={className} {...props} />
  ),
  CaretLeft: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="caret-left" className={className} {...props} />
  ),
  CaretRight: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="caret-right" className={className} {...props} />
  ),
  CaretUp: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="caret-up" className={className} {...props} />
  ),
  CaretDown: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="caret-down" className={className} {...props} />
  ),

  // Status & Indicators
  Star: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="star" className={className} {...props} />
  ),
  StarHalf: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="star-half" className={className} {...props} />
  ),
  StarEmpty: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="star-o" className={className} {...props} />
  ),
  HeartEmpty: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="heart-o" className={className} {...props} />
  ),
  ThumbsUp: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="thumbs-up" className={className} {...props} />
  ),
  ThumbsDown: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="thumbs-down" className={className} {...props} />
  ),
  Like: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="thumbs-up" className={className} {...props} />
  ),
  Dislike: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="thumbs-down" className={className} {...props} />
  ),

  // Communication
  Comment: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="comment" className={className} {...props} />
  ),
  Comments: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="comments" className={className} {...props} />
  ),
  Share: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="share" className={className} {...props} />
  ),
  ShareAlt: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="share-alt" className={className} {...props} />
  ),
  Link: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="link" className={className} {...props} />
  ),
  Copy: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="copy" className={className} {...props} />
  ),

  // Technology & Security
  Lock: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="lock" className={className} {...props} />
  ),
  Unlock: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="unlock" className={className} {...props} />
  ),
  Shield: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="shield" className={className} {...props} />
  ),
  Key: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="key" className={className} {...props} />
  ),
  Eye: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="eye" className={className} {...props} />
  ),
  EyeSlash: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="eye-slash" className={className} {...props} />
  ),
  Wifi: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="wifi" className={className} {...props} />
  ),
  Signal: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="signal" className={className} {...props} />
  ),
  Mobile: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="mobile" className={className} {...props} />
  ),
  Desktop: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="desktop" className={className} {...props} />
  ),
  Tablet: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="tablet" className={className} {...props} />
  ),

  // Time & Calendar
  Clock: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="clock" className={className} {...props} />
  ),
  Calendar: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="calendar" className={className} {...props} />
  ),
  CalendarAlt: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="calendar-alt" className={className} {...props} />
  ),
  History: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="history" className={className} {...props} />
  ),

  // Files & Documents
  File: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="file" className={className} {...props} />
  ),
  FileAlt: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="file-alt" className={className} {...props} />
  ),
  Folder: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="folder" className={className} {...props} />
  ),
  FolderOpen: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="folder-open" className={className} {...props} />
  ),

  // Social & Brand
  Facebook: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="facebook" style="brands" className={className} {...props} />
  ),
  Twitter: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="twitter" style="brands" className={className} {...props} />
  ),
  Instagram: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="instagram" style="brands" className={className} {...props} />
  ),
  Discord: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="discord" style="brands" className={className} {...props} />
  ),
  Steam: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="steam" style="brands" className={className} {...props} />
  ),
  Twitch: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="twitch" style="brands" className={className} {...props} />
  ),
  Youtube: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="youtube" style="brands" className={className} {...props} />
  ),
  Github: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="github" style="brands" className={className} {...props} />
  ),
  Reddit: ({ className = '', ...props }: Omit<FontAwesomeIconProps, 'icon'>) => (
    <FontAwesomeIcon icon="reddit" style="brands" className={className} {...props} />
  ),
}
