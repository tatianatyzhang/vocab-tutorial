import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import './FallingWords.css';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../App';

const SPAWN_INTERVAL = 5000; // spawn a new word every 5 seconds
const MAX_WORDS_ON_SCREEN = 7;

const FallingWordsGame = ({
  themeOrPosSelection,
  selectionType,
  problemCount,
}) => {
  const navigate = useNavigate();
  const { addIncorrectWord, setTotalScore } = useSession();

  const [vocab, setVocab] = useState([]);             // full filtered CSV data, shaped
  const [remaining, setRemaining] = useState([]);     // words not yet spawned
  const [words, setWords] = useState([]);             // currently falling on screen
  const [score, setScore] = useState(0);
  const [wordCounter, setWordCounter] = useState(problemCount);
  const [message, setMessage] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);
  const [timer, setTimer] = useState(60);
  const [input, setInput] = useState('');
  const { reviewWords } = useSession();

  const lastSpawnRef = useRef(Date.now());
  const intervalRef = useRef();
  const inputRef = useRef();

  // ────────────────────────────────────────────────────────────────────────────────
  // 1️⃣ Load CSV & initialize vocab + remaining. Also clamp wordCounter.
  // ────────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectionType === 'review') {
      setVocab(reviewWords);
      setRemaining(reviewWords.slice());
      setWordCounter(Math.min(reviewWords.length, problemCount));
    }
  }, [selectionType, reviewWords]);
  
  useEffect(() => {
    if (selectionType === 'review') return;
    Papa.parse('/vocab_list.csv', {
      header: true,
      download: true,
      complete: (results) => {
        // 1a) Filter raw rows by theme/pos if necessary
        let filtered = results.data.filter(r => r.English && r.Syriac);
        if (selectionType === 'theme' && themeOrPosSelection) {
          filtered = filtered.filter(
            row => row['Vocabulary Category'] === themeOrPosSelection.label
          );
        } else if (selectionType === 'pos' && themeOrPosSelection) {
          filtered = filtered.filter(
            row => row['Grammatical Category'] === themeOrPosSelection.label
          );
        }

        // 1b) “Shape” each row so that it has id, Syriac, English (lowercased)
        const shaped = filtered.map((r, idx) => ({
          id: idx,
          Syriac: r.Syriac,
          English: r.English.trim().toLowerCase(),
        }));

        setVocab(shaped);
        setRemaining(shaped.slice()); // clone to avoid mutating vocab directly

        // 1c) Clamp wordCounter to the actual pool size
        setWordCounter(Math.min(shaped.length, problemCount));
      },
    });
  }, [selectionType, themeOrPosSelection, problemCount]);

  // ────────────────────────────────────────────────────────────────────────────────
  // 2️⃣ Count down timer
  // ────────────────────────────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────────────────────────────
  // 3️⃣ When game ends, add score + timer to total
  // ────────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isGameOver) {
      setTotalScore(prev => prev + score + timer);
    }
  }, [isGameOver, score, timer, setTotalScore]);

  // ────────────────────────────────────────────────────────────────────────────────
  // 4️⃣ “Initial Spawn” effect:
  //    As soon as `remaining` is repopulated (e.g. on restart or CSV load),
  //    and if there are no words currently on screen yet, pop exactly one word.
  // ────────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (vocab.length === 0 || isGameOver) return;

    // Only spawn if there’s something in `remaining` and nothing is currently falling.
    if (remaining.length > 0 && words.length === 0) {
      const idx0 = Math.floor(Math.random() * remaining.length);
      const next = remaining[idx0];
      setRemaining(prev => prev.filter((_, i) => i !== idx0));

      setWords([{
        id: Date.now() + Math.random(),
        syriac: next.Syriac,
        english: next.English,
        x: Math.random() * 90,
        y: 0,
        speed: 0.05 + Math.random() * 0.02,
      }]);
      lastSpawnRef.current = Date.now();
    }

    // If remaining is now empty, end the game immediately
    if (remaining.length === 0 && words.length === 0) {
      setIsGameOver(true);
    }
  }, [remaining, isGameOver, words.length]);

  // ────────────────────────────────────────────────────────────────────────────────
  // 5️⃣ “Falling + Periodic Spawn” effect:
  //    Runs a 50 ms loop that
  //      • moves all words downward,
  //      • marks missed words when y >= 90,
  //      • and every SPAWN_INTERVAL ms, pops one more from `remaining`.
  // ────────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (vocab.length === 0 || isGameOver) return;

    const id = setInterval(() => {
      setWords(prevWords => {
        const now = Date.now();
        let moved = prevWords
          .map(word => ({ ...word, y: word.y + word.speed }))
          .filter(word => {
            if (word.y >= 90) {
              // Missed word
              addIncorrectWord(word);
              setScore(s => s - 5);
              setMessage('Missed it! ' + word.english);
              setTimeout(() => setMessage(''), 500);
              setWordCounter(wc => wc - 1);
              return false;
            }
            return true;
          });

        // Every SPAWN_INTERVAL ms, if we have room, add another word from `remaining`
        if (
          now - lastSpawnRef.current >= SPAWN_INTERVAL &&
          moved.length < MAX_WORDS_ON_SCREEN
        ) {
          if (remaining.length > 0) {
            const idx = Math.floor(Math.random() * remaining.length);
            const next = remaining[idx];
            setRemaining(r => r.filter((_, i) => i !== idx));

            moved.push({
              id: Date.now() + Math.random(),
              syriac: next.Syriac,
              english: next.English,
              x: Math.random() * 90,
              y: 0,
              speed: 0.05 + Math.random() * 0.02,
            });
            lastSpawnRef.current = now;
          } else {
            // No more in “remaining” → end the game
            setIsGameOver(true);
          }
        }

        return moved;
      });
    }, 50);

    return () => clearInterval(id);
  }, [vocab, isGameOver, remaining.length, addIncorrectWord]);

  // ────────────────────────────────────────────────────────────────────────────────
  // 6️⃣ If the user has typed or missed enough words, end the game
  // ────────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (wordCounter <= 0) {
      setIsGameOver(true);
    }
  }, [wordCounter]);

  // ────────────────────────────────────────────────────────────────────────────────
  // 7️⃣ User typing logic
  // ────────────────────────────────────────────────────────────────────────────────
  const handleInput = (value) => {
    setWords(prevWords => {
      const match = prevWords.find(word =>
        word.english.split(/[,;\s]+/).includes(value)
      );
      if (match) {
        setScore(s => s + 10);
        setInput('');
        setWordCounter(wc => wc - 1);
        setMessage('Correct! ' + match.english);
        setTimeout(() => setMessage(''), 500);
        return prevWords.filter(w => w.id !== match.id);
      } else {
        setScore(s => s - 5);
      }
      return prevWords;
    });
  };

  // ────────────────────────────────────────────────────────────────────────────────
  // 8️⃣ Restart button: reset all state and refill `remaining`. That will trigger
  //    both effect 4 (“initial spawn”) and effect 5 (the 50 ms interval).
  // ────────────────────────────────────────────────────────────────────────────────
  const restartGame = () => {
    setScore(0);
    setInput('');
    setWords([]);
    setWordCounter(problemCount);
    setTimer(60);
    setIsGameOver(false);

    lastSpawnRef.current = Date.now();
    setRemaining(vocab.slice());
  };

  return (
    <div className="game-area">
      <button
        onClick={() => navigate(-1)}
        className="back-button"
      >
        ← Back to Game Options
      </button>

      <button
        className="timer-button"
        style={{ backgroundColor: getTimerButtonColor(timer) }}
        disabled={timer <= 0 || isGameOver}
      >
        Time Remaining: {timer} sec
      </button>

      <div className="score-button">Score: {score}</div>
      <div className="word-counter">Words Remaining: {wordCounter}</div>
      {message && <div className="message">{message}</div>}

      <input
        ref={inputRef}
        className="type-box"
        value={input}
        onChange={(e) => setInput(e.target.value.toLowerCase().trim())}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleInput(input);
            setInput('');
          }
        }}
        placeholder="Type English translation..."
        autoFocus
      />

      <button
        className="restart-button"
        onClick={restartGame}
      >
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

      {isGameOver && (
        <div className="results-box">
          <h2>Game Over!</h2>
          <p>Base Score: {score}</p>
          <p>
            <strong>+</strong> Time Bonus: {timer} sec
          </p>
          <p>Final Score: {score + timer}</p>
        </div>
      )}
    </div>
  );
};

function getTimerButtonColor(timer) {
  if (timer > 30) return '#1a732f';
  if (timer > 10) return '#ff9407';
  return '#dc3545';
}

export default FallingWordsGame;