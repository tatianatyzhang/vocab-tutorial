import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './DefiningHomographs.css';
import { useSession } from '../../App';

const DefiningHomographs = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addIncorrectWord, setTotalScore } = useSession();
  
  // Default to 60s if not provided
  const { gameDuration = 60 } = location.state || {};
  
  // Game State
  const [allHomographs, setAllHomographs] = useState([]);
  const [currentHomograph, setCurrentHomograph] = useState('');
  const [currentQuestionData, setCurrentQuestionData] = useState(null); // Store full obj for reporting
  
  // Round State
  const [correctDefinitions, setCorrectDefinitions] = useState([]);
  const [allDefinitions, setAllDefinitions] = useState([]);
  const [droppedItems, setDroppedItems] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  
  // UI/Feedback State
  const [flashColor, setFlashColor] = useState('');
  const [isFlashing, setIsFlashing] = useState(false);
  const [gameComplete, setGameComplete] = useState(false); // Used for "Question Complete" animation
  
  // Stats
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(gameDuration);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);

  // --- CSV Parsing Helpers ---
  const cleanDefinition = (def) => {
    if (!def) return '';
    return def
      .replace(/["""'']/g, '')
      .replace(/[^\w\s;,./-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

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

  const parseHomographListCSV = (csvText) => {
    const lines = csvText.trim().split('\n').slice(1);
    const homographs = {};

    lines.forEach(line => {
      const parts = parseCSVRow(line);
      // Index 1: Unvocalized Form
      // Index 7: Short Definition
      const unvocalized = parts[1];
      const definition = cleanDefinition(parts[7]);

      if (unvocalized && definition) {
        if (!homographs[unvocalized]) {
          homographs[unvocalized] = {
            unvocalized: unvocalized,
            definitions: []
          };
        }
        // Avoid duplicates
        if (!homographs[unvocalized].definitions.includes(definition)) {
            homographs[unvocalized].definitions.push(definition);
        }
      }
    });

    // Convert to array and filter for valid homographs (at least 2 definitions)
    return Object.values(homographs).map(h => {
      const item = { unvocalized: h.unvocalized };
      h.definitions.forEach((def, i) => {
        item[`def${i + 1}`] = def;
      });
      return item;
    }).filter(item => item.def2);
  };

  // --- Effects ---

  // 1. Load Data
  useEffect(() => {
    const loadHomographs = async () => {
      try {
        const response = await fetch('/homograph_list.csv');
        const csvText = await response.text();
        const data = parseHomographListCSV(csvText);
        if (data.length > 0) {
            setAllHomographs(data);
        }
      } catch (error) {
        console.error('Error loading CSV:', error);
      }
    };
    loadHomographs();
  }, []);

  // 2. Timer (Counts down to Game Over)
  useEffect(() => {
    if (timeRemaining > 0 && !gameEnded) {
      const timer = setTimeout(() => {
        setTimeRemaining(t => t - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining <= 0 && !gameEnded) {
      setGameEnded(true);
      setTotalScore(prev => prev + score);
    }
  }, [timeRemaining, gameEnded, score, setTotalScore]);

  // 3. Load First Question
  useEffect(() => {
    if (allHomographs.length > 0 && currentHomograph === '') {
        loadNewQuestion();
    }
  }, [allHomographs]);

  // 4. Check for Question Completion
  useEffect(() => {
    if (correctDefinitions.length > 0 && droppedItems.length === correctDefinitions.length) {
      setGameComplete(true); // Triggers "Correct!" message
      setTimeout(() => {
        setQuestionsAnswered(prev => prev + 1);
        loadNewQuestion();
      }, 1500);
    }
  }, [droppedItems, correctDefinitions]);

  // --- Logic ---

  const loadNewQuestion = () => {
    if (allHomographs.length === 0) return;

    // Pick random word
    const randomIndex = Math.floor(Math.random() * allHomographs.length);
    const homograph = allHomographs[randomIndex];
    
    setCurrentQuestionData(homograph);
    setCurrentHomograph(homograph.unvocalized);
    
    // Identify correct definitions
    const correct = [homograph.def1, homograph.def2];
    if (homograph.def3) correct.push(homograph.def3);
    setCorrectDefinitions(correct);
    
    // Generate distractors
    const incorrectDefs = [];
    const otherHomographs = allHomographs.filter((_, idx) => idx !== randomIndex);
    const shuffledOthers = otherHomographs.sort(() => 0.5 - Math.random()).slice(0, 4);
    
    shuffledOthers.forEach(h => {
      incorrectDefs.push(h.def1);
      incorrectDefs.push(h.def2);
    });
    
    // Combine and shuffle
    const allDefs = [...correct, ...incorrectDefs.slice(0, 6)].sort(() => 0.5 - Math.random());
    
    // Reset Round State
    setAllDefinitions(allDefs);
    setDroppedItems([]);
    setGameComplete(false);
  };

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
    const droppedDef = e.dataTransfer.getData('text/plain') || draggedItem;
    
    if (droppedDef && correctDefinitions.includes(droppedDef)) {
      // Correct
      setFlashColor('correct');
      setIsFlashing(true);
      setScore(prev => prev + 10);
      
      setTimeout(() => {
        setIsFlashing(false);
        setFlashColor('');
      }, 500);

      setDroppedItems(prev => [...prev, droppedDef]);
      // Remove from pool so they can't drop it again
      setAllDefinitions(prev => prev.filter(d => d !== droppedDef));

    } else if (droppedDef) {
      // Incorrect
      setFlashColor('incorrect');
      setIsFlashing(true);
      setScore(prev => Math.max(0, prev - 5));
      
      // Log incorrect word for session review
      // The structure needs to match what Summary expects (Syriac/English)
      if (currentQuestionData) {
          addIncorrectWord({
              Syriac: currentQuestionData.unvocalized,
              English: `Homograph: ${correctDefinitions.join(', ')}` 
          });
      }

      setTimeout(() => {
        setIsFlashing(false);
        setFlashColor('');
      }, 500);

      // Remove the incorrect option to unclutter screen
      setAllDefinitions(prev => prev.filter(d => d !== droppedDef));
    }
    
    setDraggedItem(null);
  };

  // Helper for circular layout
  const getCircularPosition = (index, total) => {
    const angle = (index * 2 * Math.PI) / total;
    // Radius allows items to orbit the center word
    const radius = 220; 
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { x, y };
  };

  const containerClass = `homograph-game-container ${isFlashing ? `flash-${flashColor}` : ''}`;
  const timerClass = `homograph-timer ${timeRemaining <= 10 ? 'warning' : ''}`;

  if (gameEnded) {
    return (
      <div className={containerClass}>
        <div className="game-end-modal">
          <div className="game-end-content">
            <div className="game-end-icon">🏆</div>
            <h2 className="game-end-title">Game Complete!</h2>
            <div className="final-score">Final Score: {score}</div>
            <p className="game-end-description">
              You completed {questionsAnswered} questions!
            </p>
            <button onClick={() => navigate('/summary')} className="game-end-button">
              Finish Session
            </button>
            <br/><br/>
            <button onClick={() => navigate('/')} className="game-end-button" style={{background: '#6c757d'}}>
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {/* Header */}
      <button onClick={() => navigate(-1)} className="homograph-back-button">← Back</button>
      
      <div className="homograph-header">
        <div className="homograph-title">Defining Homographs</div>
      </div>

      <div className="homograph-stats">
        <div className="homograph-score">Score: {score}</div>
        <div className={timerClass}>Time: {timeRemaining}s</div>
        <div className="homograph-progress">Question: {questionsAnswered + 1}</div>
      </div>

      {/* Game Area */}
      <div className="game-area">
        {/* Drop Zone (Center) */}
        <div 
          className="homograph-center"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="homograph-word">
            {currentHomograph}
          </div>
          
          <div className="dropped-definitions">
            {droppedItems.map((item, index) => (
              <div key={index} className="dropped-definition">✓ {item}</div>
            ))}
          </div>
          
          {droppedItems.length === 0 && (
            <div className="drop-zone-placeholder">Drop definitions here</div>
          )}
        </div>

        {/* Draggable Options (Orbiting) */}
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

        {/* Question Completion Message */}
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