import React from "react";

const PDFViewer = () => {
  return (
    <div>
      <iframe
        src="https://drive.google.com/file/d/1RtzXWJGNzyMkepEhvJRkak01bVsr4g7x/preview"
        className="h-screen w-full"
        allow="autoplay"
      ></iframe>
    </div>
  );
};

export default PDFViewer;
