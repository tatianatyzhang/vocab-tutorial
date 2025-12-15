import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './VocalizingHomographs.css';
import { useSession } from '../../App';

const VocalizingHomographs = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addIncorrectWord, setTotalScore } = useSession();

  // 1. Get Game Config
  const { gameDuration = 60 } = location.state || {};

  // 2. State
  const [allGroups, setAllGroups] = useState([]);
  const [gameData, setGameData] = useState(null); // Current question data
  
  // Drag & Drop State
  const [droppedMeanings, setDroppedMeanings] = useState({});
  const [draggedItem, setDraggedItem] = useState(null);
  const [availableMeanings, setAvailableMeanings] = useState([]);
  
  // Feedback & Stats
  const [feedback, setFeedback] = useState({ show: false, correct: false, message: '' });
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(gameDuration);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);

  // --- CSV Helpers ---
  const cleanDefinition = (definition) => {
    if (!definition) return '';
    return definition
      .replace(/["""'']/g, '')
      .replace(/[()]/g, '')
      .replace(/;.*$/, '')
      .replace(/,.*$/, '')
      .trim()
      .toLowerCase();
  };

  const parseCSVRow = (row) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
      else current += char;
    }
    result.push(current.trim());
    return result;
  };

  // --- Effects ---

  // 1. Load Data
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/homograph_list.csv');
        const csvText = await response.text();
        const lines = csvText.trim().split('\n').slice(1);
        const homographs = {};

        lines.forEach(line => {
          const parts = parseCSVRow(line);
          const unvocalized = parts[1];
          const vocalized = parts[2];
          const definition = cleanDefinition(parts[7]);

          if (unvocalized && vocalized && definition) {
            if (!homographs[unvocalized]) homographs[unvocalized] = [];
            // Store as object for easy access
            homographs[unvocalized].push({ vocalized, definition });
          }
        });

        // Filter groups that have at least 2 variations to make a valid puzzle
        const groups = Object.entries(homographs)
          .filter(([_, variants]) => variants.length >= 2)
          .map(([key, variants]) => ({ unvocalized: key, words: variants }));
          
        setAllGroups(groups);
      } catch (e) { console.error(e); }
    };
    loadData();
  }, []);

  // 2. Timer (Global countdown)
  useEffect(() => {
    if (timeRemaining > 0 && !gameEnded) {
      const id = setTimeout(() => setTimeRemaining(t => t - 1), 1000);
      return () => clearTimeout(id);
    } else if (timeRemaining === 0 && !gameEnded) {
      setGameEnded(true);
      setTotalScore(prev => prev + score);
    }
  }, [timeRemaining, gameEnded, score, setTotalScore]);

  // 3. Load First Question
  useEffect(() => {
    if (allGroups.length > 0 && !gameData) {
        loadRandomWord();
    }
  }, [allGroups]);

  // --- Game Logic ---

  const loadRandomWord = () => {
    if (allGroups.length === 0) return;
    
    // Pick random group
    const randomGroupIndex = Math.floor(Math.random() * allGroups.length);
    const group = allGroups[randomGroupIndex];
    
    // Map to game structure with IDs
    const words = group.words.map((item, index) => ({
      id: index + 1,
      vocalized: item.vocalized,
      definition: item.definition
    }));

    // Shuffle definitions
    const meanings = words.map(w => w.definition).sort(() => Math.random() - 0.5);
    
    setGameData({
      unvocalized: group.unvocalized,
      words: words
    });
    setAvailableMeanings(meanings);
    setDroppedMeanings({});
  };

  const handleDragStart = (e, meaning) => {
    setDraggedItem(meaning);
    e.dataTransfer.setData('text/plain', meaning);
  };

  const handleDrop = (e, wordId) => {
    e.preventDefault();
    const droppedMeaning = e.dataTransfer.getData('text/plain') || draggedItem;
    if (!droppedMeaning || !gameData) return;

    const targetWord = gameData.words.find(w => w.id === wordId);
    const isCorrect = targetWord && targetWord.definition === droppedMeaning;

    // Feedback
    setFeedback({ 
      show: true, 
      correct: isCorrect, 
      message: isCorrect ? '✓ Correct!' : '✗ Try again!' 
    });
    setTimeout(() => setFeedback({ show: false, correct: false, message: '' }), 1000);

    if (isCorrect) {
      setScore(s => s + 10);
      setDroppedMeanings(prev => ({ ...prev, [wordId]: droppedMeaning }));
      setAvailableMeanings(prev => prev.filter(m => m !== droppedMeaning));
      
      // Check if level complete
      const currentDroppedCount = Object.keys(droppedMeanings).length + 1; // +1 for current drop
      if (currentDroppedCount === gameData.words.length) {
          setQuestionsAnswered(q => q + 1);
          setTimeout(() => loadRandomWord(), 1000);
      }
    } else {
      setScore(s => Math.max(0, s - 5));
      
      // Track incorrect word
      addIncorrectWord({
        Syriac: targetWord.vocalized,
        English: `Definition: ${targetWord.definition}`
      });
    }
    setDraggedItem(null);
  };

  // --- Rendering ---

  if (gameEnded) {
    return (
      <div className="vocalizing-homographs-container">
          <div className="game-end-modal">
            <div className="game-end-content">
                <h2>Game Over!</h2>
                <div className="final-score">Final Score: {score}</div>
                <p>Questions Answered: {questionsAnswered}</p>
                <button onClick={() => navigate('/summary')} className="game-button">Finish Session</button>
                <br/><br/>
                <button onClick={() => navigate('/')} className="game-button secondary">Back to Menu</button>
            </div>
          </div>
      </div>
    );
  }

  if (!gameData) return <div className="loading-state">Loading...</div>;

  const isThreeWords = gameData.words.length >= 3;

  return (
    <div className="vocalizing-homographs-container">
      {/* Header */}
      <div className="game-controls-top">
        <button onClick={() => navigate('/')} className="back-button">← Back</button>
        <div className="game-stats-container">
          <div className="score-display">Score: {score}</div>
          <div className={`timer-display ${timeRemaining <= 10 ? 'timer-warning' : ''}`}>
             Time: {timeRemaining}s
          </div>
          <div className="question-counter">Question: {questionsAnswered + 1}</div>
        </div>
      </div>

      <div className="game-header">
        <h1 className="game-title">Vocalizing Homographs</h1>
        <p className="game-subtitle">Drag definitions to match vocalized forms</p>
        <div className="unvocalized-display">
          Root: {gameData.unvocalized}
        </div>
      </div>

      {/* Syraic Words (Drop Zones) */}
      <div className={`words-container ${isThreeWords ? 'three-words' : 'two-words'}`}>
        {gameData.words.map((word, index) => (
          <div
            key={word.id}
            className={`syriac-word-container ${isThreeWords ? 'three-words' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, word.id)}
          >
            <div className="syriac-word">{word.vocalized}</div>
            
            {droppedMeanings[word.id] ? (
              <div className="dropped-meaning">✓ {droppedMeanings[word.id]}</div>
            ) : (
              <div className="drop-zone-hint">Drop definition here</div>
            )}
          </div>
        ))}
      </div>

      {/* English Definitions (Draggables) */}
      <div className="meanings-container">
        {availableMeanings.map((meaning, i) => (
          <div
            key={i}
            className="meaning-option"
            draggable
            onDragStart={(e) => handleDragStart(e, meaning)}
          >
            {meaning}
          </div>
        ))}
      </div>
      
      {/* Feedback Overlay */}
      {feedback.show && (
          <div className={`feedback-message ${feedback.correct ? 'feedback-correct' : 'feedback-incorrect'}`}>
              {feedback.message}
          </div>
      )}
    </div>
  );
};

export default VocalizingHomographs;