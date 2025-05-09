import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import './FallingWords.css';
import { useNavigate } from 'react-router-dom';

const SPAWN_INTERVAL = 5000; // spawn a new word every 5 seconds

const FallingWordsGame = ({ 
  themeOrPosSelection,
  selectionType, 
  problemCount,
}) => {
  const navigate = useNavigate();
  const [words, setWords] = useState([]);
  const [vocab, setVocab] = useState([]);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [wordCounter, setWordCounter] = useState(problemCount);
  const inputRef = useRef();
  const lastSpawnRef = useRef(Date.now());

  useEffect(() => {
    Papa.parse('/vocab_list.csv', {
      header: true,
      download: true,
      complete: (results) => {
        let filtered = results.data;
        if (selectionType.value === 'theme' && themeOrPosSelection) {
          filtered = filtered.filter(
            row => row['Vocabulary Category'] === themeOrPosSelection.label
          );
        } else if (selectionType.value === 'pos' && themeOrPosSelection) {
          filtered = filtered.filter(
            row => row['Grammatical Category'] === themeOrPosSelection.label
          );
        }
        setVocab(filtered);
        startWordDrop(filtered);
      },
    });
  }, [selectionType, themeOrPosSelection]);

  const startWordDrop = (data) => {
    const first = data[Math.floor(Math.random() * data.length)];
    const initialWord = {
      id: Date.now() + Math.random(),
      syriac: first.Syriac,
      english: first.English.trim().toLowerCase(),
      x: Math.random() * 90,
      y: 0,
      speed: 0.05 + Math.random() * 0.02,
    };
    setWords([initialWord]);
    lastSpawnRef.current = Date.now();

    const interval = setInterval(() => {
      setWords(prev => {
        const now = Date.now();
        let moved = prev
          .map(word => ({ ...word, y: word.y + word.speed }))
          .filter(word => {
            if (word.y >= 90) {
              setScore(s => s - 1);
              setWordCounter(wc => wc - 1);
              return false;
            }
            return true;
          });

        // spawn a new word every SPAWN_INTERVAL ms
        if (now - lastSpawnRef.current >= SPAWN_INTERVAL && moved.length < wordCounter) {
          const random = data[Math.floor(Math.random() * data.length)];
          moved.push({
            id: Date.now() + Math.random(),
            syriac: random.Syriac,
            english: random.English.trim().toLowerCase(),
            x: Math.random() * 90,
            y: 0,
            speed: 0.05 + Math.random() * 0.02,
          });
          lastSpawnRef.current = now;
        }

        return moved;
      });
    }, 50);

    return () => clearInterval(interval);
  };

  const handleInput = (e) => {
    const value = e.target.value.toLowerCase().trim();
    setInput(value);

    setWords(prev => {
      const match = prev.find(word =>
        word.english.split(/[,;\s]+/).includes(value)
      );
      if (match) {
        setScore(s => s + 1);
        setInput('');
        setWordCounter(wc => wc - 1);
        return prev.filter(w => w.id !== match.id);
      }
      return prev;
    });
  };

  const restartGame = () => {
    setScore(0);
    setInput('');
    setWords([]);
    setWordCounter(problemCount);
    lastSpawnRef.current = Date.now();
    startWordDrop(vocab);
  };

  useEffect(() => {
    if (wordCounter <= 0) {
      restartGame();
    }
  }, [wordCounter]);

  return (
    <div className="game-area">
      <button onClick={() => navigate(-1)} className="back-button">← Back</button>
      <div className="score-button">Score: {score}</div>
      <div className="word-counter">Words Remaining: {wordCounter}</div>
      <input
        ref={inputRef}
        className="type-box"
        value={input}
        onChange={handleInput}
        placeholder="Type English translation..."
        autoFocus
      />
      <button className="restart-button" onClick={restartGame}>
        Restart Game
      </button>
      {words.map(word => (
        <div
          key={word.id}
          className="falling-word"
          style={{ top: `${word.y}%`, left: `${word.x}%` }}
        >
          {word.syriac}
        </div>
      ))}
    </div>
  );
};

export default FallingWordsGame;