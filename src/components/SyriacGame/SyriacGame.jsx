import React, { useState, useEffect } from 'react';
import './SyriacGame.css';

const SyriacGame = () => {
  const [words, setWords] = useState([]);
  const [meanings, setMeanings] = useState([]);
  const [droppedMeanings, setDroppedMeanings] = useState({});
  const [draggedItem, setDraggedItem] = useState(null);
  const [flashColor, setFlashColor] = useState('');
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    fetch('/test_homographs.csv')
      .then(response => response.text())
      .then(text => {
        const rows = text.split('\n').slice(1);
        const firstRow = rows[0].split(',');
        const correctAnswers = rows.filter(row => row.split(',')[2].trim() === 'CORRECT');
        const firstMeaning = correctAnswers[0].split(',')[1];
        const secondMeaning = correctAnswers[1].split(',')[1];

        setWords([
          { word: `${firstRow[0]} (vowel 1)`, meaning: firstMeaning },
          { word: `${firstRow[0]} (vowel 2)`, meaning: secondMeaning },
        ]);

        setMeanings([firstMeaning, secondMeaning].sort(() => Math.random() - 0.5));
      });
  }, []);

  const handleDragStart = (e, meaning) => {
    console.log('Drag started with:', meaning);
    setDraggedItem(meaning);
    e.dataTransfer.setData('text/plain', meaning);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, word) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Drop event triggered for word:', word);
    
    const droppedMeaning = e.dataTransfer.getData('text/plain') || draggedItem;
    console.log('Dropped meaning:', droppedMeaning);
    
    if (droppedMeaning) {
      const correctWord = words.find(w => w.word === word);
      const isCorrect = correctWord && correctWord.meaning === droppedMeaning;
      
      console.log('Is correct:', isCorrect);
      
      // Flash screen
      setFlashColor(isCorrect ? 'correct' : 'incorrect');
      setIsFlashing(true);
      
      setTimeout(() => {
        setIsFlashing(false);
        setFlashColor('');
      }, 500);

      if (isCorrect) {
        setDroppedMeanings(prev => ({ ...prev, [word]: droppedMeaning }));
        setMeanings(prev => prev.filter(m => m !== droppedMeaning));
      } else {
        // Remove incorrect meanings too
        setMeanings(prev => prev.filter(m => m !== droppedMeaning));
      }
      
      setDraggedItem(null);
    }
  };

  const isGameComplete = Object.keys(droppedMeanings).length === words.length;

  return (
    <div className={`syriac-game-container ${isFlashing ? `flash-${flashColor}` : ''}`}>
      <div className="game-header">
        <h1 className="game-title">Syriac Word Match</h1>
        <p className="game-subtitle">Drag the meanings to their correct words</p>
      </div>

      <div className="game-area">
        {/* Words containers */}
        <div className="words-container">
          {words.map((word, index) => (
            <div
              key={word.word}
              className={`syriac-word-container ${index === 0 ? 'left-word' : 'right-word'}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, word.word)}
            >
              <div className="syriac-word">{word.word}</div>
              {droppedMeanings[word.word] && (
                <div className="dropped-meaning">
                  ✓ {droppedMeanings[word.word]}
                </div>
              )}
              {!droppedMeanings[word.word] && (
                <div className="drop-zone-hint">Drop meaning here</div>
              )}
            </div>
          ))}
        </div>

        {/* Meanings container */}
        <div className="meanings-container">
          {meanings.map((meaning, index) => (
            <div
              key={meaning}
              className="meaning-option"
              draggable
              onDragStart={(e) => handleDragStart(e, meaning)}
              style={{
                animationDelay: `${index * 0.2}s`
              }}
            >
              {meaning}
            </div>
          ))}
        </div>

        {/* Success message */}
        {isGameComplete && (
          <div className="success-message">
            🎉 Excellent! You matched all the meanings correctly! 🎉
          </div>
        )}
      </div>
    </div>
  );
};

export default SyriacGame;