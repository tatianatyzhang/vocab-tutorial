import React, { useState, useEffect } from 'react';

const HomographGame = () => {
  const [currentHomograph, setCurrentHomograph] = useState('');
  const [correctDefinitions, setCorrectDefinitions] = useState([]);
  const [allDefinitions, setAllDefinitions] = useState([]);
  const [droppedItems, setDroppedItems] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [flashColor, setFlashColor] = useState('');
  const [isFlashing, setIsFlashing] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);

  // Clean definition text - remove quotes, extra punctuation, and keep only letters/spaces
  const cleanDefinition = (def) => {
    if (!def) return '';
    return def
      .replace(/["""'']/g, '') // Remove quotes
      .replace(/[^\w\s;,.()/-]/g, '') // Keep only letters, numbers, spaces, and basic punctuation
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  };

  // Parse CSV data
  const parsePairsCSV = (csvText) => {
    const lines = csvText.trim().split('\n').slice(1); // Skip header
    return lines.map(line => {
      const parts = line.split(',');
      return {
        rank: parseFloat(parts[0]),
        unvocalized: parts[1],
        def1: cleanDefinition(parts[3]), // short_definition_homograph_1
        def2: cleanDefinition(parts[5])  // short_definition_homograph_2
      };
    }).filter(item => item.unvocalized && item.def1 && item.def2);
  };

  const parseTripletsCSV = (csvText) => {
    const lines = csvText.trim().split('\n').slice(1); // Skip header
    return lines.map(line => {
      const parts = line.split(',');
      return {
        rank: parseFloat(parts[0]),
        unvocalized: parts[1],
        def1: cleanDefinition(parts[3]), // short_definition_homograph_1
        def2: cleanDefinition(parts[5]), // short_definition_homograph_2
        def3: cleanDefinition(parts[7])  // short_definition_homograph_3
      };
    }).filter(item => item.unvocalized && item.def1 && item.def2 && item.def3);
  };

  const loadNewGame = async () => {
    try {
      // Fetch CSV files from public folder
      const pairsResponse = await fetch('/homograph_pairs.csv');
      const tripletsResponse = await fetch('/homograph_triplets.csv');
      
      const pairsText = await pairsResponse.text();
      const tripletsText = await tripletsResponse.text();
      
      const pairs = parsePairsCSV(pairsText);
      const triplets = parseTripletsCSV(tripletsText);
      const allHomographs = [...pairs, ...triplets];
      
      if (allHomographs.length === 0) {
        console.error('No valid homographs found');
        return;
      }
      
      // Pick a random homograph
      const randomHomograph = allHomographs[Math.floor(Math.random() * allHomographs.length)];
      
      setCurrentHomograph(randomHomograph.unvocalized);
      
      // Set correct definitions for this homograph
      const correct = [randomHomograph.def1, randomHomograph.def2];
      if (randomHomograph.def3) {
        correct.push(randomHomograph.def3);
      }
      setCorrectDefinitions(correct);
      
      // Create a pool of all definitions including correct ones and some incorrect ones
      const incorrectDefs = [];
      const otherHomographs = allHomographs.filter(h => h.unvocalized !== randomHomograph.unvocalized);
      
      // Add some random incorrect definitions
      const shuffledOthers = otherHomographs.sort(() => 0.5 - Math.random()).slice(0, 4);
      shuffledOthers.forEach(h => {
        incorrectDefs.push(h.def1, h.def2);
        if (h.def3) incorrectDefs.push(h.def3);
      });
      
      // Combine and shuffle all definitions
      const allDefs = [...correct, ...incorrectDefs.slice(0, 6)].sort(() => 0.5 - Math.random());
      setAllDefinitions(allDefs);
      
      // Reset game state
      setDroppedItems([]);
      setGameComplete(false);
      
    } catch (error) {
      console.error('Error loading CSV files:', error);
      // Fallback data for demo
      setCurrentHomograph('ܒܪܐ');
      setCorrectDefinitions(['son', 'to create', 'exterior open country']);
      setAllDefinitions(['son', 'to create', 'exterior open country', 'king', 'father', 'book', 'wine', 'fire', 'peace']);
      setDroppedItems([]);
      setGameComplete(false);
    }
  };

  useEffect(() => {
    loadNewGame();
  }, []);

  useEffect(() => {
    // Check if game is complete
    if (droppedItems.length === correctDefinitions.length && correctDefinitions.length > 0) {
      setGameComplete(true);
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
      
      setTimeout(() => {
        setIsFlashing(false);
        setFlashColor('');
      }, 500);

      // Remove the incorrect definition
      setAllDefinitions(prev => prev.filter(d => d !== droppedDef));
    }
    
    setDraggedItem(null);
  };

  // Calculate positions for circular arrangement
  const getCircularPosition = (index, total) => {
    const angle = (index * 2 * Math.PI) / total;
    const radius = Math.min(200, 150 + total * 8); // Smaller radius
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { x, y };
  };

  const containerStyles = {
    height: '100vh',
    background: 'linear-gradient(135deg, #f5f1e8 0%, #e8dcc6 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    transition: 'all 0.5s ease',
    overflow: 'hidden',
    ...(isFlashing && flashColor === 'correct' ? { background: 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)' } : {}),
    ...(isFlashing && flashColor === 'incorrect' ? { background: 'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)' } : {})
  };

  const headerStyles = {
    textAlign: 'center',
    marginBottom: '15px'
  };

  const titleStyles = {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#5d4e37',
    marginBottom: '5px'
  };

  const subtitleStyles = {
    color: '#8b7765',
    fontSize: '0.85rem'
  };

  const gameAreaStyles = {
    position: 'relative',
    width: '600px',
    height: '500px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const dropZoneStyles = {
    position: 'absolute',
    background: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '15px',
    border: '3px dashed #c4b59a',
    padding: '20px',
    minWidth: '180px',
    minHeight: '140px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 10
  };

  const homographWordStyles = {
    fontSize: '2.2rem',
    fontWeight: 'bold',
    color: '#5d4e37',
    marginBottom: '15px',
    fontFamily: 'serif'
  };

  const droppedDefinitionStyles = {
    background: 'rgba(40, 167, 69, 0.1)',
    color: '#28a745',
    padding: '6px 10px',
    borderRadius: '6px',
    margin: '3px 0',
    fontSize: '0.8rem',
    fontWeight: '500',
    border: '1px solid rgba(40, 167, 69, 0.3)'
  };

  const definitionOptionStyles = {
    position: 'absolute',
    background: 'rgba(255, 255, 255, 0.95)',
    border: '2px solid #d0c4a8',
    borderRadius: '10px',
    padding: '8px 12px',
    cursor: 'grab',
    userSelect: 'none',
    maxWidth: '120px',
    textAlign: 'center',
    fontSize: '0.8rem',
    fontWeight: '500',
    color: '#5d4e37',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease',
    lineHeight: '1.2',
    transform: 'translate(-50%, -50%)'
  };

  const progressContainerStyles = {
    marginTop: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  };

  const progressTextStyles = {
    fontSize: '0.8rem',
    color: '#5d4e37'
  };

  const progressBarStyles = {
    background: 'rgba(208, 196, 168, 0.3)',
    borderRadius: '8px',
    height: '10px',
    width: '120px',
    overflow: 'hidden'
  };

  const progressFillStyles = {
    background: 'linear-gradient(90deg, #4682b4 0%, #5a9fd4 100%)',
    height: '100%',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    width: `${(droppedItems.length / correctDefinitions.length) * 100}%`
  };

  const buttonStyles = {
    marginTop: '10px',
    background: 'linear-gradient(135deg, #4682b4 0%, #5a9fd4 100%)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '0.85rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 3px 8px rgba(70, 130, 180, 0.3)'
  };

  const modalStyles = {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  };

  const modalContentStyles = {
    background: 'white',
    borderRadius: '20px',
    padding: '40px',
    textAlign: 'center',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
    maxWidth: '500px',
    margin: '20px'
  };

  return (
    <div style={containerStyles}>
      {/* Header */}
      <div style={headerStyles}>
        <h1 style={titleStyles}>Syriac Homograph Game</h1>
        <p style={subtitleStyles}>Drag the correct definitions to the Syriac word</p>
      </div>

      {/* Game Area */}
      <div style={gameAreaStyles}>
        {/* Central homograph word with drop zone */}
        <div 
          style={dropZoneStyles}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div style={homographWordStyles}>
            {currentHomograph}
          </div>
          
          {/* Dropped correct definitions */}
          <div>
            {droppedItems.map((item, index) => (
              <div key={index} style={droppedDefinitionStyles}>
                ✓ {item}
              </div>
            ))}
          </div>
          
          {droppedItems.length === 0 && (
            <div style={{ color: '#999', fontSize: '0.9rem', marginTop: '10px' }}>
              Drop definitions here
            </div>
          )}
        </div>

        {/* Circular arrangement of definitions */}
        {allDefinitions.map((definition, index) => {
          const position = getCircularPosition(index, allDefinitions.length);
          return (
            <div
              key={definition}
              style={{
                ...definitionOptionStyles,
                left: `calc(50% + ${position.x}px)`,
                top: `calc(50% + ${position.y}px)`
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, definition)}
              onMouseEnter={(e) => {
                e.target.style.background = 'white';
                e.target.style.borderColor = '#4682b4';
                e.target.style.transform = 'translate(-50%, -50%) scale(1.05)';
                e.target.style.boxShadow = '0 6px 20px rgba(70, 130, 180, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.95)';
                e.target.style.borderColor = '#d0c4a8';
                e.target.style.transform = 'translate(-50%, -50%) scale(1)';
                e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
              }}
            >
              {definition}
            </div>
          );
        })}

        {/* Success message */}
        {gameComplete && (
          <div style={modalStyles}>
            <div style={modalContentStyles}>
              <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎉</div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#5d4e37', marginBottom: '15px' }}>
                Congratulations!
              </h2>
              <p style={{ color: '#8b7765', marginBottom: '30px' }}>
                You found all the correct definitions for <span style={{ fontWeight: 'bold', fontFamily: 'serif' }}>{currentHomograph}</span>!
              </p>
              <button 
                onClick={loadNewGame}
                style={buttonStyles}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 16px rgba(70, 130, 180, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(70, 130, 180, 0.3)';
                }}
              >
                New Game
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Progress indicator */}
      <div style={progressContainerStyles}>
        <div style={progressTextStyles}>
          Progress: {droppedItems.length} / {correctDefinitions.length}
        </div>
        <div style={progressBarStyles}>
          <div style={progressFillStyles}></div>
        </div>
      </div>

      {/* New Game Button */}
      <button 
        onClick={loadNewGame}
        style={{
          ...buttonStyles,
          background: 'rgba(139, 119, 101, 0.8)',
          boxShadow: '0 4px 12px rgba(139, 119, 101, 0.3)'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'rgba(139, 119, 101, 1)';
          e.target.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'rgba(139, 119, 101, 0.8)';
          e.target.style.transform = 'translateY(0)';
        }}
      >
        New Game
      </button>
    </div>
  );
};

export default HomographGame;