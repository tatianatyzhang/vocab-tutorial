import React, { useState, useEffect } from 'react';
import './syriacGame.css';

const SyriacGame = () => {
  const [gameData, setGameData] = useState(null);
  const [droppedMeanings, setDroppedMeanings] = useState({});
  const [draggedItem, setDraggedItem] = useState(null);
  const [availableMeanings, setAvailableMeanings] = useState([]);
  const [feedback, setFeedback] = useState({ show: false, correct: false, message: '' });
  const [gameComplete, setGameComplete] = useState(false);

  useEffect(() => {
    loadRandomWord();
  }, []);

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
      // Load both CSV files
      const pairsResponse = await fetch('/homograph_pairs.csv');
      const tripletsResponse = await fetch('/homograph_triplets.csv');
      
      const pairsText = await pairsResponse.text();
      const tripletsText = await tripletsResponse.text();
      
      // Parse pairs CSV
      const pairsRows = pairsText.split('\n').slice(1).filter(row => row.trim());
      const pairs = pairsRows.map(row => {
        const cols = parseCSVRow(row);
        return {
          unvocalized: cols[1]?.replace(/["""'']/g, '').trim(),
          vocalized1: cols[2]?.replace(/["""'']/g, '').trim(),
          definition1: cleanDefinition(cols[3]),
          vocalized2: cols[4]?.replace(/["""'']/g, '').trim(),
          definition2: cleanDefinition(cols[5])
        };
      }).filter(item => item.unvocalized && item.vocalized1 && item.definition1 && item.vocalized2 && item.definition2);

      // Parse triplets CSV
      const tripletsRows = tripletsText.split('\n').slice(1).filter(row => row.trim());
      const triplets = tripletsRows.map(row => {
        const cols = parseCSVRow(row);
        return {
          unvocalized: cols[1]?.replace(/["""'']/g, '').trim(),
          vocalized1: cols[2]?.replace(/["""'']/g, '').trim(),
          definition1: cleanDefinition(cols[3]),
          vocalized2: cols[4]?.replace(/["""'']/g, '').trim(),
          definition2: cleanDefinition(cols[5]),
          vocalized3: cols[6]?.replace(/["""'']/g, '').trim(),
          definition3: cleanDefinition(cols[7])
        };
      }).filter(item => item.unvocalized && item.vocalized1 && item.definition1 && item.vocalized2 && item.definition2);

      // Choose random word (pairs or triplets)
      const allWords = [...pairs, ...triplets];
      if (allWords.length === 0) {
        throw new Error('No valid words found in CSV files');
      }
      
      const randomWord = allWords[Math.floor(Math.random() * allWords.length)];
      
      // Create game data
      const words = [
        { id: 1, vocalized: randomWord.vocalized1, definition: randomWord.definition1 },
        { id: 2, vocalized: randomWord.vocalized2, definition: randomWord.definition2 }
      ];

      if (randomWord.vocalized3 && randomWord.definition3) {
        words.push({ id: 3, vocalized: randomWord.vocalized3, definition: randomWord.definition3 });
      }

      // Shuffle meanings
      const meanings = words.map(w => w.definition).sort(() => Math.random() - 0.5);

      setGameData({
        unvocalized: randomWord.unvocalized,
        words: words
      });
      setAvailableMeanings(meanings);
      setDroppedMeanings({});
      setGameComplete(false);
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
      // Correct answer - place the meaning
      setDroppedMeanings(prev => ({ ...prev, [wordId]: droppedMeaning }));
      setAvailableMeanings(prev => prev.filter(m => m !== droppedMeaning));
      
      // Check if game is complete
      const newDroppedCount = Object.keys(droppedMeanings).length + 1;
      if (newDroppedCount === gameData.words.length) {
        setTimeout(() => setGameComplete(true), 500);
      }
    } else {
      // Incorrect answer - remove the meaning from available options temporarily
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

  return (
    <div className="syriac-game-container">
      {/* Header */}
      <div className="game-header">
        <h1 className="game-title">
          Syriac Word Match
        </h1>
        <p className="game-subtitle">
          Drag the correct English definitions to match their vocalized forms
        </p>
        <div className="unvocalized-display">
          Unvocalized: {gameData.unvocalized}
        </div>
      </div>

      {/* Words Container */}
      <div className="words-container">
        {gameData.words.map((word, index) => (
          <div
            key={word.id}
            className={`syriac-word-container ${index === 0 ? 'left-word' : 'right-word'}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, word.id)}
          >
            <div className="syriac-word">
              {word.vocalized}
            </div>
            
            {droppedMeanings[word.id] ? (
              <div className="dropped-meaning">
                ✓ {droppedMeanings[word.id]}
              </div>
            ) : (
              <div className="drop-zone-hint">
                Drop the correct definition here
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Meanings Container */}
      <div className="meanings-container">
        {availableMeanings.map((meaning, index) => (
          <div
            key={`${meaning}-${index}`}
            className="meaning-option"
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
          <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#00695c' }}>Outstanding!</div>
          <div style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: '#4a5568' }}>Perfect match! You've mastered these Syriac words.</div>
          <button
            onClick={loadRandomWord}
            className="game-button"
          >
            🔄 Next Challenge
          </button>
        </div>
      )}

      {/* Control Buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
        <button
          onClick={loadRandomWord}
          className="game-button secondary"
        >
          🎲 New Word
        </button>
      </div>
    </div>
  );
};

export default SyriacGame;