import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './VocalizingHomographs.css';

const VocalizingHomographs = ({ totalQuestions = 10 }) => {
  const navigate = useNavigate();
  const [gameData, setGameData] = useState(null);
  const [droppedMeanings, setDroppedMeanings] = useState({});
  const [draggedItem, setDraggedItem] = useState(null);
  const [availableMeanings, setAvailableMeanings] = useState([]);
  const [feedback, setFeedback] = useState({ show: false, correct: false, message: '' });
  const [gameComplete, setGameComplete] = useState(false);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(1);

  useEffect(() => {
    loadRandomWord();
  }, []);

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (timerActive && timeRemaining > 0 && !gameComplete) {
      interval = setInterval(() => {
        setTimeRemaining(time => {
          if (time <= 1) {
            handleTimeUp();
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    } else if (timeRemaining === 0 || gameComplete) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeRemaining, gameComplete]);

  const handleTimeUp = useCallback(() => {
    setTimerActive(false);
    setFeedback({
      show: true,
      correct: false,
      message: '⏰ Time\'s up!'
    });
    setTimeout(() => {
      setFeedback({ show: false, correct: false, message: '' });
      if (currentQuestion < totalQuestions) {
        setCurrentQuestion(prev => prev + 1);
        loadRandomWord();
      } else {
        setGameComplete(true);
      }
    }, 1500);
  }, [currentQuestion, totalQuestions]);

  const startTimer = () => {
    setTimeRemaining(30);
    setTimerActive(true);
  };

  // Helper function to clean definitions
  const cleanDefinition = (definition) => {
    if (!definition) return '';
    
    return definition
      .replace(/["""'']/g, '') // Remove various quote marks
      .replace(/[()]/g, '') // Remove parentheses
      .replace(/;.*$/, '') // Remove semicolons and everything after
      .replace(/,.*$/, '') // Remove commas and everything after (keep only first definition)
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim() // Remove leading/trailing whitespace
      .toLowerCase(); // Convert to lowercase for consistency
  };

  // Helper function to parse CSV row more carefully
  const parseCSVRow = (row) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const loadRandomWord = async () => {
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
          if (!homographs[unvocalized]) {
            homographs[unvocalized] = [];
          }
          homographs[unvocalized].push({ vocalized, definition });
        }
      });

      const allHomographGroups = Object.values(homographs).filter(group => group.length >= 2);

      if (allHomographGroups.length === 0) {
        throw new Error('No valid homograph groups found in CSV file');
      }

      const randomGroup = allHomographGroups[Math.floor(Math.random() * allHomographGroups.length)];

      const words = randomGroup.map((item, index) => ({
        id: index + 1,
        vocalized: item.vocalized,
        definition: item.definition
      }));

      const meanings = words.map(w => w.definition).sort(() => Math.random() - 0.5);

      setGameData({
        unvocalized: randomGroup[0] ? Object.keys(homographs).find(key => homographs[key] === randomGroup) : '',
        words: words
      });
      setAvailableMeanings(meanings);
      setDroppedMeanings({});
      setGameComplete(false);
      startTimer();
    } catch (error) {
      console.error('Error loading game data:', error);
      // Fallback data for testing
      const fallbackData = {
        unvocalized: 'ܪܒܐ',
        words: [
          { id: 1, vocalized: 'ܪܰܒܳܐ', definition: 'great' },
          { id: 2, vocalized: 'ܪܶܒܳܐ', definition: 'ten thousand' }
        ]
      };
      setGameData(fallbackData);
      setAvailableMeanings(['great', 'ten thousand'].sort(() => Math.random() - 0.5));
      setDroppedMeanings({});
      setGameComplete(false);
      startTimer();
    }
  };

  const handleDragStart = (e, meaning) => {
    setDraggedItem(meaning);
    e.dataTransfer.setData('text/plain', meaning);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, wordId) => {
    e.preventDefault();
    const droppedMeaning = e.dataTransfer.getData('text/plain') || draggedItem;
    
    if (!droppedMeaning || !gameData) return;

    const targetWord = gameData.words.find(w => w.id === wordId);
    const isCorrect = targetWord && targetWord.definition === droppedMeaning;

    // Show feedback
    setFeedback({
      show: true,
      correct: isCorrect,
      message: isCorrect ? '✓ Correct!' : '✗ Try again!'
    });

    setTimeout(() => setFeedback({ show: false, correct: false, message: '' }), 1500);

    if (isCorrect) {
      // Correct answer - place the meaning and add score
      setScore(prevScore => prevScore + 10);
      setDroppedMeanings(prev => ({ ...prev, [wordId]: droppedMeaning }));
      setAvailableMeanings(prev => prev.filter(m => m !== droppedMeaning));
      
      // Check if game is complete
      const newDroppedCount = Object.keys(droppedMeanings).length + 1;
      if (newDroppedCount === gameData.words.length) {
        setTimerActive(false);
        setTimeout(() => {
          if (currentQuestion < totalQuestions) {
            setCurrentQuestion(prev => prev + 1);
            loadRandomWord();
          } else {
            setGameComplete(true);
          }
        }, 500);
      }
    } else {
      // Incorrect answer - subtract score and handle meaning
      setScore(prevScore => Math.max(0, prevScore - 5));
      setAvailableMeanings(prev => prev.filter(m => m !== droppedMeaning));
      // Add it back after a delay
      setTimeout(() => {
        setAvailableMeanings(prev => {
          if (!prev.includes(droppedMeaning)) {
            return [...prev, droppedMeaning];
          }
          return prev;
        });
      }, 2000);
    }

    setDraggedItem(null);
  };

  if (!gameData) {
    return (
      <div className="loading-state">
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔄</div>
        <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Loading Syriac words...</div>
        <div style={{ fontSize: '0.9rem', opacity: '0.7' }}>Preparing your vocabulary challenge</div>
      </div>
    );
  }

  const isThreeWords = gameData.words.length === 3;

  return (
    <div className="vocalizing-homographs-container">
      {/* The controls are a direct child of the main container */}
      <div className="game-controls-top">
        <button onClick={() => navigate('/')} className="back-button">
          ← Back to Game Options
        </button>
        <div className="game-stats-container">
          <div className="score-display">
            Score: {score}
          </div>
          <div className={`timer-display ${timeRemaining <= 10 ? 'timer-warning' : ''}`}>
            Time: {timeRemaining}s
          </div>
          <div className="question-counter">
            Question: {currentQuestion}/{totalQuestions}
          </div>
        </div>
      </div>

      {/* The header only handles the centered text */}
      <div className="game-header">
        <h1 className="game-title">Vocalizing Homographs</h1>
        <p className="game-subtitle">
          Drag the correct English definitions to match their vocalized forms
        </p>
        <div className="unvocalized-display">
          Unvocalized: {gameData.unvocalized}
        </div>
      </div>

      {/* Words Container */}
      <div className={`words-container ${isThreeWords ? 'three-words' : 'two-words'}`}>
        {gameData.words.map((word, index) => (
          <div
            key={word.id}
            className={`syriac-word-container ${
              isThreeWords ? 'three-words' : ''
            } ${
              index === 0 ? 'left-word' : 
              index === 1 ? (isThreeWords ? 'center-word' : 'right-word') : 
              'right-word'
            }`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, word.id)}
          >
            <div className={`syriac-word ${isThreeWords ? 'three-words' : ''}`}>
              {word.vocalized}
            </div>
            
            {droppedMeanings[word.id] ? (
              <div className={`dropped-meaning ${isThreeWords ? 'three-words' : ''}`}>
                ✓ {droppedMeanings[word.id]}
              </div>
            ) : (
              <div className={`drop-zone-hint ${isThreeWords ? 'three-words' : ''}`}>
                Drop the correct definition here
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Meanings Container */}
      <div className={`meanings-container ${isThreeWords ? 'three-words' : ''}`}>
        {availableMeanings.map((meaning, index) => (
          <div
            key={`${meaning}-${index}`}
            className={`meaning-option ${isThreeWords ? 'three-words' : ''}`}
            style={{ animationDelay: `${index * 0.1 + 0.4}s` }}
            draggable
            onDragStart={(e) => handleDragStart(e, meaning)}
          >
            {meaning}
          </div>
        ))}
      </div>

      {/* Feedback Message */}
      {feedback.show && (
        <div className={`feedback-message ${feedback.correct ? 'feedback-correct' : 'feedback-incorrect'}`}>
          {feedback.message}
        </div>
      )}

      {/* Success Message */}
      {gameComplete && (
        <div className="success-message">
          <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>🎉</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#00695c' }}>Game Complete!</div>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#4299e1' }}>Final Score: {score}</div>
          <div style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: '#4a5568' }}>You completed {totalQuestions} questions!</div>
          <button
            onClick={() => navigate('/')}
            className="game-button"
          >
            Back to Menu
          </button>
        </div>
      )}

      {/* Control Buttons - Only show during game */}
      {!gameComplete && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
          <button
            onClick={() => {
              if (currentQuestion < totalQuestions) {
                setCurrentQuestion(prev => prev + 1);
                loadRandomWord();
              } else {
                setGameComplete(true);
              }
            }}
            className="game-button secondary"
          >
            Skip Question
          </button>
        </div>
      )}
    </div>
  );
};

export default VocalizingHomographs;