import React, { createContext, useContext, useState } from 'react';
import ModeSelection from './components/ModeSelection/ModeSelection';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import BalloonGame from './components/BalloonGame/BalloonGame';
import FallingWords from './components/FallingWords/FallingWords';
import MatchingGame from './components/MatchingGame/MatchingGame';
import Summary from './components/Summary';
import DefiningHomographs from './components/DefiningHomographs/DefiningHomographs';
import VocalizingHomographs from './components/VocalizingHomographs/VocalizingHomographs';

const SessionContext = createContext();
export const useSession = () => useContext(SessionContext);

function App() {
  const [gameType, setGameType] = useState('');
  const [selectionType, setSelectionType] = useState('random');
  const [themeOrPosSelection, setThemeOrPosSelection] = useState(null);
  const [frequency, setFrequency] = useState({ min: '1', max: '6000' });
  
  // FIX: Default vocalization to true
  const [vocalization, setVocalization] = useState(true);
  
  // FIX: Replaced problemCount with gameDuration (default 60s) for time-based games
  const [gameDuration, setGameDuration] = useState(60);
  
  const [incorrectWords, setIncorrectWords] = useState([]);
  const [sessionActive, setSessionActive] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [reviewWords, setReviewWords] = useState([]);

  // Helper to add words to the review list from any game
  const addIncorrectWord = (word) => {
    // Handle different data structures from different games/CSVs
    const syriacText = word.Syriac || word['Vocalized Syriac'] || word['Non vocalized Syriac'] || '';
    
    setIncorrectWords(prev => [
      ...prev,
      {
        Syriac: syriacText,
        English: word.English,
        // Preserve original keys if needed for restarting specific games
        'Vocalized Syriac': word['Vocalized Syriac'],
        'Non vocalized Syriac': word['Non vocalized Syriac'],
        'Grammatical Category': word['Grammatical Category'],
        'Vocabulary Category': word['Vocabulary Category']
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

    {/* Basename allows the app to be hosted in a subdirectory like /vocab/ */}
    <Router basename="/vocab">
      <Routes>
        {/* Default Route */}
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
              gameDuration={gameDuration}
              setGameDuration={setGameDuration}
            />
          }
        />

        {/* FIX: Add explicit route for index.html to prevent blank screen */}
        <Route
          path="/index.html"
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
              gameDuration={gameDuration}
              setGameDuration={setGameDuration}
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
                gameDuration={gameDuration}
              />
            ) : gameType === 'falling' ? (
              <FallingWords
                gameType={gameType}
                selectionType={selectionType}
                themeOrPosSelection={themeOrPosSelection}
                frequency={frequency}
                vocalization={vocalization}
                gameDuration={gameDuration}
              />
            ) : gameType === 'matching' ? (
              <DndProvider backend={HTML5Backend}>
                <MatchingGame
                  selectionType={selectionType}
                  themeOrPosSelection={themeOrPosSelection}
                  frequency={frequency}
                  vocalization={vocalization}
                  gameDuration={gameDuration}
                />
              </DndProvider>
            ) : gameType === 'defining-homograph' ? (
              <DefiningHomographs />
            ) : gameType === 'vocalizing-homograph' ? (
              <VocalizingHomographs />
            ) : (
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                No valid game selected. Current gameType: "{gameType}"
                <br />
                <a href="/">Go back to mode selection</a>
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