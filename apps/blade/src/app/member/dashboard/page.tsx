import Image from "next/image";

import DashboardComponent from "../components/dashboard-component";

export default function Dashboard() {
  return (
    <div>
      <DashboardComponent />
      <Image
        src={"/tk-dashboard-img.svg"}
        alt="A picture of Tech Knight"
        width={300}
        height={600}
      />
    </div>
  );
}
