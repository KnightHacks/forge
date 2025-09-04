import Intro from "./components/Intro";
import Timeline from "./components/Timeline/Timeline";

export default function JerryPage() {
  return (
    <div className="mx-auto flex w-11/12 max-w-5xl flex-col items-center justify-center">
      <Intro></Intro>
      <Timeline></Timeline>
    </div>
  );
}
