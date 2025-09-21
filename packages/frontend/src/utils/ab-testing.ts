/**
 * A/B Testing framework for game features
 */

interface ABTest {
  id: string;
  name: string;
  description: string;
  variants: ABVariant[];
  trafficAllocation: number; // Percentage of users to include in test
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  targetMetrics: string[];
}

interface ABVariant {
  id: string;
  name: string;
  weight: number; // Percentage allocation within test
  config: Record<string, any>;
}

interface ABTestResult {
  testId: string;
  variantId: string;
  userId?: string;
  sessionId: string;
  timestamp: number;
  metrics: Record<string, number>;
}

interface ABTestAssignment {
  testId: string;
  variantId: string;
  assignedAt: number;
}

class ABTestingFramework {
  private tests = new Map<string, ABTest>();
  private assignments = new Map<string, ABTestAssignment>();
  private results: ABTestResult[] = [];
  private userId?: string;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateId();
    this.loadAssignments();
    this.initializeDefaultTests();
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load assignments from localStorage
   */
  private loadAssignments(): void {
    try {
      const stored = localStorage.getItem('ab_test_assignments');
      if (stored) {
        const assignments = JSON.parse(stored);
        Object.entries(assignments).forEach(([testId, assignment]) => {
          this.assignments.set(testId, assignment as ABTestAssignment);
        });
      }
    } catch (error) {
      console.warn('Failed to load A/B test assignments:', error);
    }
  }

  /**
   * Save assignments to localStorage
   */
  private saveAssignments(): void {
    try {
      const assignments = Object.fromEntries(this.assignments);
      localStorage.setItem('ab_test_assignments', JSON.stringify(assignments));
    } catch (error) {
      console.warn('Failed to save A/B test assignments:', error);
    }
  }

  /**
   * Initialize default tests
   */
  private initializeDefaultTests(): void {
    // Game UI Tests
    this.addTest({
      id: 'game_ui_style',
      name: 'Game UI Style Test',
      description: 'Test different UI styles for game interfaces',
      variants: [
        {
          id: 'classic',
          name: 'Classic Style',
          weight: 50,
          config: {
            buttonStyle: 'classic',
            cardStyle: 'traditional',
            animations: 'standard',
          },
        },
        {
          id: 'modern',
          name: 'Modern Style',
          weight: 50,
          config: {
            buttonStyle: 'modern',
            cardStyle: 'sleek',
            animations: 'enhanced',
          },
        },
      ],
      trafficAllocation: 100,
      isActive: true,
      startDate: new Date(),
      targetMetrics: ['game_engagement', 'session_duration', 'user_satisfaction'],
    });

    // Betting Interface Test
    this.addTest({
      id: 'betting_interface',
      name: 'Betting Interface Test',
      description: 'Test different betting interface layouts',
      variants: [
        {
          id: 'sidebar',
          name: 'Sidebar Layout',
          weight: 50,
          config: {
            layout: 'sidebar',
            quickBets: true,
            betHistory: 'collapsed',
          },
        },
        {
          id: 'bottom_panel',
          name: 'Bottom Panel Layout',
          weight: 50,
          config: {
            layout: 'bottom',
            quickBets: false,
            betHistory: 'expanded',
          },
        },
      ],
      trafficAllocation: 50,
      isActive: true,
      startDate: new Date(),
      targetMetrics: ['bet_frequency', 'bet_amount', 'user_retention'],
    });


  }

  /**
   * Set user ID
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Add a new test
   */
  addTest(test: ABTest): void {
    this.tests.set(test.id, test);
  }

  /**
   * Get test configuration
   */
  getTest(testId: string): ABTest | undefined {
    return this.tests.get(testId);
  }

  /**
   * Check if user should be included in test
   */
  private shouldIncludeInTest(test: ABTest): boolean {
    if (!test.isActive) return false;
    
    const now = new Date();
    if (now < test.startDate) return false;
    if (test.endDate && now > test.endDate) return false;

    // Use deterministic hash to ensure consistent assignment
    const hash = this.hashString(this.userId || this.sessionId + test.id);
    return (hash % 100) < test.trafficAllocation;
  }

