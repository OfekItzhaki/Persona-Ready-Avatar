/**
 * LoadingSkeleton Component Examples
 * 
 * Demonstrates various use cases for the LoadingSkeleton component.
 */

import React from 'react';
import { LoadingSkeleton, AvatarLoadingSkeleton } from './LoadingSkeleton';

export function LoadingSkeletonExamples() {
  return (
    <div className="space-y-8 p-8">
      <section>
        <h2 className="text-2xl font-bold mb-4">Basic Loading Skeleton</h2>
        <LoadingSkeleton width="full" height="2rem" />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Multiple Skeletons</h2>
        <LoadingSkeleton width="full" height="1.5rem" count={3} />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Avatar Loading Skeleton</h2>
        <div className="max-w-2xl">
          <AvatarLoadingSkeleton />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Different Animations</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">Shimmer (default)</p>
            <LoadingSkeleton width="full" height="2rem" animation="shimmer" />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Pulse</p>
            <LoadingSkeleton width="full" height="2rem" animation="pulse" />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Wave</p>
            <LoadingSkeleton width="full" height="2rem" animation="wave" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Different Variants</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">Default (rounded-md)</p>
            <LoadingSkeleton width="full" height="4rem" variant="default" />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Avatar (rounded-lg)</p>
            <LoadingSkeleton width="full" height="4rem" variant="avatar" />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Text (rounded)</p>
            <LoadingSkeleton width="full" height="1rem" variant="text" count={3} />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Circle (rounded-full)</p>
            <LoadingSkeleton width="4rem" height="4rem" variant="circle" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Custom Dimensions</h2>
        <div className="space-y-4">
          <LoadingSkeleton width="200px" height="100px" />
          <LoadingSkeleton width="50%" height="3rem" />
          <LoadingSkeleton width="full" height="150px" />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Message List Loading</h2>
        <div className="space-y-3">
          <div className="flex justify-start">
            <LoadingSkeleton width="60%" height="4rem" variant="default" />
          </div>
          <div className="flex justify-end">
            <LoadingSkeleton width="70%" height="3rem" variant="default" />
          </div>
          <div className="flex justify-start">
            <LoadingSkeleton width="55%" height="5rem" variant="default" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Profile Card Loading</h2>
        <div className="border border-gray-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-4">
            <LoadingSkeleton width="4rem" height="4rem" variant="circle" />
            <div className="flex-1 space-y-2">
              <LoadingSkeleton width="60%" height="1.5rem" variant="text" />
              <LoadingSkeleton width="40%" height="1rem" variant="text" />
            </div>
          </div>
          <LoadingSkeleton width="full" height="6rem" variant="default" />
          <div className="flex gap-2">
            <LoadingSkeleton width="5rem" height="2rem" variant="default" />
            <LoadingSkeleton width="5rem" height="2rem" variant="default" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Custom Aria Labels</h2>
        <div className="space-y-4">
          <LoadingSkeleton 
            width="full" 
            height="2rem" 
            ariaLabel="Loading user profile"
          />
          <LoadingSkeleton 
            width="full" 
            height="2rem" 
            ariaLabel="Loading messages"
          />
          <LoadingSkeleton 
            width="full" 
            height="2rem" 
            ariaLabel="Loading settings"
          />
        </div>
      </section>
    </div>
  );
}

export default LoadingSkeletonExamples;
