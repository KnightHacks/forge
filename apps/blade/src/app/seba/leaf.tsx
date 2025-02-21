import './leafanims.css';
import React, { useEffect, useRef } from 'react';
import multiLeaf from "./multileaf";
 
interface LeafProps {
  style?: React.CSSProperties;
}

const Leaf: React.FC<LeafProps> = ({ style }) => {
  return (
    
    <div className="leaf-container">
    <multiLeaf/ >
      <img
        src="./public/leaf.gif"
        alt="❀"
        className="leaf"
        style={style}
      />
    </div>
    
  );
};


export default Leaf;