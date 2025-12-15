import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { useDrag, useDrop } from "react-dnd";
import './MatchingGame.css';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../App';

// Utility to shuffle an array
const shuffleArray = array => [...array].sort(() => Math.random() - 0.5);

// Helper function to match POS selection
const matchPosValue = (selectedValue, csvValue) => {
  if (!selectedValue || !csvValue) return false;
  if (selectedValue === csvValue) return true;
  if (selectedValue.toLowerCase() === csvValue.toLowerCase()) return true;
  
  const selectedLower = selectedValue.toLowerCase();
  const csvLower = csvValue.toLowerCase();
  
  const posMapping = {
    'nounadj': ['noun', 'nouns', 'nounadj', 'n'],
    'adverb': ['adverb', 'adverbs', 'adv'],
    'proper noun': ['proper noun', 'proper nouns', 'propernoun'],
    'particle': ['particle', 'particles', 'conjunction', 'conjunctions', 'conj'],
    'prep': ['prep', 'preposition', 'prepositions'],
    'pronouns': ['pronoun', 'pronouns', 'pron'],
    'verbs': ['verb', 'verbs', 'v']
  };
  
  if (posMapping[selectedLower] && posMapping[selectedLower].includes(csvLower)) return true;
  for (const [key, values] of Object.entries(posMapping)) {
    if (values.includes(selectedLower) && (key === csvLower || values.includes(csvLower))) return true;
  }
  return false;
};

