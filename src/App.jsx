import React, { useState } from 'react';
import { Route, Routes } from 'react-router-dom'; // Use Routes instead of Switch in v6
import ModeSelection from './components/ModeSelection/ModeSelection';
import BalloonGame from './components/BalloonGame/BalloonGame';

function App() {
  const [gameType, setGameType] = useState('');
  const [selectionType, setSelectionType] = useState('random');
  const [themeOrPosSelection, setThemeOrPosSelection] = useState(null);
  const [frequency, setFrequency] = useState({ min: '1', max: '6000' });
  const [vocalization, setVocalization] = useState(false);
  const [problemCount, setProblemCount] = useState(10);

  return (
    <div>
      <Routes>
        {/* Route for Mode Selection */}
        <Route path="/" element={
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
        } />

        {/* Route for Balloon Game */}
        <Route
          path="/balloon" element={
            <BalloonGame
              gameType={gameType}
              selectionType={selectionType}
              themeOrPosSelection={themeOrPosSelection}
              frequency={frequency}
              vocalization={vocalization}
              problemCount={problemCount}
            />
          }
        />

        {/* Additional routes for other games like 'matching' or 'falling' */}
      </Routes>
    </div>
  );
}

export default App;