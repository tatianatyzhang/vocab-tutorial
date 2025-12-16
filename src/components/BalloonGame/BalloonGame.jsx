import React, { useState, useEffect, useRef } from 'react';
import Balloon from './Balloon';
import Papa from 'papaparse';
import './BalloonGame.css';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../App';

const NUM_OPTIONS = 5;

export default function BalloonGame({
  gameType,
  selectionType,
  themeOrPosSelection,
  frequency,
  vocalization,
  gameDuration,
}) {
  const navigate = useNavigate();
  const { addIncorrectWord, setTotalScore, reviewWords } = useSession();

  // State for full vocabulary and current active pool
  const [vocabulary, setVocabulary] = useState([]); // All words from CSV
  const [activePool, setActivePool] = useState([]); // Words matching current filters
  const [remaining, setRemaining] = useState([]);   // Words left to show in this cycle

  // Current question and balloons
  const [question, setQuestion] = useState(null);
  const [balloons, setBalloons] = useState([]);

  // UI state
  const [message, setMessage] = useState('');
  const [score, setScore] = useState(0);
  const [baseSpeed, setBaseSpeed] = useState(0.3);
  const [timer, setTimer] = useState(gameDuration);
  
  // Track total questions answered
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  
  const [isGameOver, setIsGameOver] = useState(false);
  const hasMissedRef = useRef(false);
  const [missedWord, setMissedWord] = useState(null);

  // Helper to match POS strings loosely (e.g. "noun" matches "NounAdj")
  const matchPosValue = (selectedValue, csvValue) => {
    if (!selectedValue || !csvValue) return false;
    const selectedLower = selectedValue.toLowerCase();
    const csvLower = csvValue.toLowerCase();
    
    // Direct match
    if (selectedLower === csvLower) return true;

    // Mapping for loose matching
    const posMapping = {
      'nouns': ['noun', 'nouns', 'n', 'nounadj'],
      'verbs': ['verb', 'verbs', 'v'],
      'adjectives': ['adjective', 'adjectives', 'adj'],
      'adverbs': ['adverb', 'adverbs', 'adv'],
      'pronouns': ['pronoun', 'pronouns', 'pron'],
      'prepositions': ['preposition', 'prepositions', 'prep'],
      'conjunctions': ['conjunction', 'conjunctions', 'conj', 'particle']
    };

    // Check mapping
    for (const [key, values] of Object.entries(posMapping)) {
      if (values.includes(selectedLower) && (key === csvLower || values.includes(csvLower))) {
        return true;
      }
    }
    return false;
  };

  // 1. Load CSV Data
  useEffect(() => {
    if (selectionType === 'review') {
      // For review mode, we don't need the CSV, we use context data
      // Normalize review words to match CSV structure just in case
      const reviewData = reviewWords.map((w, i) => ({
        ...w,
        id: i,
        // Ensure keys match what the game expects
        English: w.English,
        'Vocalized Syriac': w['Vocalized Syriac'] || w.Syriac,
        'Non vocalized Syriac': w['Non vocalized Syriac'],
        'Grammatical Category': w['Grammatical Category'] || '',
        'Vocabulary Category': w['Vocabulary Category'] || '',
        Frequency: w.Frequency || 1
      }));
      setVocabulary(reviewData);
      setActivePool(reviewData);
      setRemaining([...reviewData]);
    } else {
      Papa.parse('vocab_list.csv', {
        header: true,
        download: true,
        complete: ({ data }) => {
          // Filter out empty rows
          const validRows = data.filter(r => 
            r.English && 
            (r['Vocalized Syriac'] || r['Non vocalized Syriac'])
          );
          setVocabulary(validRows);
        }
      });
    }
  }, [selectionType, reviewWords]);

  // 2. Initialize / Reset Game Logic based on Filters
  useEffect(() => {
    if (selectionType === 'review' || vocabulary.length === 0) return;

    let pool = vocabulary;

    // Apply Theme Filter
    if (selectionType === 'theme' && themeOrPosSelection) {
      const targetTheme = themeOrPosSelection.value || themeOrPosSelection.label;
      pool = pool.filter(r => r['Vocabulary Category'] === targetTheme);
    } 
    // Apply POS Filter
    else if (selectionType === 'pos' && themeOrPosSelection) {
      const targetPos = themeOrPosSelection.value || themeOrPosSelection.label;
      pool = pool.filter(r => matchPosValue(targetPos, r['Grammatical Category']));
    }

    // Apply Frequency Filter (Crucial Fix: Parse Int)
    if (selectionType === 'random' || selectionType === 'theme') {
      const minFreq = parseInt(frequency.min, 10);
      const maxFreq = parseInt(frequency.max, 10);
      
      if (!isNaN(minFreq) && !isNaN(maxFreq)) {
        pool = pool.filter(r => {
          // Remove commas if present in CSV frequency column
          const rawFreq = (r.Frequency || '0').toString().replace(/,/g, '');
          const val = parseInt(rawFreq, 10);
          return val >= minFreq && val <= maxFreq;
        });
      }
    }

    if (pool.length === 0) {
      console.warn("No words found matching criteria.");
    }

    setActivePool(pool);
    setRemaining([...pool]);
    setScore(0);
    setQuestionsAnswered(0);
    setTimer(gameDuration);
    setIsGameOver(false);
    setQuestion(null);
  }, [vocabulary, selectionType, themeOrPosSelection, frequency, gameDuration]);

  // 3. Generate Question Loop
  useEffect(() => {
    if (isGameOver || activePool.length === 0) return;

    // If we have no question, OR we need a new one
    if (!question) {
      generateNewQuestion();
    }
  }, [question, isGameOver, activePool, remaining]);

  const generateNewQuestion = () => {
    // If remaining pool is empty, refill it from activePool (Infinite play)
    let currentRemaining = remaining;
    if (currentRemaining.length === 0) {
      currentRemaining = [...activePool];
      // If still empty (e.g. no words matched filters), stop
      if (currentRemaining.length === 0) return;
    }

    const idx = Math.floor(Math.random() * currentRemaining.length);
    const nextWord = currentRemaining[idx];

    // Remove from remaining so we don't repeat immediately in this cycle
    const newRemaining = currentRemaining.filter((_, i) => i !== idx);
    setRemaining(newRemaining);

    setQuestion(nextWord);
    hasMissedRef.current = false;
    
    // Generate balloons
    const options = generateOptions(nextWord, activePool);
    generateBalloons(options);
  };

  const generateOptions = (targetWord, pool) => {
    const correctDef = targetWord.English;
    const distractors = [];
    const usedDefs = new Set([correctDef]);

    // Try to find distractors with same POS if possible
    const samePosPool = pool.filter(r => 
      r['Grammatical Category'] === targetWord['Grammatical Category'] &&
      r.English !== correctDef
    );

    // Pick random distractors
    while (distractors.length < NUM_OPTIONS - 1) {
      let candidatePool = samePosPool.length > 5 ? samePosPool : pool;
      if (candidatePool.length === 0) break; // Should not happen if pool > 1

      const randIndex = Math.floor(Math.random() * candidatePool.length);
      const randomWord = candidatePool[randIndex];
      
      if (randomWord.English && !usedDefs.has(randomWord.English)) {
        usedDefs.add(randomWord.English);
        distractors.push(randomWord.English);
      }
      
      // Safety break to prevent infinite loops if pool is tiny
      if (usedDefs.size >= pool.length && usedDefs.size < NUM_OPTIONS) break;
    }

    return [correctDef, ...distractors].sort(() => Math.random() - 0.5);
  };

  const generateBalloons = (options) => {
    const gap = 100 / (options.length + 1);
    const newBalloons = options.map((opt, i) => ({
      id: Date.now() + i,
      baseX: (i + 1) * gap,
      x: (i + 1) * gap,
      phase: Math.random() * 2 * Math.PI,
      y: -20, // Start slightly below screen
      speed: baseSpeed + Math.random() * 0.15,
      popped: false,
      label: opt,
    }));
    setBalloons(newBalloons);
  };

  // 4. Game Loop (Timer & Animation)
  useEffect(() => {
    if (timer <= 0 || isGameOver) return;
    const interval = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(interval);
          setIsGameOver(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timer, isGameOver]);

  useEffect(() => {
    if (isGameOver) return;
    const animInterval = setInterval(() => {
      // 100% is top of screen, balloons float UP usually (y increases)
      // wait, CSS usually maps bottom: y%. 
      // If we want them to float UP, y goes 0 -> 100.
      
      setBalloons(prev => {
        // Move balloons
        const moved = prev.map(b => ({
          ...b,
          y: b.y + b.speed, 
          x: b.baseX + Math.sin(Date.now() / 1000 + b.phase) * 2
        }));

        // Check if correct answer floated off top (missed)
        const missed = moved.some(b => 
          !b.popped && 
          b.y > 110 && // Off screen top
          question && 
          b.label === question.English
        );

        if (missed && !hasMissedRef.current) {
          hasMissedRef.current = true;
          handleMiss();
        }

        return moved.filter(b => b.y < 120); // Keep DOM clean
      });
    }, 50);

    return () => clearInterval(animInterval);
  }, [isGameOver, question, baseSpeed]);

  const handleMiss = () => {
    setScore(s => Math.max(0, s - 5));
    setMessage(`Missed: ${question.English}`);
    if (question) addIncorrectWord(question);
    
    setTimeout(() => {
      setMessage('');
      setQuestionsAnswered(q => q + 1); // Count as done (incorrectly)
      setQuestion(null); // Triggers new question gen
    }, 1000);
  };

  const handlePop = (id, label) => {
    if (isGameOver || !question) return;

    if (label === question.English) {
      // Correct
      setScore(s => s + 10);
      setMessage('Correct!');
    } else {
      // Incorrect balloon
      setScore(s => Math.max(0, s - 5));
      setMessage('Wrong!');
      addIncorrectWord(question);
    }

    // Visual pop
    setBalloons(prev => prev.map(b => b.id === id ? { ...b, popped: true } : b));

    setTimeout(() => {
      setMessage('');
      if (label === question.English) {
        // Only move to next question if they popped the right one
        setQuestionsAnswered(q => q + 1);
        setQuestion(null);
      } else {
        // If wrong balloon, remove it but keep question active? 
        // Typically balloon games let you keep trying or fail if time runs out.
        // Let's remove the popped wrong balloon.
        setBalloons(prev => prev.filter(b => b.id !== id));
      }
    }, 500);
  };

  // Speed scaling
  useEffect(() => {
    setBaseSpeed(0.3 + (questionsAnswered * 0.01));
  }, [questionsAnswered]);

  // 5. Final Score Calculation
  useEffect(() => {
    if (isGameOver) {
      setTotalScore(prev => prev + score);
    }
  }, [isGameOver, score, setTotalScore]);

  const getSyriacText = (row) => {
    if (!row) return '';
    if (vocalization) {
      return row['Vocalized Syriac'] || row['Non vocalized Syriac'] || '';
    } else {
      return row['Non vocalized Syriac'] || row['Vocalized Syriac'] || '';
    }
  };

  const handleRestart = () => {
    setScore(0);
    setQuestionsAnswered(0);
    setTimer(gameDuration);
    setIsGameOver(false);
    setRemaining([...activePool]);
    setQuestion(null);
  };

  return (
    <div className="game-area">
      <div className="game-header-bar">
        <button onClick={() => navigate(-1)} className="back-button">← Back</button>
        <div className="game-stats-container">
            <div className="stat-box score-display">Score: {score}</div>
            <div className="stat-box timer-display">Time: {timer}s</div>
            <div className="stat-box question-counter">Question: {questionsAnswered + 1}</div>
        </div>
      </div>

      {!isGameOver && balloons.map(b => (
        <Balloon 
            key={b.id} 
            balloon={b} 
            onClick={() => !b.popped && handlePop(b.id, b.label)} 
        />
      ))}

      {message && <div className="message">{message}</div>}
      
      {question && (
          <div className="question">
              {getSyriacText(question)}
          </div>
      )}

      {isGameOver && (
        <div className="results-box">
          <h2>Game Over!</h2>
          <p>Final Score: {score}</p>
          <button className="restart-button" onClick={handleRestart}>Play Again</button>
          <br/><br/>
          <button className="restart-button" style={{backgroundColor: '#6c757d'}} onClick={() => navigate('/summary')}>Finish Session</button>
        </div>
      )}
    </div>
  );
}