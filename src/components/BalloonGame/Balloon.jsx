import React from 'react';
import './Balloon.css';

function Balloon({ balloon, onClick }) {
  return (
    <div
      className={`balloon ${balloon.popped ? 'popped' : ''}`}
      style={{
        left: `${balloon.x}%`,
        bottom: `${balloon.y}%`,
      }}
      onClick={onClick}
    >
      <span className="balloon-label">{balloon.label}</span>
    </div>
  );
}

export default Balloon;
