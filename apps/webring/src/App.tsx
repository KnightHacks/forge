import Board from "./_components/board";
import List from "./_components/list";
import Nav from "./_components/nav";

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-black">
      <Nav />
      <div className="flex flex-grow flex-row">
        <List />
        <div className="relative w-2/3">
          <Board />
        </div>
      </div>
    </div>
  );
}

export default App;
