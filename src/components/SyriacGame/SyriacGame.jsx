import React, { useState, useEffect } from 'react';

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
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f0e6d2',
        color: '#4a5568',
        fontSize: '1.2rem',
        fontWeight: '500',
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔄</div>
        <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Loading Syriac words...</div>
        <div style={{ fontSize: '0.9rem', opacity: '0.7' }}>Preparing your vocabulary challenge</div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#f0e6d2',
      minHeight: '100vh',
      padding: '20px',
      fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '40px',
        color: '#4a5568'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          margin: '0 0 10px 0',
          color: '#2d3748',
          letterSpacing: '-0.025em'
        }}>
          Syriac Word Match
        </h1>
        <p style={{
          fontSize: '1.1rem',
          margin: '0 0 20px 0',
          color: '#718096',
          fontWeight: '400'
        }}>
          Drag the correct English definitions to match their vocalized forms
        </p>
        <div style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          color: '#4299e1',
          background: 'white',
          padding: '12px 24px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          display: 'inline-block'
        }}>
          Unvocalized: {gameData.unvocalized}
        </div>
      </div>

      {/* Words Container */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '40px',
        margin: '60px auto',
        width: '100%',
        maxWidth: '1200px',
        padding: '0 20px'
      }}>
        {gameData.words.map((word, index) => (
          <div
            key={word.id}
            style={{
              background: 'linear-gradient(145deg, #ffffff, #f8f9fa)',
              borderRadius: '20px',
              padding: '40px 30px',
              minHeight: '220px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
              border: '3px solid #e2e8f0',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer',
              animation: `slideIn${index === 0 ? 'Left' : 'Right'} 0.8s ease-out ${index * 0.2}s both`
            }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, word.id)}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#4299e1';
              e.target.style.transform = 'translateY(-8px) scale(1.02)';
              e.target.style.boxShadow = '0 20px 50px rgba(66, 153, 225, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#e2e8f0';
              e.target.style.transform = 'translateY(0) scale(1)';
              e.target.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.12)';
            }}
          >
            <div style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#2d3748',
              textAlign: 'center',
              marginBottom: '20px',
              lineHeight: '1.2'
            }}>
              {word.vocalized}
            </div>
            
            {droppedMeanings[word.id] ? (
              <div style={{
                background: 'linear-gradient(145deg, #e6fffa, #f0fff4)',
                color: '#00695c',
                padding: '16px 24px',
                borderRadius: '16px',
                fontWeight: '700',
                textAlign: 'center',
                fontSize: '1.05rem',
                boxShadow: '0 4px 16px rgba(0, 105, 92, 0.15)',
                border: '2px solid #b2dfdb',
                width: '100%',
                position: 'relative',
                animation: 'bounceIn 0.6s ease-out'
              }}>
                ✓ {droppedMeanings[word.id]}
              </div>
            ) : (
              <div style={{
                color: '#a0aec0',
                fontStyle: 'italic',
                textAlign: 'center',
                padding: '20px',
                border: '3px dashed #cbd5e0',
                borderRadius: '16px',
                background: 'linear-gradient(145deg, #f7fafc, #edf2f7)',
                fontSize: '1rem',
                fontWeight: '500',
                width: '100%',
                transition: 'all 0.3s ease'
              }}>
                Drop the correct definition here
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Meanings Container */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        width: '100%',
        maxWidth: '1000px',
        margin: '40px auto',
        padding: '0 20px'
      }}>
        {availableMeanings.map((meaning, index) => (
          <div
            key={`${meaning}-${index}`}
            style={{
              background: 'linear-gradient(145deg, #e3f2fd, #f3f8ff)',
              border: '2px solid #bbdefb',
              borderRadius: '16px',
              padding: '20px 24px',
              cursor: 'grab',
              userSelect: 'none',
              textAlign: 'center',
              fontSize: '1.05rem',
              fontWeight: '600',
              color: '#1565c0',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: `fadeInUp 0.8s ease-out ${index * 0.1 + 0.4}s both`,
              position: 'relative',
              overflow: 'hidden'
            }}
            draggable
            onDragStart={(e) => handleDragStart(e, meaning)}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(145deg, #bbdefb, #e1f5fe)';
              e.target.style.borderColor = '#2196f3';
              e.target.style.transform = 'translateY(-6px) scale(1.05)';
              e.target.style.boxShadow = '0 12px 30px rgba(33, 150, 243, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(145deg, #e3f2fd, #f3f8ff)';
              e.target.style.borderColor = '#bbdefb';
              e.target.style.transform = 'translateY(0) scale(1)';
              e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.1)';
            }}
            onMouseDown={(e) => {
              e.target.style.cursor = 'grabbing';
              e.target.style.transform = 'translateY(-2px) scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.target.style.cursor = 'grab';
            }}
          >
            {meaning}
          </div>
        ))}
      </div>

      {/* Feedback Message */}
      {feedback.show && (
        <div style={{
          position: 'fixed',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '16px 32px',
          borderRadius: '12px',
          fontSize: '1.2rem',
          fontWeight: '600',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          zIndex: '1000',
          animation: 'feedbackSlide 0.3s ease-out',
          background: feedback.correct ? '#e6fffa' : '#ffebee',
          color: feedback.correct ? '#00695c' : '#c62828',
          border: feedback.correct ? '1px solid #b2dfdb' : '1px solid #ffcdd2'
        }}>
          {feedback.message}
        </div>
      )}

      {/* Success Message */}
      {gameComplete && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          padding: '32px 48px',
          borderRadius: '20px',
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#2d3748',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          textAlign: 'center',
          animation: 'celebrationBounce 0.8s ease-out',
          border: '2px solid #e6fffa',
          zIndex: '1000'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>🎉</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#00695c' }}>Outstanding!</div>
          <div style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: '#4a5568' }}>Perfect match! You've mastered these Syriac words.</div>
          <button
            onClick={loadRandomWord}
            style={{
              background: 'linear-gradient(145deg, #4299e1, #3182ce)',
              color: 'white',
              border: 'none',
              padding: '16px 32px',
              borderRadius: '16px',
              fontSize: '1.1rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 6px 20px rgba(66, 153, 225, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(145deg, #3182ce, #2b77cb)';
              e.target.style.transform = 'translateY(-3px) scale(1.05)';
              e.target.style.boxShadow = '0 12px 30px rgba(66, 153, 225, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(145deg, #4299e1, #3182ce)';
              e.target.style.transform = 'translateY(0) scale(1)';
              e.target.style.boxShadow = '0 6px 20px rgba(66, 153, 225, 0.3)';
            }}
          >
            🔄 Next Challenge
          </button>
        </div>
      )}

      {/* Control Buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '1rem',
        marginTop: '2rem'
      }}>
        <button
          onClick={loadRandomWord}
          style={{
            background: 'linear-gradient(145deg, #718096, #4a5568)',
            color: 'white',
            border: 'none',
            padding: '16px 32px',
            borderRadius: '16px',
            fontSize: '1.1rem',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 6px 20px rgba(113, 128, 150, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'linear-gradient(145deg, #4a5568, #2d3748)';
            e.target.style.transform = 'translateY(-3px) scale(1.05)';
            e.target.style.boxShadow = '0 12px 30px rgba(113, 128, 150, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'linear-gradient(145deg, #718096, #4a5568)';
            e.target.style.transform = 'translateY(0) scale(1)';
            e.target.style.boxShadow = '0 6px 20px rgba(113, 128, 150, 0.3)';
          }}
        >
          🎲 New Word
        </button>
      </div>

      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes slideInLeft {
            from {
              opacity: 0;
              transform: translateX(-60px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes slideInRight {
            from {
              opacity: 0;
              transform: translateX(60px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes bounceIn {
            0% {
              opacity: 0;
              transform: scale(0.5);
            }
            50% {
              opacity: 1;
              transform: scale(1.05);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes celebrationBounce {
            0% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.8);
            }
            60% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1.05);
            }
            100% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
          }

          @keyframes feedbackSlide {
            0% {
              opacity: 0;
              transform: translateX(-50%) translateY(-20px);
            }
            100% {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
};

export default SyriacGame;