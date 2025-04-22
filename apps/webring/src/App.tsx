import Board from "./_components/board";
import List from "./_components/list";
import Nav from "./_components/nav";

function App() {

  return (
    <>
    <div className="bg-black w-screen h-full flex flex-col items-start justify-center">
      <Nav />
      <div className="relative h-full overflow-scroll w-screen flex flex-row items-start justify-center">
        <List />
        <div className="sticky w-2/3 h-full border_i overflow-visible">
        <Board />
        </div>
      </div>
      </div>
    </>
  )
}

export default App
