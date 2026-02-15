import Header from "~/app/_components/officers/header";
import Officers from "~/app/_components/officers/officers";

export default function officers() {
  return (
    <div className="h-auto w-screen overflow-hidden bg-[#0F172A]">
      <Header />
      <Officers />
    </div>
  );
}
