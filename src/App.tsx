import { useState, useEffect, useCallback } from 'react';
import Scene1 from './scenes/Scene1';
import Scene2 from './scenes/Scene2';
import Scene3 from './scenes/Scene3';
import Scene4 from './scenes/Scene4';
import BlankScene from './scenes/BlankScene';
import './App.css';

function App() {
  const [currentScene, setCurrentScene] = useState(1);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const key = e.key;
    if (key >= '1' && key <= '9') {
      setCurrentScene(parseInt(key, 10));
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const renderScene = () => {
    switch (currentScene) {
      case 1:
        return <Scene1 />;
      case 2:
        return <Scene2 />;
      case 3:
        return <Scene3 />;
      case 4:
        return <Scene4 />;
      case 5:
      case 6:
      case 7:
      case 8:
      case 9:
        return <BlankScene sceneNumber={currentScene} />;
      default:
        return <Scene1 />;
    }
  };

  return (
    <div className="app">
      {renderScene()}
    </div>
  );
}

export default App;
