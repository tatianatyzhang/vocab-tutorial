import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { useDrag, useDrop } from "react-dnd";
import './MatchingGame.css';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../App';

// Utility to shuffle an array
const shuffleArray = array => [...array].sort(() => Math.random() - 0.5);

// Helper function to match POS selection with CSV values
const matchPosValue = (selectedValue, csvValue) => {
  if (!selectedValue || !csvValue) return false;
  
  // Direct match
  if (selectedValue === csvValue) return true;
  
  // Case-insensitive match
  if (selectedValue.toLowerCase() === csvValue.toLowerCase()) return true;
  
  // Handle plural/singular variations
  const selectedLower = selectedValue.toLowerCase();
  const csvLower = csvValue.toLowerCase();
  
  // Common POS mappings
  const posMapping = {
    'nounadj': ['noun', 'nouns', 'nounadj', 'n'],
    'adverb': ['adverb', 'adverbs', 'adv'],
    'proper noun': ['proper noun', 'proper nouns', 'propernoun'],
    'particle': ['particle', 'particles', 'conjunction', 'conjunctions', 'conj'],
    'prep': ['prep', 'preposition', 'prepositions'],
    'pronouns': ['pronoun', 'pronouns', 'pron'],
    'verbs': ['verb', 'verbs', 'v']
  };
  
  // Check if selected value maps to CSV value
  if (posMapping[selectedLower] && posMapping[selectedLower].includes(csvLower)) {
    return true;
  }
  
  // Check reverse mapping
  for (const [key, values] of Object.entries(posMapping)) {
    if (values.includes(selectedLower) && (key === csvLower || values.includes(csvLower))) {
      return true;
    }
  }
  
  return false;
};

// Draggable Syriac word component
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
      style={{
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: mismatched ? '#f8d7da' : '#f9f9f9',
        color: mismatched ? '#721c24' : 'black',
        padding: '10px',
        margin: '10px',
        border: '2px solid black',
        cursor: 'grab',
        textAlign: 'center',
        fontSize: '24px',
        fontWeight: 'bold',
        borderRadius: '8px',
        width: '180px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {getSyriacText(word)}
    </div>
  );
};

