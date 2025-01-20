export default function About() {
  return (
    <div className="m-2 flex h-screen flex-col items-center justify-center">
      <p className="font-pragati text-center text-[30px] font-bold leading-[102px] tracking-[0.05em] text-white [text-shadow:0px_0px_281.064px_#6B21A8,0px_0px_160.608px_#6B21A8,0px_0px_93.688px_#6B21A8,0px_0px_46.844px_#6B21A8,0px_0px_13.384px_#6B21A8,0px_0px_6.692px_#6B21A8] md:text-[60px]">
        ABOUT US
      </p>
      <p className="font-poppins w-full max-w-[1276px] transform px-4 text-center text-[16px] font-semibold leading-[24px] tracking-[0.05em] text-white md:text-[36px] md:leading-[54px]">
        The FitnessGram™ Pacer Test is a multistage aerobic capacity test that
        progressively gets more difficult as it continues. The 20 meter pacer
        test will begin in 30 seconds. Line up at the start. The running speed
        starts slowly, but gets faster each minute after you hear this signal.
        [beep] A single lap should be completed each time you hear this sound.
        [ding] Remember to run in a straight line, and run as long as possible.
        The second time you fail to complete a lap before the sound, your test
        is over. The test will begin on the word start. On your mark, get ready,
        start.
      </p>
    </div>
  );
}