// --- Draggable Component ---
const DraggableWord = ({ word, mismatched, getSyriacText }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'WORD',
    item: { id: word.id },
    canDrag: !mismatched,
    collect: monitor => ({ isDragging: monitor.isDragging() })
  }));

  return (
    <div
      ref={!mismatched ? drag : null}
      className={`matching-card draggable ${mismatched ? 'mismatched' : ''}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      {getSyriacText(word)}
    </div>
  );
};

// --- Droppable Component ---
const DroppableTarget = ({ target, onDrop, matched, mismatched, isGameOver }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'WORD',
    drop: item => onDrop(item.id, target.id),
    canDrop: () => !matched && !mismatched,
    collect: monitor => ({ isOver: monitor.isOver() })
  }));

  let className = "matching-card droppable";
  if (matched) className += " matched";
  else if (mismatched) className += " mismatched";
  else if (isOver) className += " hover";

  return (
    <div
      ref={matched || mismatched || isGameOver ? null : drop}
      className={className}
    >
      {target.English}
    </div>
  );
};

// --- Main Game Component ---
export default function MatchingGame({ 
    selectionType, 
    themeOrPosSelection, 
    frequency, 
    vocalization, 
    gameDuration 
}) {
  const navigate = useNavigate();
  const { addIncorrectWord, setTotalScore, reviewWords } = useSession();

  // State
  const [vocabulary, setVocabulary] = useState([]);     // Full loaded CSV
  const [activePool, setActivePool] = useState([]);     // Words matching filters
  const [remaining, setRemaining] = useState([]);       // Words waiting to be dealt
  
  // Round State
  const [shuffledSyriac, setShuffledSyriac] = useState([]);
  const [shuffledEnglish, setShuffledEnglish] = useState([]);
  const [matched, setMatched] = useState({});
  const [mismatched, setMismatched] = useState({});
  
  // Game Stats
  const [score, setScore] = useState(0);
  const [roundsCompleted, setRoundsCompleted] = useState(0);
  const [timer, setTimer] = useState(gameDuration);
  const [isGameOver, setIsGameOver] = useState(false);

  // Helper: Text Display
  const getSyriacText = (row) => {
    if (vocalization) {
      return row['Vocalized Syriac'] || row['Non vocalized Syriac'] || '';
    } else {
      return row['Non vocalized Syriac'] || row['Vocalized Syriac'] || '';
    }
  };

  // 1. Timer Logic
  useEffect(() => {
    if (timer <= 0 || isGameOver) return;

    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer, isGameOver]);

  // 2. Load CSV Data
  useEffect(() => {
    // If review mode, we use context data, no need to parse CSV
    if (selectionType === 'review') return;

    Papa.parse('/vocab_list.csv', {
      header: true,
      download: true,
      complete: ({ data }) => {
        // Basic cleanup
        const rows = data
        .filter(r => r.English && (r['Vocalized Syriac'] || r['Non vocalized Syriac']))
        .map((r, idx) => ({
          ...r,
          id: `csv-${idx}` // Unique ID for Drag and Drop
        }));
        setVocabulary(rows);
      }
    });
  }, [selectionType]);

  // 3. Initialize Game Pool based on Filters
  useEffect(() => {
    let pool = [];

    if (selectionType === 'review') {
        pool = reviewWords.map((w, i) => ({
            ...w,
            id: `rev-${i}`,
            // Ensure frequency exists for logic, though unused in review
            Frequency: w.Frequency || 1 
        }));
    } else {
        if (!vocabulary.length) return;
        pool = vocabulary;

        // Theme Filter
        if (selectionType === 'theme' && themeOrPosSelection) {
            const target = themeOrPosSelection.value || themeOrPosSelection.label;
            pool = pool.filter(r => r['Vocabulary Category'] === target);
        } 
        // POS Filter
        else if (selectionType === 'pos' && themeOrPosSelection) {
            const target = themeOrPosSelection.value || themeOrPosSelection.label;
            pool = pool.filter(r => matchPosValue(target, r['Grammatical Category']));
        }

        // Frequency Filter (FIXED: ParseInt)
        if (selectionType === 'random' || selectionType === 'theme') {
            const minFreq = parseInt(frequency.min, 10) || 1;
            const maxFreq = parseInt(frequency.max, 10) || 6000;
            pool = pool.filter(r => {
                const rawFreq = (r.Frequency || '0').toString().replace(/,/g, '');
                const f = parseInt(rawFreq, 10);
                return f >= minFreq && f <= maxFreq;
            });
        }
    }

    if (pool.length === 0) {
        console.warn("No words found matching criteria");
    }

    // Set up the game
    setActivePool(pool);
    setRemaining([...pool]);
    setScore(0);
    setRoundsCompleted(0);
    setTimer(gameDuration);
    setIsGameOver(false);
    
    // Trigger first round deal
    // We use a small timeout or state flag to ensure 'remaining' is set before dealing
    // But since startNewRound depends on remaining, we can call it if we pass the pool directly
    dealCards([...pool]); 

  }, [vocabulary, selectionType, themeOrPosSelection, frequency, gameDuration, reviewWords]);

  // 4. Deal Cards Logic (Infinite)
  const dealCards = (currentRemaining) => {
    // If pool exhausted, recycle activePool (Infinite play)
    if (currentRemaining.length === 0) {
        if (activePool.length === 0) return; // Safety
        currentRemaining = [...activePool];
    }

    // Pick up to 5 words
    const count = Math.min(5, currentRemaining.length);
    const roundWords = shuffleArray(currentRemaining).slice(0, count);

    // Update remaining words
    // We filter by ID to remove the ones we just picked
    const usedIds = new Set(roundWords.map(w => w.id));
    const nextRemaining = currentRemaining.filter(w => !usedIds.has(w.id));
    
    setRemaining(nextRemaining);
    
    // Set up board
    setShuffledSyriac(shuffleArray(roundWords));
    setShuffledEnglish(shuffleArray(roundWords));
    setMatched({});
    setMismatched({});
  };

  // 5. Check for Round Completion
  useEffect(() => {
    if (shuffledSyriac.length > 0 && Object.keys(matched).length === shuffledSyriac.length) {
        // Round cleared
        setTimeout(() => {
            setRoundsCompleted(prev => prev + 1);
            dealCards(remaining); // Deal next batch
        }, 800);
    }
  }, [matched, shuffledSyriac.length]); // Intentionally omitting 'remaining' to avoid loops

  const handleDrop = (wordId, targetId) => {
    if (isGameOver || matched[wordId] || mismatched[wordId]) return;
    
    // Find word object to log if incorrect
    const wordObj = shuffledSyriac.find(w => w.id === wordId);

    if (wordId === targetId) {
      // Correct
      setMatched(prev => ({ ...prev, [wordId]: true }));
      setMismatched(prev => {
          const next = { ...prev };
          delete next[wordId]; // Clear any previous error state
          return next;
      });
      setScore(prev => prev + 10);
    } else {
      // Incorrect
      setMismatched(prev => ({ ...prev, [wordId]: true }));
      setScore(prev => Math.max(0, prev - 2));
      addIncorrectWord(wordObj);
      
      // Clear red mismatch after a moment
      setTimeout(() => {
          setMismatched(prev => {
              const next = { ...prev };
              delete next[wordId];
              return next;
          });
      }, 1000);
    }
  };

  const handleRestart = () => {
      setScore(0);
      setRoundsCompleted(0);
      setTimer(gameDuration);
      setIsGameOver(false);
      
      // Reset pool
      const freshRemaining = [...activePool];
      setRemaining(freshRemaining);
      dealCards(freshRemaining);
  };

  // Sync Final Score
  useEffect(() => {
    if (isGameOver) setTotalScore(prev => prev + score);
  }, [isGameOver, score, setTotalScore]);

  return (
    <div className="game-area-matching">
        {/* Header Bar */}
        <div className="game-header-bar">
            <button onClick={() => navigate(-1)} className="back-button">← Back</button>
            <div className="game-stats-container">
                <div className="stat-box score-display">Score: {score}</div>
                <div className="stat-box timer-display">Time: {timer}s</div>
                <div className="stat-box question-counter">Rounds: {roundsCompleted}</div>
            </div>
        </div>

        {/* Game Grid */}
        <div className="matching-grid-container">
            {/* Syriac Column */}
            <div className="matching-column">
                {shuffledSyriac.map(word => 
                   !matched[word.id] ? (
                    <DraggableWord 
                        key={word.id} 
                        word={word} 
                        mismatched={mismatched[word.id]} 
                        getSyriacText={getSyriacText}
                    />
                   ) : (
                       // Placeholder to keep layout stable
                       <div key={word.id} className="matching-card-placeholder"></div>
                   )
                )}
            </div>
            
            {/* English Column */}
            <div className="matching-column">
                {shuffledEnglish.map(target => 
                    <DroppableTarget 
                        key={target.id} 
                        target={target} 
                        onDrop={handleDrop} 
                        matched={matched[target.id]}
                        mismatched={mismatched[target.id]}
                        isGameOver={isGameOver}
                    />
                )}
            </div>
        </div>

        {/* Game Over Modal */}
        {isGameOver && (
        <div className="results-box">
          <h2>Game Over!</h2>
          <p>Final Score: {score}</p>
          <p>Rounds Completed: {roundsCompleted}</p>
          <button className="restart-button" onClick={handleRestart}>Play Again</button>
          <br/><br/>
          <button className="restart-button" style={{backgroundColor: '#6c757d'}} onClick={() => navigate('/summary')}>Finish Session</button>
        </div>
      )}
    </div>
  );
}