  /**
   * Simple hash function for consistent assignment
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Assign user to test variant
   */
  private assignVariant(test: ABTest): ABVariant {
    // Check for existing assignment
    const existing = this.assignments.get(test.id);
    if (existing) {
      const variant = test.variants.find(v => v.id === existing.variantId);
      if (variant) return variant;
    }

    // Assign new variant based on weights
    const hash = this.hashString(this.userId || this.sessionId + test.id);
    const random = hash % 100;
    
    let cumulative = 0;
    for (const variant of test.variants) {
      cumulative += variant.weight;
      if (random < cumulative) {
        // Save assignment
        const assignment: ABTestAssignment = {
          testId: test.id,
          variantId: variant.id,
          assignedAt: Date.now(),
        };
        this.assignments.set(test.id, assignment);
        this.saveAssignments();
        
        return variant;
      }
    }

    // Fallback to first variant
    return test.variants[0];
  }

  /**
   * Get variant for a test
   */
  getVariant(testId: string): ABVariant | null {
    const test = this.tests.get(testId);
    if (!test || !this.shouldIncludeInTest(test)) {
      return null;
    }

    return this.assignVariant(test);
  }

  /**
   * Get configuration value from active variant
   */
  getConfig<T>(testId: string, configKey: string, defaultValue: T): T {
    const variant = this.getVariant(testId);
    if (!variant || !(configKey in variant.config)) {
      return defaultValue;
    }
    return variant.config[configKey] as T;
  }

  /**
   * Check if feature is enabled in current variant
   */
  isFeatureEnabled(testId: string, featureName: string): boolean {
    return this.getConfig(testId, featureName, false);
  }

  /**
   * Track test result/metric
   */
  trackResult(testId: string, metrics: Record<string, number>): void {
    const assignment = this.assignments.get(testId);
    if (!assignment) return;

    const result: ABTestResult = {
      testId,
      variantId: assignment.variantId,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      metrics,
    };

    this.results.push(result);

    // Send to analytics
    this.sendResult(result);

    // Keep only last 1000 results
    if (this.results.length > 1000) {
      this.results = this.results.slice(-1000);
    }
  }

  /**
   * Send result to server
   */
  private async sendResult(result: ABTestResult): Promise<void> {
    try {
      await fetch('/api/ab-testing/results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(result),
      });
    } catch (error) {
      console.warn('Failed to send A/B test result:', error);
    }
  }

  /**
   * Get all active assignments
   */
  getActiveAssignments(): Record<string, string> {
    const active: Record<string, string> = {};
    
    for (const [testId, assignment] of this.assignments) {
      const test = this.tests.get(testId);
      if (test && this.shouldIncludeInTest(test)) {
        active[testId] = assignment.variantId;
      }
    }
    
    return active;
  }

  /**
   * Force assignment to specific variant (for testing)
   */
  forceVariant(testId: string, variantId: string): void {
    const test = this.tests.get(testId);
    if (!test) return;

    const variant = test.variants.find(v => v.id === variantId);
    if (!variant) return;

    const assignment: ABTestAssignment = {
      testId,
      variantId,
      assignedAt: Date.now(),
    };

    this.assignments.set(testId, assignment);
    this.saveAssignments();
  }

  /**
   * Clear all assignments (for testing)
   */
  clearAssignments(): void {
    this.assignments.clear();
    localStorage.removeItem('ab_test_assignments');
  }

  /**
   * Export test data
   */
  exportData(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId,
      tests: Array.from(this.tests.entries()),
      assignments: Array.from(this.assignments.entries()),
      results: this.results,
    });
  }
}

// Singleton instance
export const abTesting = new ABTestingFramework();

// Convenience functions
export const getVariant = (testId: string) => abTesting.getVariant(testId);
export const getConfig = <T>(testId: string, configKey: string, defaultValue: T) => 
  abTesting.getConfig(testId, configKey, defaultValue);
export const isFeatureEnabled = (testId: string, featureName: string) => 
  abTesting.isFeatureEnabled(testId, featureName);
export const trackResult = (testId: string, metrics: Record<string, number>) => 
  abTesting.trackResult(testId, metrics);

/**
 * React hook for A/B testing
 */
export function useABTest(testId: string) {
  const variant = abTesting.getVariant(testId);
  
  const getConfig = <T>(configKey: string, defaultValue: T): T => {
    return abTesting.getConfig(testId, configKey, defaultValue);
  };

  const isEnabled = (featureName: string): boolean => {
    return abTesting.isFeatureEnabled(testId, featureName);
  };

  const track = (metrics: Record<string, number>) => {
    abTesting.trackResult(testId, metrics);
  };

  return {
    variant,
    variantId: variant?.id,
    config: variant?.config,
    getConfig,
    isEnabled,
    track,
  };
}