import React, { createContext, useContext, useState } from 'react';
import ModeSelection from './components/ModeSelection/ModeSelection';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import BalloonGame from './components/BalloonGame/BalloonGame';
import FallingWords from './components/FallingWords/FallingWords';
import MatchingGame from './components/MatchingGame/MatchingGame';
import Summary from './components/Summary';

const SessionContext = createContext();
export const useSession = () => useContext(SessionContext);

function App() {
  const [gameType, setGameType] = useState('');
  const [selectionType, setSelectionType] = useState('random');
  const [themeOrPosSelection, setThemeOrPosSelection] = useState(null);
  const [frequency, setFrequency] = useState({ min: '1', max: '6000' });
  const [vocalization, setVocalization] = useState(false);
  const [problemCount, setProblemCount] = useState(10);
  const [incorrectWords, setIncorrectWords] = useState([]);
  const [sessionActive, setSessionActive] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [reviewWords, setReviewWords] = useState([]);

  const addIncorrectWord = (word) => {
    setIncorrectWords(prev => [
      ...prev,
      {
        Syriac: word.Syriac,
        English: word.English
      }
    ]);
  };

  const clearSession = () => {
    setIncorrectWords([]);
    setSessionActive(false);
    setTotalScore(0);
  };

  return (
    <SessionContext.Provider value={{
      incorrectWords,
      addIncorrectWord,
      sessionActive,
      setSessionActive,
      clearSession,
      totalScore,
      setTotalScore,
      reviewWords,
      setReviewWords,
      gameType,
      setGameType,
      selectionType,
      setSelectionType,
    }}>

    <Router>
      <Routes>
        <Route
          path="/"
          element={
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
          }
        />

        <Route
          path="/game"
          element={
            gameType === 'balloon' ? (
              <BalloonGame
                gameType={gameType}
                selectionType={selectionType}
                themeOrPosSelection={themeOrPosSelection}
                frequency={frequency}
                vocalization={vocalization}
                problemCount={problemCount}
              />
            ) : gameType === 'falling' ? (
              <FallingWords
                gameType={gameType}
                selectionType={selectionType}
                themeOrPosSelection={themeOrPosSelection}
                frequency={frequency}
                vocalization={vocalization}
                problemCount={problemCount}
              />
            ) : gameType === 'matching' ? (
              <DndProvider backend={HTML5Backend}>
                <MatchingGame
                  gameType={gameType}
                  selectionType={selectionType}
                  themeOrPosSelection={themeOrPosSelection}
                  frequency={frequency}
                  vocalization={vocalization}
                  problemCount={problemCount}
                />
              </DndProvider>
            ) : (
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                No valid game selected.
              </div>
            )
          }
        />

        <Route
          path="/summary"
          element={
            <Summary/>
          }
        />
      </Routes>
    </Router>
    </SessionContext.Provider>
  );
}

export default App;