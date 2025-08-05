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
  const [baseSpeed, setBaseSpeed] = useState(0.3);
  const [timer, setTimer] = useState(60);
  // Words left = number of unique questions remaining
  const [wordCounter, setWordCounter] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const hasMissedRef = useRef(false);
  const [justRestarted, setJustRestarted] = useState(false);
  const [missedWord, setMissedWord] = useState(null);
  const { addIncorrectWord, setTotalScore, reviewWords } = useSession();

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
      'nouns': ['noun', 'nouns', 'n'],
      'verbs': ['verb', 'verbs', 'v'],
      'adjectives': ['adjective', 'adjectives', 'adj'],
      'adverbs': ['adverb', 'adverbs', 'adv'],
      'pronouns': ['pronoun', 'pronouns', 'pron'],
      'prepositions': ['preposition', 'prepositions', 'prep'],
      'conjunctions': ['conjunction', 'conjunctions', 'conj']
    };
    
    // Check if selected value maps to CSV value
    if (posMapping[selectedLower] && posMapping[selectedLower].includes(csvLower)) {
      return true;
    }
    
    // Check reverse mapping (if CSV uses plural and selection uses singular)
    for (const [key, values] of Object.entries(posMapping)) {
      if (values.includes(selectedLower) && (key === csvLower || values.includes(csvLower))) {
        return true;
      }
    }
    
    return false;
  };

  useEffect(() => {
    Papa.parse('/vocab_list.csv', {
      header: true,
      download: true,
      complete: ({ data }) => {
        console.log('Raw CSV data sample:', data.slice(0, 3));
        console.log('Available columns:', data.length > 0 ? Object.keys(data[0]) : 'No data');
        
        // Filter for rows that have English definitions and Frequency
        const filtered = data.filter(r => 
          r.English && 
          r.Frequency && 
          (r['Vocalized Syriac'] || r['Non vocalized Syriac'])
        );
        console.log('Filtered vocabulary count:', filtered.length);
        console.log('Filtered sample:', filtered.slice(0, 3));
        
        // Log unique grammatical categories to debug POS filtering
        const uniquePos = [...new Set(filtered
          .map(r => r['Grammatical Category'])
          .filter(pos => pos && pos.trim() !== '')
        )];
        console.log('Unique Grammatical Categories in CSV:', uniquePos);
        
        setVocabulary(filtered);
      }
    });
  }, []);

  // Helper function to get the appropriate Syriac text based on vocalization setting
  const getSyriacText = (row) => {
    if (vocalization) {
      return row['Vocalized Syriac'] || row['Non vocalized Syriac'] || '';
    } else {
      return row['Non vocalized Syriac'] || row['Vocalized Syriac'] || '';
    }
  };

  // Rebuild remaining pool on vocabulary or mode change
  useEffect(() => {
    if (!vocabulary.length) return;

    let pool = vocabulary;
    console.log('Starting pool size:', pool.length);
    console.log('Selection type:', selectionType);
    console.log('Theme/POS selection:', themeOrPosSelection);
    
    if (selectionType === 'theme' && themeOrPosSelection) {
      const targetTheme = themeOrPosSelection.value || themeOrPosSelection.label;
      pool = vocabulary.filter(
        r => r['Vocabulary Category'] === targetTheme
      );
      console.log('After theme filter for', targetTheme, ':', pool.length);
    } else if (selectionType === 'pos' && themeOrPosSelection) {
      const targetPos = themeOrPosSelection.value || themeOrPosSelection.label;
      console.log('Filtering for POS:', targetPos);
      
      pool = vocabulary.filter(r => {
        const csvPos = r['Grammatical Category'];
        const matches = matchPosValue(targetPos, csvPos);
        if (matches) {
          console.log('Match found:', targetPos, '<=>', csvPos);
        }
        return matches;
      });
      
      console.log('After POS filter for', targetPos, ':', pool.length);
      if (pool.length === 0) {
        console.log('No matches found. Available POS values in CSV:', 
          [...new Set(vocabulary.map(r => r['Grammatical Category']).filter(Boolean))]);
      }
      console.log('Sample filtered words:', pool.slice(0, 3).map(r => ({ 
        english: r.English, 
        pos: r['Grammatical Category'],
        syriac: r['Vocalized Syriac'] || r['Non vocalized Syriac']
      })));
    } else if (selectionType === 'review') {
      pool = reviewWords;
      console.log('Review words:', pool.length);
    }

    // Apply frequency filtering for random and theme modes (not for POS or review)
    if (selectionType === 'random' || selectionType === 'theme') {
      const minFreq = parseInt(frequency.min) || 1;
      const maxFreq = parseInt(frequency.max) || 6000;
      console.log('Frequency range:', minFreq, 'to', maxFreq);
      
      pool = pool.filter(r => {
        const freq = parseInt(r.Frequency);
        return freq >= minFreq && freq <= maxFreq;
      });
      console.log('After frequency filter:', pool.length);
    }

    console.log('Final pool size:', pool.length);
    setRemaining([...pool]); // Create a copy to avoid mutation issues
    // Initialize words left to the number of unique items available (capped by problemCount)
    setWordCounter(Math.min(problemCount, pool.length));
    setScore(0);
    setTimer(60);
    setIsGameOver(false);
    setJustRestarted(true);
  }, [vocabulary, selectionType, themeOrPosSelection, frequency, problemCount]);

  // Generate first question when pool ready or after restart
  useEffect(() => {
    if (remaining.length > 0 && (question === null || justRestarted)) {
      generateQuestion();
      setJustRestarted(false);
    }
  }, [remaining, justRestarted]);

  useEffect(() => {
    setBaseSpeed(0.3 + score * 0.005);
  }, [score]);

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
    console.log('generateQuestion called, wordCounter:', wordCounter, 'remaining:', remaining.length);
    
    if (wordCounter <= 0 || remaining.length === 0 || isGameOver) {
      console.log('Ending game - wordCounter:', wordCounter, 'remaining:', remaining.length, 'isGameOver:', isGameOver);
      endGame();
      return;
    }

    const idx = Math.floor(Math.random() * remaining.length);
    const nextRow = remaining[idx];
    console.log('Selected question:', nextRow);
    setRemaining(rs => rs.filter((_, i) => i !== idx));

    setQuestion(nextRow);
    hasMissedRef.current = false;

    const options = generateOptions(nextRow);
    console.log('Generated options:', options);
    generateBalloons(options);
  };

  // Build answer options - using English column
  const generateOptions = (correctRow) => {
    console.log('generateOptions called with:', correctRow);
    
    // Get the correct answer (English definition of the target word)
    const correctDefinition = correctRow.English;
    console.log('Correct definition:', correctDefinition);
    
    if (!correctDefinition) {
      console.error('No English definition found for:', correctRow);
      return [correctRow.English || 'No definition']; // Fallback
    }

    // Find other words with the same part of speech for false answers
    const samePos = vocabulary.filter(
      r => r.English !== correctRow.English &&
           r['Grammatical Category'] === correctRow['Grammatical Category'] &&
           r.English && // Make sure they have English definitions
           r.English !== correctDefinition // Don't duplicate the correct answer
    );

    console.log('Same POS candidates:', samePos.length);

    const distractors = [];
    const used = new Set([correctDefinition]);
    
    // Get distractors from same POS first
    while (distractors.length < NUM_OPTIONS - 1 && samePos.length > 0) {
      const i = Math.floor(Math.random() * samePos.length);
      const definition = samePos[i].English;
      
      if (!used.has(definition) && definition) {
        used.add(definition);
        distractors.push(definition);
      }
      
      // Remove this word from consideration to avoid infinite loop
      samePos.splice(i, 1);
    }

    // If we don't have enough distractors from the same POS, fill with any other definitions
    while (distractors.length < NUM_OPTIONS - 1) {
      const fallbackOptions = vocabulary.filter(
        r => r.English !== correctRow.English && 
             r.English && 
             !used.has(r.English)
      );
      
      if (fallbackOptions.length === 0) break;
      
      const i = Math.floor(Math.random() * fallbackOptions.length);
      const definition = fallbackOptions[i].English;
      if (definition && !used.has(definition)) {
        used.add(definition);
        distractors.push(definition);
      }
    }

    const finalOptions = [correctDefinition, ...distractors]
      .sort(() => Math.random() - 0.5);
    
    console.log('Final options:', finalOptions);
    return finalOptions;
  };

  // Create balloons for options
  const generateBalloons = (options) => {
    console.log('generateBalloons called with:', options);
    
    if (!options || options.length === 0) {
      console.error('No options provided to generateBalloons');
      return;
    }

    const gap = 100 / (options.length + 1);
    const newBalloons = options.map((opt, i) => ({
      id: Date.now() + Math.random() + i,
      baseX: (i + 1) * gap,
      x: (i + 1) * gap,
      phase: Math.random() * 2 * Math.PI,
      y: 0,
      speed: baseSpeed + Math.random() * 0.1,
      popped: false,
      label: opt,
    }));
    
    console.log('Generated balloons:', newBalloons);
    setBalloons(newBalloons);
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
          setTimeout(() => { setMessage(''); generateQuestion(); }, 500);
          setMissedWord(question);
        }

        return moved.filter(b => b.y + heightPercent < 110);
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isGameOver, remaining.length, baseSpeed]);

  useEffect(() => {
    if (missedWord) {
      addIncorrectWord(missedWord);
      setMissedWord(null);
    }
  }, [missedWord, addIncorrectWord]);

  // Handle popping a balloon - checking against English definition
  const popBalloon = (id) => {
    if (isGameOver) return;
    const p = balloons.find(b => b.id === id);
    if (!p || !question) return;

    console.log('Balloon clicked:', p.label);
    console.log('Correct answer:', question.English);

    // Check if the clicked balloon has the correct English definition
    if (p.label === question.English) {
      setScore(s => s + 10);
      setWordCounter(wc => Math.max(0, wc - 1));
      setMessage('Correct! +10');
      setTimeout(() => setMessage(''), 1000);
    } else {
      setScore(s => s - 5);
      setMessage('Incorrect! -5');
      addIncorrectWord(question);
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
    let pool = vocabulary;
    
    if (selectionType === 'theme' && themeOrPosSelection) {
      const targetTheme = themeOrPosSelection.value || themeOrPosSelection.label;
      pool = pool.filter(r => r['Vocabulary Category'] === targetTheme);
    } else if (selectionType === 'pos' && themeOrPosSelection) {
      const targetPos = themeOrPosSelection.value || themeOrPosSelection.label;
      pool = pool.filter(r => matchPosValue(targetPos, r['Grammatical Category']));
    } else if (selectionType === 'review') {
      pool = reviewWords;
    }

    // Apply frequency filtering for random and theme modes
    if (selectionType === 'random' || selectionType === 'theme') {
      const minFreq = parseInt(frequency.min) || 1;
      const maxFreq = parseInt(frequency.max) || 6000;
      
      pool = pool.filter(r => {
        const freq = parseInt(r.Frequency);
        return freq >= minFreq && freq <= maxFreq;
      });
    }

    setRemaining([...pool]); // Create a copy
    setWordCounter(Math.min(problemCount, pool.length));
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

  useEffect(() => {
    if (isGameOver) {
      setTotalScore(prev => prev + score + timer);
    }
  }, [isGameOver, score, timer, setTotalScore]);  

  return (
    <div className="game-area">
      <button onClick={() => navigate(-1)} className="back-button">← Back to Game Options</button>
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
      {question && <div className="question"><h1>{getSyriacText(question)}</h1></div>}
    </div>
  );
}