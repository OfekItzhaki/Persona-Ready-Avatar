/**
 * Example Usage of Enhanced Input Component
 * 
 * Demonstrates various configurations and use cases for the Input component.
 */

import { useState } from 'react';
import { Input } from './Input';

export function InputExamples() {
  const [basicValue, setBasicValue] = useState('');
  const [autoResizeValue, setAutoResizeValue] = useState('');
  const [emailValue, setEmailValue] = useState('');
  const [emailError, setEmailError] = useState('');

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-8">Enhanced Input Component Examples</h1>

      {/* Basic Input */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Basic Input</h2>
        <Input
          placeholder="Type something..."
          value={basicValue}
          onChange={(e) => setBasicValue(e.target.value)}
        />
      </section>

      {/* Input with Label */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Input with Label</h2>
        <Input
          label="Username"
          placeholder="Enter your username"
          helperText="Choose a unique username"
        />
      </section>

      {/* Required Input */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Required Input</h2>
        <Input
          label="Full Name"
          placeholder="John Doe"
          required
          helperText="This field is required"
        />
      </section>

      {/* Input with Error */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Input with Validation</h2>
        <Input
          label="Email Address"
          placeholder="you@example.com"
          value={emailValue}
          onChange={(e) => {
            setEmailValue(e.target.value);
            validateEmail(e.target.value);
          }}
          onBlur={() => validateEmail(emailValue)}
          error={emailError}
          required
        />
      </section>

      {/* Auto-Resize Input */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Auto-Resize Input</h2>
        <Input
          label="Message"
          placeholder="Type a long message to see auto-resize in action..."
          value={autoResizeValue}
          onChange={(e) => setAutoResizeValue(e.target.value)}
          autoResize
          minRows={2}
          maxRows={8}
          helperText="This input automatically grows as you type"
        />
      </section>

      {/* Disabled Input */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Disabled Input</h2>
        <Input
          label="Disabled Field"
          placeholder="This field is disabled"
          disabled
          value="Cannot edit this"
        />
      </section>

      {/* Multi-line Input */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Multi-line Input</h2>
        <Input
          label="Description"
          placeholder="Enter a detailed description..."
          minRows={4}
          helperText="Provide as much detail as possible"
        />
      </section>

      {/* Focus Effects Demo */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Focus Effects Demo</h2>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Click on the input below to see the focus effects:
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1">
            <li>Glowing border effect (blue-purple gradient)</li>
            <li>Scale transition (1.0 to 1.01)</li>
            <li>Border color change (gray to blue)</li>
            <li>4px focus ring with 20% opacity</li>
          </ul>
          <Input
            placeholder="Click here to see focus effects"
            helperText="Notice the smooth transitions and glowing effect"
          />
        </div>
      </section>

      {/* Dark Mode Example */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Dark Mode Support</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          All inputs automatically adapt to dark mode. Toggle your system theme to see the difference.
        </p>
        <Input
          label="Dark Mode Input"
          placeholder="This input adapts to your theme"
          helperText="Try switching between light and dark mode"
        />
      </section>

      {/* Custom Styling */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Custom Styling</h2>
        <Input
          label="Custom Styled Input"
          placeholder="This input has custom styling"
          className="font-mono text-lg"
          helperText="Custom className applied for monospace font"
        />
      </section>
    </div>
  );
}

export default InputExamples;
