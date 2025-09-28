/**
 * Case Opening Game Animation Variants
 * Centralized animation variants for consistent motion design across all case opening components
 */

export const animationVariants = {
  // Page-level animations
  page: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.6, ease: "easeOut" }
  },

  // Card animations
  card: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.4, type: "spring", stiffness: 200 }
  },

  // Component stagger animations
  stagger: {
    container: {
      animate: {
        transition: {
          staggerChildren: 0.1
        }
      }
    },
    item: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.4, ease: "easeOut" }
    }
  },

  // Button animations
  button: {
    hover: { scale: 1.05, transition: { duration: 0.2 } },
    tap: { scale: 0.95, transition: { duration: 0.1 } },
    disabled: { scale: 1, opacity: 0.6 }
  },

  // Loading animations
  loading: {
    pulse: {
      animate: { opacity: [0.5, 1, 0.5] },
      transition: { duration: 1.5, repeat: Infinity }
    },
    spin: {
      animate: { rotate: 360 },
      transition: { duration: 1, repeat: Infinity, ease: "linear" }
    },
    shimmer: {
      animate: { x: [-200, 200] },
      transition: { duration: 2, repeat: Infinity, ease: "linear" }
    },
    dots: {
      animate: {
        scale: [1, 1.5, 1],
        opacity: [0.5, 1, 0.5]
      },
      transition: {
        duration: 1,
        repeat: Infinity
      }
    }
  },

  // Result animations
  result: {
    congratulations: {
      animate: { scale: [1, 1.05, 1] },
      transition: { duration: 2, repeat: Infinity }
    },
    prize: {
      initial: { scale: 0.8, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      transition: { delay: 0.2, type: "spring", stiffness: 200 }
    }
  },

  // Case selection animations
  caseCard: {
    initial: { opacity: 0, y: 20, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { type: "spring", stiffness: 200 },
    hover: {
      scale: 1.03,
      y: -5,
      transition: { type: "spring", stiffness: 400, damping: 25 }
    },
    tap: { scale: 0.97 }
  },

  // Error animations
  error: {
    shake: {
      animate: { x: [0, -10, 10, -10, 10, 0] },
      transition: { duration: 0.5 }
    },
    pulse: {
      animate: { opacity: [0.7, 1, 0.7] },
      transition: { duration: 2, repeat: Infinity }
    }
  },

  // Glow effects
  glow: {
    subtle: {
      animate: {
        boxShadow: [
          "0 0 0 rgba(246, 173, 85, 0)",
          "0 0 20px rgba(246, 173, 85, 0.3)",
          "0 0 0 rgba(246, 173, 85, 0)"
        ]
      },
      transition: { duration: 2, repeat: Infinity }
    },
    strong: {
      animate: {
        boxShadow: [
          "0 0 0 rgba(246, 173, 85, 0)",
          "0 0 30px rgba(246, 173, 85, 0.6)",
          "0 0 0 rgba(246, 173, 85, 0)"
        ]
      },
      transition: { duration: 1.5, repeat: Infinity }
    }
  },

  // Text animations
  text: {
    fadeInUp: {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.4, ease: "easeOut" }
    },
    highlight: {
      animate: {
        textShadow: [
          "0 0 0px #F6AD55",
          "0 0 10px #F6AD55",
          "0 0 0px #F6AD55"
        ]
      },
      transition: { duration: 2, repeat: Infinity }
    }
  }
}

// Animation timing presets
export const animationTiming = {
  fast: 0.2,
  normal: 0.4,
  slow: 0.8,
  slower: 1.2,
  slowest: 2.0
}

// Easing curves
export const easingCurves = {
  smooth: "easeOut",
  bounce: [0.68, -0.55, 0.265, 1.55],
  elastic: [0.175, 0.885, 0.32, 1.275],
  spring: { type: "spring", stiffness: 200, damping: 20 }
}

// Utility function to create staggered animations
export const createStaggeredAnimation = (items: number, delay: number = 0.1) => ({
  container: {
    animate: {
      transition: {
        staggerChildren: delay
      }
    }
  },
  item: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: "easeOut" }
  }
})

// Utility function for responsive animation delays
export const responsiveDelay = (index: number, baseDelay: number = 0.1) => {
  return index * baseDelay
}
