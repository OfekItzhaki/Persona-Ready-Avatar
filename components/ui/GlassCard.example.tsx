/**
 * GlassCard Component Examples
 * 
 * Demonstrates various configurations and use cases for the GlassCard component.
 */

import { GlassCard } from './GlassCard';

export function GlassCardExamples() {
  return (
    <div className="space-y-8 p-8 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">GlassCard Examples</h1>

      {/* Default GlassCard */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Default Configuration</h2>
        <GlassCard>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Default Glass Card</h3>
          <p className="text-gray-700">
            This card uses the default configuration: medium blur (12px), 0.8 opacity,
            border enabled, large shadow, and medium padding.
          </p>
        </GlassCard>
      </section>

      {/* Different Blur Levels */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Blur Levels</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard blur="sm">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Small Blur (4px)</h3>
            <p className="text-gray-700">Subtle glass effect with minimal blur.</p>
          </GlassCard>
          
          <GlassCard blur="md">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Medium Blur (12px)</h3>
            <p className="text-gray-700">Balanced glass effect (default).</p>
          </GlassCard>
          
          <GlassCard blur="lg">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Large Blur (24px)</h3>
            <p className="text-gray-700">Strong glass effect with heavy blur.</p>
          </GlassCard>
        </div>
      </section>

      {/* Different Opacity Levels */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Opacity Levels</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard opacity={0.5}>
            <h3 className="text-lg font-medium text-gray-900 mb-2">50% Opacity</h3>
            <p className="text-gray-700">More transparent, shows more background.</p>
          </GlassCard>
          
          <GlassCard opacity={0.8}>
            <h3 className="text-lg font-medium text-gray-900 mb-2">80% Opacity</h3>
            <p className="text-gray-700">Balanced transparency (default).</p>
          </GlassCard>
          
          <GlassCard opacity={0.95}>
            <h3 className="text-lg font-medium text-gray-900 mb-2">95% Opacity</h3>
            <p className="text-gray-700">Nearly opaque, minimal transparency.</p>
          </GlassCard>
        </div>
      </section>

      {/* Shadow Depths */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Shadow Depths</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <GlassCard shadow="sm">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Small Shadow</h3>
            <p className="text-gray-700">Subtle depth.</p>
          </GlassCard>
          
          <GlassCard shadow="md">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Medium Shadow</h3>
            <p className="text-gray-700">Moderate depth.</p>
          </GlassCard>
          
          <GlassCard shadow="lg">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Large Shadow</h3>
            <p className="text-gray-700">Strong depth (default).</p>
          </GlassCard>
          
          <GlassCard shadow="xl">
            <h3 className="text-lg font-medium text-gray-900 mb-2">XL Shadow</h3>
            <p className="text-gray-700">Maximum depth.</p>
          </GlassCard>
        </div>
      </section>

      {/* Padding Sizes */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Padding Sizes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard padding="sm">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Small Padding</h3>
            <p className="text-gray-700">Compact spacing.</p>
          </GlassCard>
          
          <GlassCard padding="md">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Medium Padding</h3>
            <p className="text-gray-700">Balanced spacing (default).</p>
          </GlassCard>
          
          <GlassCard padding="lg">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Large Padding</h3>
            <p className="text-gray-700">Generous spacing.</p>
          </GlassCard>
        </div>
      </section>

      {/* Border Options */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Border Options</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassCard border={true}>
            <h3 className="text-lg font-medium text-gray-900 mb-2">With Border</h3>
            <p className="text-gray-700">
              Subtle white border (rgba(255, 255, 255, 0.18)) adds definition.
            </p>
          </GlassCard>
          
          <GlassCard border={false}>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Without Border</h3>
            <p className="text-gray-700">
              No border for a cleaner, more minimal look.
            </p>
          </GlassCard>
        </div>
      </section>

      {/* Advanced Example: Avatar Container */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Advanced Example: Avatar Container</h2>
        <GlassCard
          blur="lg"
          opacity={0.85}
          shadow="xl"
          padding="lg"
          className="relative overflow-hidden"
        >
          {/* Gradient border effect */}
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 -z-10" />
          
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">3D Avatar Canvas</h3>
            <div className="w-full h-64 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center">
              <p className="text-gray-600 text-lg">Avatar Canvas Placeholder</p>
            </div>
            <p className="text-gray-700 mt-4">
              This demonstrates a glassmorphism container for a 3D avatar with
              large blur, high opacity, and a gradient border effect.
            </p>
          </div>
        </GlassCard>
      </section>

      {/* Custom Styling */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Custom Styling</h2>
        <GlassCard className="hover:scale-105 cursor-pointer">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Interactive Card</h3>
          <p className="text-gray-700">
            Custom className adds hover scale effect. The card smoothly transitions
            thanks to the built-in transition-all class.
          </p>
        </GlassCard>
      </section>
    </div>
  );
}

export default GlassCardExamples;
