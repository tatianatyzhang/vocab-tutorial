import React, { useState, useEffect } from 'react';
import './HomographGame.css';

const HomographGame = () => {
  const [homograph, setHomograph] = useState('');
  const [definitions, setDefinitions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [droppedItems, setDroppedItems] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [flashColor, setFlashColor] = useState('');
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    fetch('/test_homographs.csv')
      .then(response => response.text())
      .then(text => {
        const rows = text.split('\n').slice(1);
        const firstRow = rows[0].split(',');
        setHomograph(firstRow[0]);
        const defs = rows.map(row => {
            const columns = row.split(',');
            return columns[1];
        });
        setDefinitions(defs);
        const ans = rows.reduce((acc, row) => {
            const columns = row.split(',');
            acc[columns[1]] = columns[2].trim();
            return acc;
        }, {});
        setAnswers(ans);
      });
  }, []);

  const handleDragStart = (e, def) => {
    console.log('Drag started with:', def);
    setDraggedItem(def);
    e.dataTransfer.setData('text/plain', def);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    console.log('Dragging over drop zone');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Drop event triggered');
    
    const droppedDef = e.dataTransfer.getData('text/plain') || draggedItem;
    console.log('Dropped definition:', droppedDef);
    console.log('Available answers:', answers);
    
    if (droppedDef && answers[droppedDef]) {
      const isCorrect = answers[droppedDef] === 'CORRECT';
      console.log('Is correct:', isCorrect);
      
      // Flash screen
      setFlashColor(isCorrect ? 'correct' : 'incorrect');
      setIsFlashing(true);
      
      setTimeout(() => {
        setIsFlashing(false);
        setFlashColor('');
      }, 500);

      if (isCorrect) {
        setDroppedItems(prev => [...prev, droppedDef]);
        setDefinitions(prev => prev.filter(d => d !== droppedDef));
      } else {
        // Remove incorrect definitions too, but don't add to dropped items
        setDefinitions(prev => prev.filter(d => d !== droppedDef));
      }
      
      setDraggedItem(null);
    } else {
      console.log('No definition found or no answer available');
    }
  };

  // Calculate positions for circular arrangement
  const getCircularPosition = (index, total) => {
    const angle = (index * 2 * Math.PI) / total;
    const radius = 280;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { x, y };
  };

  return (
    <div className={`homograph-game-container ${isFlashing ? `flash-${flashColor}` : ''}`}>
      <div className="game-area">
        {/* Central homograph word */}
        <div 
          className="homograph-center"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="homograph-word">{homograph}</div>
          <div className="dropped-definitions">
            {droppedItems.map((item, index) => (
              <div key={index} className="dropped-definition">
                ✓ {item}
              </div>
            ))}
          </div>
        </div>

        {/* Circular arrangement of definitions */}
        <div className="definitions-circle">
          {definitions.map((def, index) => {
            const position = getCircularPosition(index, definitions.length);
            return (
              <div
                key={def}
                className="definition-option"
                style={{
                  left: `calc(50% + ${position.x}px)`,
                  top: `calc(50% + ${position.y}px)`,
                  transform: 'translate(-50%, -50%)'
                }}
                draggable
                onDragStart={(e) => handleDragStart(e, def)}
              >
                {def}
              </div>
            );
          })}
        </div>

        {/* Success message */}
        {definitions.length === 0 && (
          <div className="success-message">
            🎉 Congratulations! You found all the correct definitions! 🎉
          </div>
        )}
      </div>
    </div>
  );
};

export default HomographGame;