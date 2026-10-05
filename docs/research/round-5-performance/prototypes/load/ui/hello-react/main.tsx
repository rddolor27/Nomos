import { createRoot } from 'react-dom/client'; import { useState, useEffect } from 'react';
function App() { const [c, s] = useState(0); useEffect(() => { const id = setInterval(() => s((x) => x + 1), 100); return () => clearInterval(id); }, []); return <p onClick={() => s(c + 1)}>{c}</p>; }
createRoot(document.getElementById('app')!).render(<App />);
