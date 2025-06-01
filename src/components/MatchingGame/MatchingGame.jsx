import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { useDrag, useDrop } from "react-dnd";
import './MatchingGame.css';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../App';

// Utility to shuffle an array
const shuffleArray = array => [...array].sort(() => Math.random() - 0.5);

// Draggable Syriac word component
const DraggableWord = ({ word, mismatched }) => {
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
      {word.Syriac}
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
export default function MatchingGame({ selectionType, themeOrPosSelection, problemCount }) {
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
        .filter(r => r.English && r.Syriac)
        .map((r, idx) => ({
          id: idx,
          Syriac: r.Syriac,
          English: r.English,
          posCategory: r['Grammatical Category'],      // part‑of‑speech
          vocabCategory: r['Vocabulary Category'], 
        }));
        setVocabulary(rows);
      }
    });
  }, []);

  // Filter, limit by problemCount, then shuffle

// MatchingGame.jsx (excerpt of initGame)

const initGame = () => {
  if (selectionType === 'review') {
    // reviewWords = [{ Sy­riac: "...", English: "..." }, ...]
    // Map them into the shape MatchingGame expects:
    let pool = reviewWords.map((w, idx) => ({
      id: idx,             // use the index as a unique ID
      Syriac: w.Syriac,
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
  
  if (selectionType === 'theme' && themeOrPosSelection) {
    pool = vocabulary.filter(
      r => r.vocabCategory === themeOrPosSelection.label // Filters out words
    );
  } else if (selectionType === 'pos' && themeOrPosSelection) {
    pool = vocabulary.filter(
      r => r.posCategory === themeOrPosSelection.label
    );
  }

  pool = shuffleArray(pool);
  pool = pool.slice(0, problemCount);

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
  }), [matched, mismatched, shuffledSyriac.length];

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
              <DraggableWord key={word.id} word={word} mismatched={mismatched[word.id]} />
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