import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './DefiningHomographs.css';

const DefiningHomographs = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get props from navigation state, with fallback defaults
  const { 
    problemCount = 5,
    gameType = 'homograph',
    selectionType = 'random',
    themeOrPosSelection = null,
    frequency = { min: 1, max: 6000 },
    vocalization = false
  } = location.state || {};
  
  const [currentHomograph, setCurrentHomograph] = useState('');
  const [correctDefinitions, setCorrectDefinitions] = useState([]);
  const [allDefinitions, setAllDefinitions] = useState([]);
  const [droppedItems, setDroppedItems] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [flashColor, setFlashColor] = useState('');
  const [isFlashing, setIsFlashing] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  
  // New state variables for the requested features
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [allHomographs, setAllHomographs] = useState([]);
  const [gameEnded, setGameEnded] = useState(false);

  // Clean definition text - remove quotes, extra punctuation, and keep only letters/spaces
  const cleanDefinition = (def) => {
    if (!def) return '';
    return def
      .replace(/["""'']/g, '') // Remove quotes
      .replace(/[^\w\s;,./-]/g, '') // Keep only letters, numbers, spaces, and basic punctuation
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
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

  // Parse CSV data from homograph_list.csv
  const parseHomographListCSV = (csvText) => {
    const lines = csvText.trim().split('\n').slice(1); // Skip header
    const homographs = {};

    lines.forEach(line => {
      const parts = parseCSVRow(line);
      const unvocalized = parts[1];
      const definition = cleanDefinition(parts[7]); // short_definition

      if (unvocalized && definition) {
        if (!homographs[unvocalized]) {
          homographs[unvocalized] = {
            unvocalized: unvocalized,
            definitions: []
          };
        }
        homographs[unvocalized].definitions.push(definition);
      }
    });

    // Convert the dictionary to an array of homograph objects
    return Object.values(homographs).map(h => {
      const item = { unvocalized: h.unvocalized };
      h.definitions.forEach((def, i) => {
        item[`def${i + 1}`] = def;
      });
      return item;
    }).filter(item => item.def2); // Ensure there are at least two definitions
  };

  // Load all homographs at game start
  const loadHomographs = async () => {
    try {
      // Fetch CSV file from public folder
      const response = await fetch('/homograph_list.csv');
      const csvText = await response.text();
      
      const allHomographsData = parseHomographListCSV(csvText);
      
      if (allHomographsData.length === 0) {
        console.error('No valid homographs found');
        // Fallback data for demo
        setAllHomographs([
          {
            unvocalized: 'ܒܪܐ',
            def1: 'son',
            def2: 'to create',
            def3: 'exterior open country'
          }
        ]);
      } else {
        // Shuffle and take only the number needed
        const shuffledHomographs = allHomographsData.sort(() => 0.5 - Math.random()).slice(0, problemCount);
        setAllHomographs(shuffledHomographs);
      }
    } catch (error) {
      console.error('Error loading CSV file:', error);
      // Fallback data for demo
      setAllHomographs([
        {
          unvocalized: 'ܒܪܐ',
          def1: 'son',
          def2: 'to create',
          def3: 'exterior open country'
        }
      ]);
    }
  };

  const loadQuestion = (questionIndex) => {
    if (questionIndex >= allHomographs.length) {
      setGameEnded(true);
      return;
    }

    const homograph = allHomographs[questionIndex];
    setCurrentHomograph(homograph.unvocalized);
    
    // Set correct definitions for this homograph
    const correct = [homograph.def1, homograph.def2];
    if (homograph.def3) {
      correct.push(homograph.def3);
    }
    setCorrectDefinitions(correct);
    
    // Create a pool of all definitions including correct ones and some incorrect ones
    const incorrectDefs = [];
    const otherHomographs = allHomographs.filter((h, idx) => idx !== questionIndex);
    
    // Add some random incorrect definitions
    const shuffledOthers = otherHomographs.sort(() => 0.5 - Math.random()).slice(0, 4);
    shuffledOthers.forEach(h => {
      incorrectDefs.push(h.def1, h.def2);
      if (h.def3) incorrectDefs.push(h.def3);
    });
    
    // Combine and shuffle all definitions
    const allDefs = [...correct, ...incorrectDefs.slice(0, 6)].sort(() => 0.5 - Math.random());
    setAllDefinitions(allDefs);
    
    // Reset question state
    setDroppedItems([]);
    setGameComplete(false);
    setTimeRemaining(30);
  };

  // Timer effect
  useEffect(() => {
    if (timeRemaining > 0 && !gameComplete && !gameEnded) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && !gameComplete) {
      // Time's up, move to next question
      nextQuestion();
    }
  }, [timeRemaining, gameComplete, gameEnded]);

  const nextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= problemCount) {
      setGameEnded(true);
    } else {
      setCurrentQuestionIndex(nextIndex);
      loadQuestion(nextIndex);
    }
  };

  // Load homographs on component mount
  useEffect(() => {
    loadHomographs();
  }, [problemCount]);

  // Load first question when homographs are ready
  useEffect(() => {
    if (allHomographs.length > 0) {
      loadQuestion(0);
    }
  }, [allHomographs]);

  // Check if current question is complete
  useEffect(() => {
    if (droppedItems.length === correctDefinitions.length && correctDefinitions.length > 0) {
      setGameComplete(true);
      // Automatically move to next question after a short delay
      setTimeout(() => {
        nextQuestion();
      }, 1500);
    }
  }, [droppedItems, correctDefinitions]);

  const handleDragStart = (e, definition) => {
    setDraggedItem(definition);
    e.dataTransfer.setData('text/plain', definition);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedDef = e.dataTransfer.getData('text/plain') || draggedItem;
    
    if (droppedDef && correctDefinitions.includes(droppedDef)) {
      // Correct answer
      setFlashColor('correct');
      setIsFlashing(true);
      setScore(prev => prev + 10); // +10 for correct
      
      setTimeout(() => {
        setIsFlashing(false);
        setFlashColor('');
      }, 500);

      setDroppedItems(prev => [...prev, droppedDef]);
      setAllDefinitions(prev => prev.filter(d => d !== droppedDef));
    } else if (droppedDef) {
      // Incorrect answer
      setFlashColor('incorrect');
      setIsFlashing(true);
      setScore(prev => prev - 5); // -5 for incorrect
      
      setTimeout(() => {
        setIsFlashing(false);
        setFlashColor('');
      }, 500);

      // Remove the incorrect definition
      setAllDefinitions(prev => prev.filter(d => d !== droppedDef));
    }
    
    setDraggedItem(null);
  };

  const handleBackToMode = () => {
    navigate('/');
  };

  // Calculate positions for circular arrangement (with overlap prevention)
  const getCircularPosition = (index, total) => {
    const angle = (index * 2 * Math.PI) / total;
    const baseRadius = Math.max(200, 160 + total * 12); // Reduced base radius
    const radiusVariation = 25; // Reduced radius variation
    const radius = baseRadius + (index % 2) * radiusVariation;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { x, y };
  };

  // Get CSS class names based on state
  const containerClass = `homograph-game-container ${isFlashing ? `flash-${flashColor}` : ''}`;
  const timerClass = `homograph-timer ${timeRemaining <= 10 ? 'warning' : ''}`;

  if (gameEnded) {
    return (
      <div className={containerClass}>
        <div className="game-end-modal">
          <div className="game-end-content">
            <div className="game-end-icon">🏆</div>
            <h2 className="game-end-title">
              Game Complete!
            </h2>
            <div className="final-score">
              Final Score: {score}
            </div>
            <p className="game-end-description">
              You completed {problemCount} homograph{problemCount > 1 ? 's' : ''}!
            </p>
            <button 
              onClick={handleBackToMode}
              className="game-end-button"
            >
              Back to Game Options
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {/* Back Button - Top Left */}
      <button 
        onClick={handleBackToMode}
        className="homograph-back-button"
      >
        ← Back to Game Options
      </button>

      {/* Title - Center Top */}
      <div className="homograph-header">
        <div className="homograph-title">Defining Homographs</div>
      </div>

      {/* Stats - Top Right */}
      <div className="homograph-stats">
        <div className="homograph-score">Score: {score}</div>
        <div className={timerClass}>Time: {timeRemaining}s</div>
        <div className="homograph-progress">Question: {currentQuestionIndex + 1}/{problemCount}</div>
      </div>

      {/* Game Area */}
      <div className="game-area">
        {/* Central homograph word with drop zone */}
        <div 
          className="homograph-center"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="homograph-word">
            {currentHomograph}
          </div>
          
          {/* Dropped correct definitions */}
          <div className="dropped-definitions">
            {droppedItems.map((item, index) => (
              <div key={index} className="dropped-definition">
                ✓ {item}
              </div>
            ))}
          </div>
          
          {droppedItems.length === 0 && (
            <div className="drop-zone-placeholder">
              Drop definitions here
            </div>
          )}
        </div>

        {/* Circular arrangement of definitions */}
        {allDefinitions.map((definition, index) => {
          const position = getCircularPosition(index, allDefinitions.length);
          return (
            <div
              key={`${definition}-${index}`}
              className="definition-option"
              style={{
                left: `calc(50% + ${position.x}px)`,
                top: `calc(50% + ${position.y}px)`
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, definition)}
            >
              {definition}
            </div>
          );
        })}

        {/* Success message for current question */}
        {gameComplete && (
          <div className="success-message">
            ✓ Correct! Moving to next question...
          </div>
        )}
      </div>
    </div>
  );
};

export default DefiningHomographs;