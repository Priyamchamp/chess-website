import React from 'react';

function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-6">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} CheckmateX Chess. All rights reserved.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Play chess with friends or find opponents online.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer; 