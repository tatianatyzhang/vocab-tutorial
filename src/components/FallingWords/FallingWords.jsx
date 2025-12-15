import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import './FallingWords.css';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../App';

const SPAWN_INTERVAL = 2500; // Time between new words spawning
const MAX_WORDS_ON_SCREEN = 6;

// Helper to loose-match Parts of Speech
const matchPosValue = (selectedValue, csvValue) => {
  if (!selectedValue || !csvValue) return false;
  const selectedLower = selectedValue.toLowerCase();
  const csvLower = csvValue.toLowerCase();
  
  // Direct match
  if (selectedLower === csvLower) return true;

  // Mapping for variations
  const posMapping = {
    'nounadj': ['noun', 'nouns', 'nounadj', 'n'],
    'adverb': ['adverb', 'adverbs', 'adv'],
    'proper noun': ['proper noun', 'proper nouns', 'propernoun'],
    'particle': ['particle', 'particles', 'conjunction', 'conjunctions', 'conj'],
    'prep': ['prep', 'preposition', 'prepositions'],
    'pronouns': ['pronoun', 'pronouns', 'pron'],
    'verbs': ['verb', 'verbs', 'v']
  };
  
  // Check key match
  if (posMapping[selectedLower] && posMapping[selectedLower].includes(csvLower)) return true;
  
  // Check reverse match
  for (const [key, values] of Object.entries(posMapping)) {
    if (values.includes(selectedLower) && (key === csvLower || values.includes(csvLower))) return true;
  }
  return false;
};

