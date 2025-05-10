import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { useDrag, useDrop } from "react-dnd";
import './MatchingGame.css';

// Utility to shuffle an array
const shuffleArray = array => [...array].sort(() => Math.random() - 0.5);

// Draggable Syriac word component
const DraggableWord = ({ word }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'WORD',
    item: { id: word.id },
    collect: monitor => ({ isDragging: monitor.isDragging() })
  }));

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        padding: '10px',
        margin: '10px',
        border: '2px solid black',
        cursor: 'grab',
        backgroundColor: '#f9f9f9',
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
const DroppableTarget = ({ target, onDrop, matched }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'WORD',
    drop: item => onDrop(item.id, target.id),
    collect: monitor => ({ isOver: monitor.isOver() })
  }));

  return (
    <div
      ref={matched ? null : drop}
      style={{
        padding: '10px',
        margin: '10px',
        border: '2px solid black',
        backgroundColor: matched ? '#d4edda' : isOver ? '#ddd' : 'white',
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
  const initGame = () => {
    if (!vocabulary.length) return;
    let pool = vocabulary;
    console.log('Unfiltered Pool:', pool)
    if (selectionType === 'theme' && themeOrPosSelection) {
      pool = vocabulary.filter(
        r => r.vocabCategory === themeOrPosSelection.label // Filters out words
      );
    } else if (selectionType === 'pos' && themeOrPosSelection) {
      pool = vocabulary.filter(
        r => r.posCategory === themeOrPosSelection.label
      );
    }
    console.log('SelectionType:', selectionType);
    console.log('Filtered Pool without Count:', pool);

    pool = shuffleArray(pool);
    pool = pool.slice(0, problemCount);

    console.log('Filtered Pool with Count:', pool);

    const newSyriac  = shuffleArray(pool);
    const newEnglish = shuffleArray(pool);

    setShuffledSyriac(newSyriac);
    setShuffledEnglish(newEnglish);
    setMatched({});
    setScore(0);
  }

  useEffect(() => {
    if (vocabulary.length) initGame();
  }, [vocabulary, selectionType, themeOrPosSelection, problemCount]);

  // 3) Now restartGame just calls the same initializer
  const restartGame = () => {
    initGame();
  };

  const handleDrop = (wordId, targetId) => {
    if (wordId === targetId && !matched[wordId]) {
      setMatched(prev => ({ ...prev, [wordId]: true }));
      setScore(prev => prev + 1);
    }
  };

  useEffect(() => { // LOOK BACK AT THIS
    console.log('🔤 Syriac IDs:', shuffledSyriac.map(w => w.id));
    console.log('🔤 English IDs:', shuffledEnglish.map(t => t.id));
  }, [shuffledSyriac, shuffledEnglish]);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Match Syriac Words to English</h2>
  
      {/* Wrap both sides in a flex row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '60px',          // space between Syriac and English blocks
          marginTop: '20px'
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
              <DraggableWord key={word.id} word={word} />
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
            />
          ))}
        </div>
      </div>
  
      <h3 style={{ marginTop: '20px' }}>Score: {score}</h3>
      <button onClick={restartGame} style={{ marginTop: '20px', padding: '10px 20px', fontSize: '16px' }}>
        Restart Game
      </button>
    </div>
  );  
}