import './leafanims.css';
import React from 'react';

interface LeafProps {
  style?: React.CSSProperties;
}

const Leaf: React.FC<LeafProps> = ({ style }) => {
  return (
    <div className="leaf-container">
      <div
      className="leaf"
      style={style}
      >
      ❀
      </div>
    </div>
  );
};

export default Leaf;