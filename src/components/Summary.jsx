import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../App';

function Summary({onClick }) {
    const navigate = useNavigate();
    const { incorrectWords, totalScore, setGameType, setSelectionType, setReviewWords, setSessionActive } = useSession();
    const [showReviewSelector, setShowReviewSelector] = useState(false);

    useEffect(() => {
        setReviewWords(incorrectWords);
      }, [incorrectWords]);

    const startReview = (type) => {
        setGameType(type);
        setSelectionType('review');
        setSessionActive(true); // Start a new session for review
        navigate('/game');
    };
    
    const endSession = () => {
        setSelectionType('random');
        setSessionActive(false);
        navigate('/');
    };

    return (  
        <div className="game-area">
        <h2>Summary of Game Session</h2>
        <h3>Total Score: {totalScore}</h3>
        <h3>Missed Words:</h3>
        <div>
        {incorrectWords.map((word, index) => (
            <div key={index}>
            {word.Syriac} → {word.English}
            </div>
        ))}
        </div>
        {incorrectWords.length > 0 && (
        <>
        <h3>Do you have more time?</h3>
        <p>Let's review the ones you missed!</p>
        <button onClick={() => setShowReviewSelector(true)}>Start Review</button>
        </>
        )} 
        {showReviewSelector && (
        <div className="modal-overlay">
            <div className="modal-content">
            <h3>Choose a Review Mode</h3>
            <button onClick={() => startReview('balloon')}>Balloon Game</button>
            <button onClick={() => startReview('falling')}>Falling Words</button>
            <button onClick={() => startReview('matching')}>Matching Game</button>
            <button onClick={() => setShowReviewSelector(false)}>Cancel</button>
            </div>
        </div>
        )}
        <div style={{ marginTop: '2rem' }}>
            <button className="start-button" onClick={endSession}>End Session</button>
        </div>
      </div>
    );
  }
  
  export default Summary;