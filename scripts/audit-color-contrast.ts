/**
 * Color Contrast Audit Script
 * 
 * Audits all color combinations in the application to verify WCAG AA compliance.
 * This script validates Requirement 37 (Accessibility - Color Contrast).
 * 
 * WCAG AA Requirements:
 * - Normal text: 4.5:1 minimum contrast ratio
 * - Large text: 3:1 minimum contrast ratio
 * - UI components: 3:1 minimum contrast ratio
 * 
 * Requirements: 37
 */

import { getContrastRatio, formatContrastRatio, getWCAGLevel } from '../lib/utils/colorContrast';

interface ColorPair {
  name: string;
  foreground: string;
  background: string;
  textSize: 'normal' | 'large' | 'ui';
  theme: 'light' | 'dark';
}

/**
 * Color pairs to audit from globals.css
 */
const colorPairs: ColorPair[] = [
  // Light Theme - Text on backgrounds
  {
    name: 'Primary text on white background',
    foreground: '#1a1a1a',
    background: '#ffffff',
    textSize: 'normal',
    theme: 'light',
  },
  {
    name: 'Secondary text on white background',
    foreground: '#4a4a4a',
    background: '#ffffff',
    textSize: 'normal',
    theme: 'light',
  },
  {
    name: 'Tertiary text on white background',
    foreground: '#6b6b6b',
    background: '#ffffff',
    textSize: 'normal',
    theme: 'light',
  },
  {
    name: 'Disabled text on white background',
    foreground: '#757575',
    background: '#ffffff',
    textSize: 'ui',
    theme: 'light',
  },
  {
    name: 'Primary text on secondary background',
    foreground: '#1a1a1a',
    background: '#f5f5f5',
    textSize: 'normal',
    theme: 'light',
  },

  // Light Theme - Interactive elements
  {
    name: 'Primary button text on button background',
    foreground: '#ffffff',
    background: '#2563eb',
    textSize: 'normal',
    theme: 'light',
  },
  {
    name: 'Primary link on white background',
    foreground: '#2563eb',
    background: '#ffffff',
    textSize: 'normal',
    theme: 'light',
  },
  {
    name: 'Primary link hover on white background',
    foreground: '#1d4ed8',
    background: '#ffffff',
    textSize: 'normal',
    theme: 'light',
  },
  {
    name: 'Secondary button text on button background',
    foreground: '#1a1a1a',
    background: '#f5f5f5',
    textSize: 'normal',
    theme: 'light',
  },

  // Light Theme - Status colors
  {
    name: 'Success text on white background',
    foreground: '#0f7a38',
    background: '#ffffff',
    textSize: 'normal',
    theme: 'light',
  },
  {
    name: 'Warning text on white background',
    foreground: '#946200',
    background: '#ffffff',
    textSize: 'normal',
    theme: 'light',
  },
  {
    name: 'Error text on white background',
    foreground: '#dc2626',
    background: '#ffffff',
    textSize: 'normal',
    theme: 'light',
  },
  {
    name: 'Info text on white background',
    foreground: '#2563eb',
    background: '#ffffff',
    textSize: 'normal',
    theme: 'light',
  },

  // Light Theme - Messages
  {
    name: 'User message text on user message background',
    foreground: '#1e3a8a',
    background: '#eff6ff',
    textSize: 'normal',
    theme: 'light',
  },
  {
    name: 'Agent message text on agent message background',
    foreground: '#1a1a1a',
    background: '#f5f5f5',
    textSize: 'normal',
    theme: 'light',
  },

  // Light Theme - UI components
  {
    name: 'Border on white background',
    foreground: '#767676',
    background: '#ffffff',
    textSize: 'ui',
    theme: 'light',
  },
  {
    name: 'Focus indicator on white background',
    foreground: '#2563eb',
    background: '#ffffff',
    textSize: 'ui',
    theme: 'light',
  },

  // Dark Theme - Text on backgrounds
  {
    name: 'Primary text on dark background',
    foreground: '#f5f5f5',
    background: '#0a0a0a',
    textSize: 'normal',
    theme: 'dark',
  },
  {
    name: 'Secondary text on dark background',
    foreground: '#d4d4d4',
    background: '#0a0a0a',
    textSize: 'normal',
    theme: 'dark',
  },
  {
    name: 'Tertiary text on dark background',
    foreground: '#a3a3a3',
    background: '#0a0a0a',
    textSize: 'normal',
    theme: 'dark',
  },
  {
    name: 'Disabled text on dark background',
    foreground: '#6b6b6b',
    background: '#0a0a0a',
    textSize: 'ui',
    theme: 'dark',
  },
  {
    name: 'Primary text on secondary dark background',
    foreground: '#f5f5f5',
    background: '#1a1a1a',
    textSize: 'normal',
    theme: 'dark',
  },

  // Dark Theme - Interactive elements
  {
    name: 'Primary button text on button background (dark)',
    foreground: '#ffffff',
    background: '#2563eb',
    textSize: 'normal',
    theme: 'dark',
  },
  {
    name: 'Primary link on dark background',
    foreground: '#60a5fa',
    background: '#0a0a0a',
    textSize: 'normal',
    theme: 'dark',
  },
  {
    name: 'Primary link hover on dark background',
    foreground: '#3b82f6',
    background: '#0a0a0a',
    textSize: 'normal',
    theme: 'dark',
  },
  {
    name: 'Secondary button text on button background (dark)',
    foreground: '#f5f5f5',
    background: '#1a1a1a',
    textSize: 'normal',
    theme: 'dark',
  },

  // Dark Theme - Status colors
  {
    name: 'Success text on dark background',
    foreground: '#4ade80',
    background: '#0a0a0a',
    textSize: 'normal',
    theme: 'dark',
  },
  {
    name: 'Warning text on dark background',
    foreground: '#fbbf24',
    background: '#0a0a0a',
    textSize: 'normal',
    theme: 'dark',
  },
  {
    name: 'Error text on dark background',
    foreground: '#f87171',
    background: '#0a0a0a',
    textSize: 'normal',
    theme: 'dark',
  },
  {
    name: 'Info text on dark background',
    foreground: '#60a5fa',
    background: '#0a0a0a',
    textSize: 'normal',
    theme: 'dark',
  },

  // Dark Theme - Messages
  {
    name: 'User message text on user message background (dark)',
    foreground: '#bfdbfe',
    background: '#1e3a8a',
    textSize: 'normal',
    theme: 'dark',
  },
  {
    name: 'Agent message text on agent message background (dark)',
    foreground: '#f5f5f5',
    background: '#1a1a1a',
    textSize: 'normal',
    theme: 'dark',
  },

  // Dark Theme - UI components
  {
    name: 'Border on dark background',
    foreground: '#626262',
    background: '#0a0a0a',
    textSize: 'ui',
    theme: 'dark',
  },
  {
    name: 'Focus indicator on dark background',
    foreground: '#60a5fa',
    background: '#0a0a0a',
    textSize: 'ui',
    theme: 'dark',
  },
];

