import React, { useState, useEffect, useRef } from 'react';
import Balloon from './Balloon';
import Papa from 'papaparse';
import './BalloonGame.css';
import { useNavigate } from 'react-router-dom';

const NUM_OPTIONS = 5;

export default function BalloonGame({
  gameType,
  selectionType,
  themeOrPosSelection,
  frequency,
  vocalization,
  problemCount,
}) {
  const navigate = useNavigate();

  // State for full vocabulary and filtered remaining pool
  const [vocabulary, setVocabulary] = useState([]);
  const [remaining, setRemaining] = useState([]);

  // Current question and balloons
  const [question, setQuestion] = useState(null);
  const [balloons, setBalloons] = useState([]);

  // UI state
  const [message, setMessage] = useState('');
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(60);
  // Words left = number of unique questions remaining
  const [wordCounter, setWordCounter] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const hasMissedRef = useRef(false);
  const [justRestarted, setJustRestarted] = useState(false);

  // 1️⃣ Load CSV once
  useEffect(() => {
    Papa.parse('/vocab_list.csv', {
      header: true,
      download: true,
      complete: ({ data }) => setVocabulary(data.filter(r => r.English))
    });
  }, []);

  // 2️⃣ Rebuild remaining pool on vocabulary or mode change
  useEffect(() => {
    if (!vocabulary.length) return;

    let pool = vocabulary;
    if (selectionType === 'theme' && themeOrPosSelection) {
      pool = vocabulary.filter(
        r => r['Vocabulary Category'] === themeOrPosSelection.label
      );
    } else if (selectionType === 'pos' && themeOrPosSelection) {
      pool = vocabulary.filter(
        r => r['Grammatical Category'] === themeOrPosSelection.label
      );
    }

    setRemaining(pool);
    // Initialize words left to the number of unique items available (capped by problemCount)
    setWordCounter(Math.min(problemCount, pool.length));
    setScore(0);
    setTimer(60);
    setIsGameOver(false);
    setJustRestarted(true);
  }, [vocabulary, selectionType, themeOrPosSelection, problemCount]);

  // 3️⃣ Generate first question when pool ready or after restart
  useEffect(() => {
    if (remaining.length > 0 && (question === null || justRestarted)) {
      generateQuestion();
      setJustRestarted(false);
    }
  }, [remaining, justRestarted]);

  // Timer effect
  useEffect(() => {
    if (timer <= 0 || isGameOver || wordCounter <= 0) return;

    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          endGame();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer, isGameOver, wordCounter]);

  const endGame = () => setIsGameOver(true);

  // Draw one question from remaining
  const generateQuestion = () => {
    if (remaining.length === 0 || isGameOver) {
      endGame();
      return;
    }

    const idx = Math.floor(Math.random() * remaining.length);
    const nextRow = remaining[idx];
    setRemaining(rs => rs.filter((_, i) => i !== idx));

    setQuestion(nextRow);
    hasMissedRef.current = false;

    const options = generateOptions(nextRow);
    generateBalloons(options);
  };

  // Build answer options
  const generateOptions = (correctRow) => {
    let sameGroup;
    if (selectionType === 'theme') {
      sameGroup = vocabulary.filter(
        r => r.English !== correctRow.English &&
             r['Vocabulary Category'] === correctRow['Vocabulary Category']
      );
    } else if (selectionType === 'pos') {
      sameGroup = vocabulary.filter(
        r => r.English !== correctRow.English &&
             r['Grammatical Category'] === correctRow['Grammatical Category']
      );
    } else {
      sameGroup = vocabulary.filter(r => r.English !== correctRow.English);
    }

    const distractors = [];
    const used = new Set();
    while (distractors.length < NUM_OPTIONS - 1 && sameGroup.length) {
      const i = Math.floor(Math.random() * sameGroup.length);
      const w = sameGroup[i].English;
      if (!used.has(w)) {
        used.add(w);
        distractors.push(w);
      }
    }

    return [correctRow.English, ...distractors]
      .sort(() => Math.random() - 0.5);
  };

  // Create balloons for options
  const generateBalloons = (options) => {
    const gap = 100 / (options.length + 1);
    setBalloons(options.map((opt, i) => ({
      id: Date.now() + Math.random() + i,
      baseX: (i + 1) * gap,
      x:     (i + 1) * gap,
      phase: Math.random() * 2 * Math.PI,
      y:     0,
      speed: 0.3 + Math.random() * 0.1,
      popped:false,
      label: opt,
    })));
  };

  // Balloon motion effect
  useEffect(() => {
    if (isGameOver) return;

    const interval = setInterval(() => {
      const heightPercent = (130 / window.innerHeight) * 100;
      const time = Date.now();

      setBalloons(prev => {
        const moved = prev.map(b => ({
          ...b,
          y: b.y + b.speed,
          x: b.baseX + Math.sin(time/1000 + b.phase)*2,
        }));

        const hit = moved.some(b => b.y + heightPercent >= 100);
        if (hit && !hasMissedRef.current) {
          hasMissedRef.current = true;
          setScore(s => s - 5);
          setMessage('Too slow! -5');
          // no decrement here
          setTimeout(() => { setMessage(''); generateQuestion(); }, 500);
        }

        return moved.filter(b => b.y + heightPercent < 110);
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isGameOver, remaining.length]);

  // Handle popping a balloon
  const popBalloon = (id) => {
    if (isGameOver) return;
    const p = balloons.find(b => b.id === id);
    if (!p) return;

    if (p.label === question.English) {
      setScore(s => s + 10);
      setWordCounter(wc => wc - 1);
      setMessage('Correct! +10');
    } else {
      setScore(s => s - 5);
      setMessage('Incorrect! -5');
      // no decrement on incorrect
    }

    setBalloons(bs => bs.map(b => b.id === id ? { ...b, popped: true } : b));
    setTimeout(() => {
      setBalloons(bs => bs.filter(b => b.id !== id));
      setMessage('');
      if (p.label === question.English) generateQuestion();
    }, p.label === question.English ? 500 : 1500);
  };

  // Restart game
  const restartGame = () => {
    // rebuild the pool exactly as you do on initial load:
    let pool = vocabulary;
    if (selectionType === 'theme' && themeOrPosSelection) {
      pool = pool.filter(r => r['Vocabulary Category'] === themeOrPosSelection.label);
    } else if (selectionType === 'pos' && themeOrPosSelection) {
      pool = pool.filter(r => r['Grammatical Category'] === themeOrPosSelection.label);
    }
    pool = pool.slice(0, problemCount);
  
    setRemaining(pool);
    setWordCounter(pool.length);
    setScore(0);
    setTimer(60);
    setIsGameOver(false);
    setJustRestarted(true);
  };

  // Timer button color
  const getTimerButtonColor = () => {
    if (timer > 30) return '#1a732f';
    if (timer > 10) return '#ff9407';
    return '#dc3545';
  };

  return (
    <div className="game-area">
      <button onClick={() => navigate(-1)} className="back-button">← Back</button>
      <button className="score-button">Score: {score}</button>
      <button
        className="timer-button"
        style={{ backgroundColor: getTimerButtonColor() }}
        disabled={timer <= 0 || isGameOver}
      >
        Time Remaining: {timer} sec
      </button>
      <button className="restart-button" onClick={restartGame}>Restart Game</button>
      <div className="word-counter">Words Left: {wordCounter}</div>

      {!isGameOver && balloons.map(b => (
        <Balloon key={b.id} balloon={b} onClick={() => popBalloon(b.id)} />
      ))}

      {isGameOver && (
        <div className="results-box">
          <h2>Game Over!</h2>
          <p>Base Score: {score}</p>
          <p><strong>+</strong> Time Bonus: {timer} sec</p>
          <p>Final Score: {score + timer}</p>
        </div>
      )}

      {message && <div className="message">{message}</div>}
      {question && <div className="question"><h1>{question.Syriac}</h1></div>}
    </div>
  );
}
