import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import './FallingWords.css';

const FallingWordsGame = ({ 
  themeOrPosSelection,
  selectionType, 
  problemCount, // Number of problems to solve
}) => {
  const [words, setWords] = useState([]); // List of falling words
  const [vocab, setVocab] = useState([]); // Filtered vocabulary data
  const [input, setInput] = useState(''); // User input
  const [score, setScore] = useState(0); // Score tracker
  const [wordCounter, setWordCounter] = useState(problemCount); // Track words that need to be identified
  const inputRef = useRef();

  useEffect(() => {
    // Fetch and filter vocabulary data based on the selected category and selection type
    Papa.parse('/vocab_list.csv', {
      header: true,  // Treat the first row as headers
      download: true,  // Enable downloading the file from the server
      complete: (results) => {  // Callback function when parsing is complete
        let filtered = results.data;  // Start with the full data
    
        // Filter based on the selection type
        if (selectionType.value === 'theme' && themeOrPosSelection) {
          filtered = filtered.filter(
            row => row['Vocabulary Category'] === themeOrPosSelection.label
          );
        } else if (selectionType.value === 'pos' && themeOrPosSelection) {
          filtered = filtered.filter(
            row => row['Grammatical Category'] === themeOrPosSelection.label
          );
        }
    
        setVocab(filtered);  // Update the state with the filtered vocabulary data
        startWordDrop(filtered);  // Start the word drop game with the filtered data
      },
    });
  }, [selectionType, themeOrPosSelection]);  // Re-run effect when `selectionType` or `themeOrPosSelection` changes  

  const startWordDrop = (data) => {
    const interval = setInterval(() => {
      // Gradually increase the number of falling words
      setWords(prev => {
        const moved = prev
          .map(word => ({ ...word, y: word.y + word.speed })) // Move the falling words
          .filter(word => {
            if (word.y >= 90) {
              setScore(s => s - 1); // too slow
              setWordCounter(prev => prev - 1);
              return false;
            }
            return true;
          });

        // Gradually add more falling words
        if (Math.random() < 0.01 && moved.length < wordCounter) { // Adjust this for gradual increase
          const random = data[Math.floor(Math.random() * data.length)];
          moved.push({
            id: Date.now() + Math.random(),
            syriac: random.Syriac,
            english: random.English.trim().toLowerCase(),
            x: Math.random() * 90,
            y: 0,
            speed: 0.05 + Math.random() * 0.02,
          });
        }

        return moved;
      });
    }, 50);  // Update every 50ms to control word movement speed

    return () => clearInterval(interval);
  };

  const handleInput = (e) => {
    const value = e.target.value.toLowerCase().trim();
    setInput(value);

    setWords(prev => {
      const match = prev.find(word =>
        word.english.toLowerCase().split(/[\s;,]+/).includes(value)
      );
      if (match) {
        setScore(s => s + 1); // Increase score on correct match
        setInput('');
        setWordCounter(prev => prev - 1); // Decrease the word counter when a word is correctly identified
        return prev.filter(w => w.id !== match.id); // Remove the matched word
      }
      return prev;
    });
  };

  const restartGame = () => {
    setScore(0);
    setInput('');
    setWords([]);
    setWordCounter(problemCount); // Reset word counter when restarting the game
    startWordDrop(vocab);  // Restart with current filtered vocab
  };

  useEffect(() => {
    if (wordCounter <= 0) {
      restartGame(); // Restart the game once all words are identified
    }
  }, [wordCounter]); // Monitor the word counter and trigger the game over condition

  return (
    <div className="game-area">
      <div className="score">Score: {score}</div>
      <div className="word-counter">Words Remaining: {wordCounter}</div> {/* Display word counter */}
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