export default function Header() {
    return (
      <header className="bg-gray-800 py-4 px-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold agu-display">MangaPlumo</h1>
        <div className="space-x-4">
          <span className="material-icons align-middle">search</span>
          <span className="material-icons align-middle">notifications</span>
          <span className="material-icons align-middle">account_circle</span>
        </div>
      </header>
    );
  }
  