import React from "react";
import Image from "next/image";

const MainContent = () => {
  return (
    <div id="main-content-container" className="mt-6 flex h-[1000px] w-auto">
      <div id="left-ad-container" className="w-1/12"></div>
      <div id="essay-container" className="h-full w-9/12 bg-red-600">
        <div
          id="image-container"
          className="relative float-left ml-3 mr-3 mt-4 h-72 w-56"
        >
          <Image
            src="/images/image1.webp"
            alt="something thats cool"
            layout="fill"
            objectFit="fill"
          />
        </div>

        <p className="mt-36 text-4xl">
          What is Lorem Ipsum? Lorem Ipsum is simply dummy text of the printing
          and typesetting industry. Lorem Ipsum has been the industry's standard
          dummy text ever since the 1500s, when an unknown printer took a galley
          of type and scrambled it to make a type specimen book. It has survived
          not only five centuries, but also the leap into electronic
          typesetting, remaining essentially unchanged. It was popularised in
          the 1960s with the release of Letraset sheets containing Lorem Ipsum
          passages, and more recently with desktop publishing software like
          Aldus PageMaker including versions of Lorem Ipsum. Why do we use it?
          It is a long established fact that a reader will be distracted by the
          readable content of a page when looking at its layout.
        </p>
      </div>
      <div id="right-ad-container" className="w-2/12"></div>
    </div>
  );
};

export default MainContent;