/**
 * Run the color contrast audit
 */
function runAudit(): void {
  console.log('='.repeat(80));
  console.log('COLOR CONTRAST AUDIT - WCAG AA Compliance');
  console.log('='.repeat(80));
  console.log();

  let totalPairs = 0;
  let passingPairs = 0;
  let failingPairs = 0;

  const failedPairs: Array<ColorPair & { ratio: number; level: string }> = [];

  // Group by theme
  const lightThemePairs = colorPairs.filter((p) => p.theme === 'light');
  const darkThemePairs = colorPairs.filter((p) => p.theme === 'dark');

  // Audit light theme
  console.log('LIGHT THEME');
  console.log('-'.repeat(80));
  auditTheme(lightThemePairs);

  console.log();
  console.log('DARK THEME');
  console.log('-'.repeat(80));
  auditTheme(darkThemePairs);

  function auditTheme(pairs: ColorPair[]): void {
    pairs.forEach((pair) => {
      totalPairs++;
      const ratio = getContrastRatio(pair.foreground, pair.background);
      const level = getWCAGLevel(ratio, pair.textSize);
      const passed = level !== 'Fail';

      if (passed) {
        passingPairs++;
      } else {
        failingPairs++;
        failedPairs.push({ ...pair, ratio, level });
      }

      const status = passed ? '✓ PASS' : '✗ FAIL';
      const statusColor = passed ? '\x1b[32m' : '\x1b[31m';
      const resetColor = '\x1b[0m';

      console.log(`${statusColor}${status}${resetColor} ${pair.name}`);
      console.log(`      Ratio: ${formatContrastRatio(ratio)} | Level: ${level} | Size: ${pair.textSize}`);
      console.log(`      FG: ${pair.foreground} | BG: ${pair.background}`);
      console.log();
    });
  }

  // Summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total color pairs audited: ${totalPairs}`);
  console.log(`Passing (WCAG AA): ${passingPairs} (${((passingPairs / totalPairs) * 100).toFixed(1)}%)`);
  console.log(`Failing: ${failingPairs} (${((failingPairs / totalPairs) * 100).toFixed(1)}%)`);
  console.log();

  if (failedPairs.length > 0) {
    console.log('\x1b[31mFAILED COLOR PAIRS:\x1b[0m');
    console.log('-'.repeat(80));
    failedPairs.forEach((pair) => {
      console.log(`✗ ${pair.name}`);
      console.log(`  Ratio: ${formatContrastRatio(pair.ratio)} (needs ${pair.textSize === 'normal' ? '4.5:1' : '3:1'})`);
      console.log(`  FG: ${pair.foreground} | BG: ${pair.background}`);
      console.log();
    });
  } else {
    console.log('\x1b[32m✓ All color pairs meet WCAG AA requirements!\x1b[0m');
  }

  console.log('='.repeat(80));

  // Exit with error code if any pairs failed
  if (failingPairs > 0) {
    process.exit(1);
  }
}

// Run the audit
runAudit();
