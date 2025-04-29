import React, { useState, useEffect } from 'react';
import ModeSelection from './components/ModeSelection/ModeSelection';
import BalloonGame from './components/BalloonGame/BalloonGame';
import FallingWords from './components/FallingWords/FallingWords';

function App() {
  const [gameType, setGameType] = useState('');
  const [selectionType, setSelectionType] = useState('random');
  const [themeOrPosSelection, setThemeOrPosSelection] = useState(null);
  const [frequency, setFrequency] = useState({ min: '1', max: '6000' });
  const [vocalization, setVocalization] = useState(false);
  const [problemCount, setProblemCount] = useState(10);

  // Dynamically map gameType to game components
  const gameComponents = {
    balloon: (
      <BalloonGame
        gameType={gameType}
        selectionType={selectionType}
        themeOrPosSelection={themeOrPosSelection}
        frequency={frequency}
        vocalization={vocalization}
        problemCount={problemCount}
      />
    ),
    // You can add more games here in the future as needed
  };

  return (
    <div>
      <ModeSelection
        gameType={gameType}
        setGameType={setGameType}
        selectionType={selectionType}
        setSelectionType={setSelectionType}
        themeOrPosSelection={themeOrPosSelection}
        setThemeOrPosSelection={setThemeOrPosSelection}
        frequency={frequency}
        setFrequency={setFrequency}
        vocalization={vocalization}
        setVocalization={setVocalization}
        problemCount={problemCount}
        setProblemCount={setProblemCount}
      />

      {/* Add the "game-container" class to create space between the interface and the game */}
      {gameType === 'balloon' && (
        <div className="game-container">
          <BalloonGame
            gameType={gameType}
            selectionType={selectionType}
            themeOrPosSelection={themeOrPosSelection}
            frequency={frequency}
            vocalization={vocalization}
            problemCount={problemCount}
          />
        </div>
      )}

      {gameType === 'falling' && (
        <div className="game-container">
          <FallingWords
            gameType={gameType}
            selectionType={selectionType}
            themeOrPosSelection={themeOrPosSelection}
            frequency={frequency}
            vocalization={vocalization}
            problemCount={problemCount}
          />
        </div>
      )}
    </div>
  );
}

export default App;