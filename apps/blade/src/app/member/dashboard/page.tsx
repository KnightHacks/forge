import Image from "next/image";

import DashboardComponent from "../components/dashboard-component";

export default function Dashboard() {
  return (
    <div>
      <DashboardComponent />
      <Image
        src={"../../../../../blade/public/tk-dashboard-img.svg"}
        alt="tk-pic"
        width={500}
        height={800}
      />
    </div>
  );
}
