const Hero = () => {
  return (
    <div className="min-h-screen -translate-y-10 flex flex-col justify-center items-center">
      <h1>Our Supporters</h1>
      <h3>Sponsors & Partners</h3>

      <div className="relative border-4 border-white mx-20 mt-14 mb-17 py-11 px-16">
        <div className="absolute top-2.5 left-2.5 border-t-4 border-l-4 border-white w-8 h-8 ">
        </div>
        <p>Our sponsors make it possible for us to unite developers, designers, and builders across Florida and beyond. Hackers form meaningful connections with our sponsors that last well past the hackathon weekend.</p>
        <div className="absolute right-2.5 bottom-2.5 border-b-4 border-r-4 border-white w-8 h-8 ">
        </div>

      </div>
      <button>Become a Sponsor</button>
    </div>
  )
};

export default Hero;

