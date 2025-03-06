"use client";

import React from "react";
import Image from "next/image";

const MainContent = () => {
  const cashapp = () => {
    window.open("https://cash.app/$erica5710", "_blank");
  };
  const resume = () => {
    window.open("/images/Arthur_s_Resume.pdf", "_blank");
  };
  const linkedin = () => {
    window.open(
      "https://www.linkedin.com/in/at8/?trk=opento_sprofile_topcard",
      "_blank",
    );
  };
  const personalWebsite = () => {
    window.open("https://my-very-cool-personal-website.vercel.app/", "_blank");
  };
  const github = () => {
    window.open("https://github.com/Arthur1asdf", "_blank");
  };

  return (
    <div id="main-content-container" className="mt-6 flex h-[1000px] w-auto">
      <div
        id="left-ad-container"
        className="flex w-2/12 flex-col items-center justify-center"
      >
        <div
          id="resume"
          className="relative mb-9 h-72 w-11/12 cursor-pointer"
          onClick={resume}
        >
          <Image
            src="/images/jakeresume.png"
            alt="something thats cool"
            layout="fill"
            objectFit="fill"
          />
        </div>
        <div
          id="linkedin"
          className="relative mb-9 h-72 w-11/12 cursor-pointer"
          onClick={linkedin}
        >
          <Image
            src="/images/businessman.webp"
            alt="something thats cool"
            layout="fill"
            objectFit="fill"
          />
        </div>
        <div
          id="personal-website"
          className="relative h-72 w-11/12 cursor-pointer"
          onClick={personalWebsite}
        >
          {/* needed to put unoptimized for gifs when using images */}
          <Image
            src="/images/yap.gif"
            alt="something thats cool"
            layout="fill"
            objectFit="fill"
            unoptimized
          />
        </div>
      </div>
      <div
        id="essay-container"
        className="h-full w-8/12 overflow-hidden bg-gray-900"
      >
        <div
          id="image-container"
          className="relative float-left ml-3 mr-3 mt-4 h-72 w-56"
          onClick={github}
        >
          <Image
            src="/images/furry.webp"
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
          No one knows I like kissing boyz and the fact that a reader will be
          distracted by the readable content of a page when looking at its
          layout. The point of using Lorem Ipsum is that it has a more-or-less
          normal distribution of letters, as opposed to using 'Content here,
          content here', making it look like readable English. Many desktop
          publishing packages and web page editors now use Lorem Ipsum as their
          default model text, and a search for 'lorem ipsum' will uncover many
          web sites still in their infancy.
        </p>
      </div>
      <div
        id="right-ad-container"
        className="flex w-2/12 flex-col items-center justify-center"
      >
        <div
          id="first-ad"
          className="relative mb-9 h-72 w-11/12 cursor-pointer"
          onClick={cashapp}
        >
          <Image
            src="/images/image1.webp"
            alt="something thats cool"
            layout="fill"
            objectFit="fill"
          />
        </div>
        <div
          id="second-ad"
          className="relative mb-9 h-72 w-11/12 cursor-pointer"
          onClick={cashapp}
        >
          <Image
            src="/images/image3.webp"
            alt="something thats cool"
            layout="fill"
            objectFit="fill"
          />
        </div>
        <div
          id="third-ad"
          className="relative h-72 w-11/12 cursor-pointer"
          onClick={cashapp}
        >
          <Image
            src="/images/image2.jpg"
            alt="something thats cool"
            layout="fill"
            objectFit="fill"
          />
        </div>
      </div>
    </div>
  );
};

export default MainContent;