const FallingWordsGame = ({
  themeOrPosSelection,
  selectionType,
  frequency,
  vocalization,
  gameDuration
}) => {
  const navigate = useNavigate();
  const { addIncorrectWord, setTotalScore, reviewWords } = useSession();

  // State
  const [activePool, setActivePool] = useState([]); // All words matching filters
  const [remaining, setRemaining] = useState([]);   // Words available for spawning in current cycle
  const [words, setWords] = useState([]);           // Words currently on screen
  
  const [score, setScore] = useState(0);
  const [wordsMatched, setWordsMatched] = useState(0);
  const [message, setMessage] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);
  const [timer, setTimer] = useState(gameDuration);
  const [input, setInput] = useState('');

  // Refs
  const lastSpawnRef = useRef(Date.now());
  const inputRef = useRef();

  // Helper to choose text based on settings
  const getSyriacText = (row) => {
    if (vocalization) {
      return row['Vocalized Syriac'] || row['Non vocalized Syriac'] || '';
    } else {
      return row['Non vocalized Syriac'] || row['Vocalized Syriac'] || '';
    }
  };

  // 1. Load and Filter Data
  useEffect(() => {
    if (selectionType === 'review') {
        const shaped = reviewWords.map((r, idx) => ({
            ...r,
            id: `rev-${idx}`, // Unique ID for React keys
            English: r.English.trim().toLowerCase(),
            // Ensure properties exist
            'Vocalized Syriac': r['Vocalized Syriac'] || r.Syriac,
            'Non vocalized Syriac': r['Non vocalized Syriac'] || r.Syriac,
        }));
        setActivePool(shaped);
        setRemaining([...shaped]);
        return;
    }

    Papa.parse('/vocab_list.csv', {
      header: true,
      download: true,
      complete: (results) => {
        let filtered = results.data.filter(r => r.English && (r['Vocalized Syriac'] || r['Non vocalized Syriac']));
        
        // Theme Filter
        if (selectionType === 'theme' && themeOrPosSelection) {
          const targetTheme = themeOrPosSelection.value || themeOrPosSelection.label;
          filtered = filtered.filter(row => row['Vocabulary Category'] === targetTheme);
        } 
        // POS Filter
        else if (selectionType === 'pos' && themeOrPosSelection) {
          const targetPos = themeOrPosSelection.value || themeOrPosSelection.label;
          filtered = filtered.filter(row => matchPosValue(targetPos, row['Grammatical Category']));
        }

        // Frequency Filter (FIX: ParseInt)
        if (selectionType === 'random' || selectionType === 'theme') {
            const minFreq = parseInt(frequency.min, 10) || 1;
            const maxFreq = parseInt(frequency.max, 10) || 6000;
            
            filtered = filtered.filter(r => {
                // Remove commas and parse
                const rawFreq = (r.Frequency || '0').toString().replace(/,/g, '');
                const f = parseInt(rawFreq, 10);
                return f >= minFreq && f <= maxFreq;
            });
        }

        // Shape data
        const shaped = filtered.map((r, idx) => ({
          ...r,
          id: `csv-${idx}`,
          English: r.English.trim().toLowerCase(),
        }));

        setActivePool(shaped);
        setRemaining([...shaped]);
      },
    });
  }, [selectionType, themeOrPosSelection, frequency, reviewWords]);

  // 2. Timer Logic
  useEffect(() => {
    if (timer <= 0 || isGameOver) return;
    
    const id = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(id);
          setIsGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(id);
  }, [timer, isGameOver]);

  // 3. Spawning Logic
  useEffect(() => {
    if (activePool.length === 0 || isGameOver) return;

    // Infinite Play: Refill remaining if empty
    if (remaining.length === 0) {
        setRemaining([...activePool]);
        return;
    }

    if (words.length < MAX_WORDS_ON_SCREEN) {
       const now = Date.now();
       // Spawn if interval passed OR if screen is empty
       if (now - lastSpawnRef.current >= SPAWN_INTERVAL || words.length === 0) {
            const idx = Math.floor(Math.random() * remaining.length);
            const nextWord = remaining[idx];

            // Remove from remaining so we don't spawn duplicates immediately
            setRemaining(prev => prev.filter((_, i) => i !== idx));

            setWords(prev => [...prev, {
                uid: Date.now() + Math.random(), // Unique ID for animation key
                ...nextWord,
                x: Math.random() * 80 + 10, // Random X (10% to 90%)
                y: -10, // Start just above screen
                speed: 0.15 + (Math.random() * 0.1), // Varied speed
            }]);
            
            lastSpawnRef.current = Date.now();
       }
    }
  }, [remaining, isGameOver, words.length, activePool]);

  // 4. Movement & Hit Detection Logic
  useEffect(() => {
    if (isGameOver) return;

    const gameLoop = setInterval(() => {
      setWords(prevWords => {
        // Move words down
        return prevWords
          .map(word => ({ ...word, y: word.y + word.speed }))
          .filter(word => {
            // Check if it hit the bottom (approx 90%)
            if (word.y >= 90) {
              handleMiss(word);
              return false; // Remove from screen
            }
            return true; // Keep on screen
          });
      });
    }, 50); // 20fps update

    return () => clearInterval(gameLoop);
  }, [isGameOver]);

  const handleMiss = (word) => {
      addIncorrectWord(word);
      setScore(s => Math.max(0, s - 5));
      setMessage(`Missed: ${word.English}`);
      setTimeout(() => setMessage(''), 1000);
  };

  // 5. Input Handling
  const handleInput = (value) => {
    const cleanValue = value.toLowerCase().trim();
    if (!cleanValue) return;

    setWords(prevWords => {
      // Find matches
      const matchIndex = prevWords.findIndex(w => {
          // Handle comma-separated answers like "house, home"
          const answers = w.English.split(/[,;]+/).map(s => s.trim());
          return answers.includes(cleanValue);
      });

      if (matchIndex !== -1) {
        // Correct Match
        const match = prevWords[matchIndex];
        setScore(s => s + 10);
        setWordsMatched(n => n + 1);
        setInput('');
        setMessage(`Correct! ${match.English}`);
        setTimeout(() => setMessage(''), 1000);

        // Remove the matched word
        const newWords = [...prevWords];
        newWords.splice(matchIndex, 1);
        return newWords;
      }
      
      // No match found, return state as is (optional: penalty for wrong typing?)
      return prevWords;
    });
  };

  const handleRestart = () => {
    setScore(0);
    setWordsMatched(0);
    setInput('');
    setWords([]);
    setTimer(gameDuration);
    setIsGameOver(false);
    lastSpawnRef.current = Date.now();
    setRemaining([...activePool]);
  };

  // Final Score Sync
  useEffect(() => {
    if (isGameOver) {
      setTotalScore(prev => prev + score);
    }
  }, [isGameOver, score, setTotalScore]);

  return (
    <div className="game-area">
      {/* Header Bar */}
      <div className="game-header-bar">
          <button onClick={() => navigate(-1)} className="back-button">← Back</button>
          
          <div className="game-stats-container">
            <div className="stat-box score-display">Score: {score}</div>
            <div className="stat-box timer-display">Time: {timer}s</div>
            <div className="stat-box question-counter">Matched: {wordsMatched}</div>
          </div>
      </div>

      {/* Input Box */}
      <input
        ref={inputRef}
        className="type-box"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleInput(input);
            setInput(''); // Clear input even if wrong to keep flowing
          }
        }}
        placeholder="Type English translation..."
        autoFocus
        disabled={isGameOver}
      />

      {/* Falling Words */}
      {words.map(word => (
        <div
          key={word.uid}
          className="falling-word"
          style={{ top: `${word.y}%`, left: `${word.x}%` }}
        >
          {getSyriacText(word)}
        </div>
      ))}

      {/* Messages */}
      {message && <div className="message-overlay">{message}</div>}

      {/* Game Over Modal */}
      {isGameOver && (
        <div className="results-box">
          <h2>Game Over!</h2>
          <p>Final Score: {score}</p>
          <p>Words Matched: {wordsMatched}</p>
          <button className="restart-button" onClick={handleRestart}>Play Again</button>
          <br/><br/>
          <button className="restart-button" style={{backgroundColor: '#6c757d'}} onClick={() => navigate('/summary')}>Finish Session</button>
        </div>
      )}
    </div>
  );
};

export default FallingWordsGame;