export default function Application() {
  return (
    <>
      <div className="flex h-[20vh] w-[100vw] flex-col items-center justify-end">
        <p className="title-animate text-6xl">Anthony Calabrese</p>
      </div>
      <div className="box-pulse flex h-[40vh] w-[100vw] flex-col items-center justify-center">
        <p className="mb-10 scale-100 transform text-xl transition duration-150 hover:scale-[1.2] hover:text-yellow-500">
          application
        </p>
        <p className="mb-10 scale-100 transform text-xl transition duration-150 hover:scale-[1.2] hover:text-yellow-500">
          Resume
        </p>
        <p className="mb-10 scale-100 transform text-xl transition duration-150 hover:scale-[1.2] hover:text-yellow-500">
          Linkedin
        </p>
        <p className="mb-10 scale-100 transform text-xl transition duration-150 hover:scale-[1.2] hover:text-yellow-500">
          Portfolio
        </p>
      </div>
    </>
  );
}
