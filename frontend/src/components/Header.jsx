// components/Header.jsx
import { BookOpen } from 'lucide-react';

export default function Header() {
  return (
    <header className="flex flex-col items-center py-8">
      <div className="flex items-center space-x-3">
        <BookOpen className="text-purple-400" size={36} strokeWidth={1.5} />
        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 leading-tight">
          Manga Plumo
        </h1>
      </div>
      <p className="mt-4 text-lg text-center text-gray-300 max-w-2xl">
        Download your favorite manga series with mangaplumo
      </p>
    </header>
  );
}
