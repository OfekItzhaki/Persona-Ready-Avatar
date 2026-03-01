/**
 * Button Component Examples
 * 
 * This file demonstrates various usage patterns for the Button component.
 * Use this as a reference for implementing buttons in the application.
 */

import React from 'react';
import { Button } from './Button';

// Example icons (you can replace with actual icon library)
const SendIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const DownloadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export const ButtonExamples: React.FC = () => {
  const [loading, setLoading] = React.useState(false);

  const handleAsyncAction = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="p-8 space-y-12 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">
          Button Component Examples
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive showcase of the enhanced Button component
        </p>
      </div>

      {/* Variants */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Variants
        </h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary">Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="danger">Danger Button</Button>
        </div>
      </section>

      {/* Sizes */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Sizes
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="sm">Small Button</Button>
          <Button size="md">Medium Button</Button>
          <Button size="lg">Large Button</Button>
        </div>
      </section>

      {/* With Icons */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          With Icons
        </h2>
        <div className="flex flex-wrap gap-4">
          <Button icon={<SendIcon />} iconPosition="left">
            Send Message
          </Button>
          <Button
            variant="secondary"
            icon={<DownloadIcon />}
            iconPosition="right"
          >
            Download
          </Button>
          <Button variant="danger" icon={<TrashIcon />} iconPosition="left">
            Delete
          </Button>
        </div>
      </section>

      {/* Loading States */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Loading States
        </h2>
        <div className="flex flex-wrap gap-4">
          <Button loading>Loading...</Button>
          <Button variant="secondary" loading>
            Processing
          </Button>
          <Button variant="danger" loading>
            Deleting
          </Button>
          <Button loading icon={<SendIcon />}>
            Sending
          </Button>
        </div>
      </section>

      {/* Disabled States */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Disabled States
        </h2>
        <div className="flex flex-wrap gap-4">
          <Button disabled>Disabled Primary</Button>
          <Button variant="secondary" disabled>
            Disabled Secondary
          </Button>
          <Button variant="ghost" disabled>
            Disabled Ghost
          </Button>
          <Button variant="danger" disabled>
            Disabled Danger
          </Button>
        </div>
      </section>

      {/* Full Width */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Full Width
        </h2>
        <div className="space-y-3 max-w-md">
          <Button fullWidth>Full Width Primary</Button>
          <Button variant="secondary" fullWidth>
            Full Width Secondary
          </Button>
          <Button variant="ghost" fullWidth icon={<SendIcon />}>
            Full Width with Icon
          </Button>
        </div>
      </section>

      {/* Interactive Example */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Interactive Example
        </h2>
        <div className="flex flex-wrap gap-4">
          <Button onClick={handleAsyncAction} loading={loading}>
            {loading ? 'Processing...' : 'Click to Simulate Loading'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => alert('Button clicked!')}
          >
            Show Alert
          </Button>
        </div>
      </section>

      {/* Size Combinations */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Size & Variant Combinations
        </h2>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary" size="sm">
              Small Primary
            </Button>
            <Button variant="secondary" size="sm">
              Small Secondary
            </Button>
            <Button variant="ghost" size="sm">
              Small Ghost
            </Button>
            <Button variant="danger" size="sm">
              Small Danger
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary" size="lg">
              Large Primary
            </Button>
            <Button variant="secondary" size="lg">
              Large Secondary
            </Button>
            <Button variant="ghost" size="lg">
              Large Ghost
            </Button>
            <Button variant="danger" size="lg">
              Large Danger
            </Button>
          </div>
        </div>
      </section>

      {/* Form Example */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Form Example
        </h2>
        <form
          className="max-w-md space-y-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md"
          onSubmit={(e) => {
            e.preventDefault();
            alert('Form submitted!');
          }}
        >
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              placeholder="you@example.com"
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" fullWidth>
              Submit
            </Button>
            <Button type="button" variant="ghost" fullWidth>
              Cancel
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default ButtonExamples;