// Droppable English target component
const DroppableTarget = ({ target, onDrop, matched, mismatched, isGameOver }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'WORD',
    drop: item => onDrop(item.id, target.id),
    canDrop: () => !mismatched,
    collect: monitor => ({ isOver: monitor.isOver() })
  }));

  return (
    <div
      ref={matched || mismatched || isGameOver ? null : drop}
      style={{
        backgroundColor: matched ? '#d4edda' : mismatched ? '#f8d7da' : isOver ? '#ddd' : 'white',
        color: mismatched ? '#721c24' : 'black',
        padding: '10px',
        margin: '10px',
        border: '2px solid black',
        textAlign: 'center',
        fontSize: '20px',
        fontWeight: 'bold',
        borderRadius: '8px',
        width: '180px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {target.English}
    </div>
  );
};

// Main matching game component
export default function MatchingGame({ selectionType, themeOrPosSelection, problemCount, vocalization }) {
  const [vocabulary, setVocabulary] = useState([]);
  const [shuffledSyriac, setShuffledSyriac] = useState([]);
  const [shuffledEnglish, setShuffledEnglish] = useState([]);
  const [matched, setMatched] = useState({});
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(60);
  const navigate = useNavigate();
  const [isGameOver, setIsGameOver] = useState(false);
  const [mismatched, setMismatched] = useState({});
  const { addIncorrectWord, setTotalScore, reviewWords } = useSession();

  // Helper function to get the appropriate Syriac text based on vocalization setting
  const getSyriacText = (row) => {
    if (vocalization) {
      return row['Vocalized Syriac'] || row['Non vocalized Syriac'] || '';
    } else {
      return row['Non vocalized Syriac'] || row['Vocalized Syriac'] || '';
    }
  };

  useEffect(() => {
    if (timer <= 0 || isGameOver) return;

    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsGameOver(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer, isGameOver]);

  // Load CSV once
  useEffect(() => {
    Papa.parse('/vocab_list.csv', {
      header: true,
      download: true,
      complete: ({ data }) => {
        const rows = data
        .filter(r => r.English && (r['Vocalized Syriac'] || r['Non vocalized Syriac']))
        .map((r, idx) => ({
          id: idx,
          'Vocalized Syriac': r['Vocalized Syriac'],
          'Non vocalized Syriac': r['Non vocalized Syriac'],
          English: r.English,
          posCategory: r['Grammatical Category'],      // part‑of‑speech
          vocabCategory: r['Vocabulary Category'], 
        }));
        
        console.log('MatchingGame - Loaded vocabulary:', rows.length);
        console.log('MatchingGame - Available POS categories:', 
          [...new Set(rows.map(r => r.posCategory).filter(Boolean))]);
        
        setVocabulary(rows);
      }
    });
  }, []);

  // Filter, limit by problemCount, then shuffle
  const initGame = () => {
    if (selectionType === 'review') {
      // reviewWords = [{ "Vocalized Syriac": "...", "Non vocalized Syriac": "...", English: "..." }, ...]
      // Map them into the shape MatchingGame expects:
      let pool = reviewWords.map((w, idx) => ({
        id: idx,             // use the index as a unique ID
        'Vocalized Syriac': w['Vocalized Syriac'],
        'Non vocalized Syriac': w['Non vocalized Syriac'],
        English: w.English,
        posCategory: '',     // not used in review mode
        vocabCategory: ''    // not used in review mode
      }));

      // If you have fewer than problemCount review words, slice anyway
      pool = shuffleArray(pool).slice(0, problemCount);
      
      const newSyriac  = shuffleArray(pool);
      const newEnglish = shuffleArray(pool);
      setShuffledSyriac(newSyriac);
      setShuffledEnglish(newEnglish);
      setMatched({});
      setMismatched({});
      setScore(0);
      return;
    }

    // …otherwise (random/theme/pos logic) do your normal `vocabulary` filtering…
    let pool = vocabulary;
    if (!vocabulary.length) return;
    
    console.log('MatchingGame - Starting pool size:', pool.length);
    console.log('MatchingGame - Selection type:', selectionType);
    console.log('MatchingGame - Theme/POS selection:', themeOrPosSelection);
    
    if (selectionType === 'theme' && themeOrPosSelection) {
      const targetTheme = themeOrPosSelection.value || themeOrPosSelection.label;
      pool = vocabulary.filter(
        r => r.vocabCategory === targetTheme
      );
      console.log('MatchingGame - After theme filter for', targetTheme, ':', pool.length);
    } else if (selectionType === 'pos' && themeOrPosSelection) {
      const targetPos = themeOrPosSelection.value || themeOrPosSelection.label;
      console.log('MatchingGame - Filtering for POS:', targetPos);
      
      pool = vocabulary.filter(r => {
        const csvPos = r.posCategory;
        const matches = matchPosValue(targetPos, csvPos);
        if (matches) {
          console.log('MatchingGame - Match found:', targetPos, '<=>', csvPos);
        }
        return matches;
      });
      
      console.log('MatchingGame - After POS filter for', targetPos, ':', pool.length);
      if (pool.length === 0) {
        console.log('MatchingGame - No matches found. Available POS values in CSV:', 
          [...new Set(vocabulary.map(r => r.posCategory).filter(Boolean))]);
      }
    }

    pool = shuffleArray(pool);
    pool = pool.slice(0, problemCount);

    console.log('MatchingGame - Final pool size:', pool.length);

    const newSyriac  = shuffleArray(pool);
    const newEnglish = shuffleArray(pool);

    setShuffledSyriac(newSyriac);
    setShuffledEnglish(newEnglish);
    setMatched({});
    setMismatched({});
    setScore(0);
  };

  useEffect(() => {
    if (vocabulary.length) initGame();
  }, [vocabulary, selectionType, themeOrPosSelection, problemCount]);

  useEffect(() => {
    if (shuffledSyriac.length > 0 &&
      Object.keys(matched).length + Object.keys(mismatched).length === shuffledSyriac.length) {
      setIsGameOver(true);
    }
  }, [matched, mismatched, shuffledSyriac.length]);

  // 3) Now restartGame just calls the same initializer
  const restartGame = () => {
    initGame();
    setTimer(60);
    setIsGameOver(false);
  };

  const handleDrop = (wordId, targetId) => {
    const word = shuffledSyriac.find(w => w.id === wordId);
    if (isGameOver || matched[wordId] || mismatched[wordId]) return;

    if (wordId === targetId) {
      setMatched(prev => ({ ...prev, [wordId]: true }));
      setScore(prev => prev + 5);
    } else {
      setMismatched(prev => ({ ...prev, [wordId]: true}));
      addIncorrectWord(word);
    }
  };

  const getTimerButtonColor = () => {
    if (timer > 30) return '#1a732f';
    if (timer > 10) return '#ff9407';
    return '#dc3545';
  };

  useEffect(() => {
    if (isGameOver) {
      setTotalScore(prev => prev + score + timer);
    }
  }, [isGameOver]);  

  return (
    <div className="game-area">
      <h2>Match Syriac Words to English</h2>
      <button onClick={() => navigate(-1)} className="back-button">← Back to Game Options</button>
      <button
        className="timer-button"
        style={{ backgroundColor: getTimerButtonColor() }}
        disabled={timer <= 0 || isGameOver}
      >
        Time Remaining: {timer} sec
      </button>
      {/* Wrap both sides in a flex row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '60px',          // space between Syriac and English blocks
          marginTop: '55px'
        }}
      >
        {/* Syriac side: flow down then across, 5 items per column */}
        <div
          style={{
            display: 'grid',
            gridAutoFlow: 'column',
            gridTemplateRows: 'repeat(5, auto)',
            gap: '10px'
          }}
        >
          {shuffledSyriac.map(word =>
            !matched[word.id] && (
              <DraggableWord 
                key={word.id} 
                word={word} 
                mismatched={mismatched[word.id]}
                getSyriacText={getSyriacText}
              />
            )
          )}
        </div>
  
        {/* English side: same layout, aligned to the right */}
        <div
          style={{
            display: 'grid',
            gridAutoFlow: 'column',
            gridTemplateRows: 'repeat(5, auto)',
            gap: '10px'
          }}
        >
          {shuffledEnglish.map(target => (
            <DroppableTarget
              key={target.id}
              target={target}
              onDrop={handleDrop}
              matched={matched[target.id]}
              mismatched={mismatched[target.id]}
              isGameOver={isGameOver}
            />
          ))}
        </div>
      </div>
  
      <button className="score-button">Score: {score}</button>
      <button className="restart-button" onClick={restartGame}>Restart Game</button>

      {isGameOver && (
        <div className="results-box">
          <h2>Game Over!</h2>
          <p>Base Score: {score}</p>
          <p><strong>+</strong> Time Bonus: {timer} sec</p>
          <p>Final Score: {score + timer}</p>
        </div>
      )}
    </div>
  );  
}