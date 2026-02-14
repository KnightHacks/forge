import { SessionNavbar } from "~/app/_components/navigation/session-navbar";

export default function AdminLayout(props: { children: React.ReactNode }) {
  return (
    <div>
      <SessionNavbar />
      <div>{props.children}</div>
    </div>
  );
}
