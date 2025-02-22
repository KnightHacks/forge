import './leafanims.css';
import React, { useEffect, useRef } from 'react';
 
interface LeafProps {
  style?: React.CSSProperties;
}

const Leaf: React.FC<LeafProps> = ({ style }) => {
  return (
    
    <div className="leaf-container">
      <img
        alt="❀"
        className="leaf"
        style={style}
      />
    </div>
    
  );
};


export default Leaf;