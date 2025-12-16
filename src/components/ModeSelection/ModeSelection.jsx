/* --- START OF FILE ModeSelection.jsx --- */

import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import Papa from 'papaparse';
import { useNavigate } from 'react-router-dom';
import './ModeSelection.css';
import { Switch } from '@mui/material';
import { useSession } from '../../App';

export default function ModeSelection({
  gameType,
  setGameType,
  selectionType,
  setSelectionType,
  themeOrPosSelection,
  setThemeOrPosSelection,
  frequency,
  setFrequency,
  vocalization,
  setVocalization,
  gameDuration,
  setGameDuration,
}) {
  const navigate = useNavigate();
  const [availableCount, setAvailableCount] = useState(0);

  // Load CSV to confirm data availability and help with debugging
  useEffect(() => {
    // NOTE: Removed leading slash for relative path compatibility
    Papa.parse('vocab_list.csv', {
      header: true,
      download: true,
      complete: ({ data }) => {
          // Filter valid rows
          const validRows = data.filter(r => r.English && r.Frequency);
          setAvailableCount(validRows.length);
      },
    });
  }, []);

  const gameOptions = [
    { value: 'balloon', label: 'Balloon Game' },
    { value: 'matching', label: 'Matching Game' },
    { value: 'falling', label: 'Falling Words' },
    { value: 'defining-homograph', label: 'Defining Homographs' },
    { value: 'vocalizing-homograph', label: 'Vocalizing Homographs' },
  ];

  const selectionTypeOptions = [
    { value: 'random', label: 'Random Words' },
    { value: 'theme', label: 'By Theme' },
    { value: 'pos', label: 'By Part of Speech' },
  ];

  const handleFrequencyChange = (e, type) => {
    const value = e.target.value;
    // Allow empty string or numbers only
    if (value === '' || /^\d+$/.test(value)) {
      setFrequency({ ...frequency, [type]: value });
    }
  };

  const [dynamicOptions, setDynamicOptions] = useState([]);
  
  // Update sub-selection options based on main selection type
  useEffect(() => {
    if (selectionType === 'theme') {
      setDynamicOptions([
        { value: 'body-parts', label: 'Body Parts' },
        { value: 'ritual-religion', label: 'Ritual and Religion' },
        { value: 'government-law', label: 'Government and Law' },
      ]);
    } else if (selectionType === 'pos') {
      setDynamicOptions([
        { value: 'Adverb', label: 'Adverbs' },
        { value: 'Proper noun', label: 'Proper Nouns' },
        { value: 'Particle', label: 'Conjunctions' },
        { value: 'NounAdj', label: 'Nouns/Adjectives' },
        { value: 'Prep', label: 'Prepositions' },
        { value: 'Pronoun', label: 'Pronouns' },
        { value: 'Verb', label: 'Verbs' },
      ]);
    } else {
      setDynamicOptions([]);
    }
  }, [selectionType]);

  const isFrequencyDisabled = selectionType === 'theme' || selectionType === 'review';

  const startGame = () => {
    if (!gameType) {
      alert('Please select a game type.');
      return;
    }
    
    // Config object passed via router state
    navigate('/game', {
      state: {
        gameType,
        selectionType,
        themeOrPosSelection,
        frequency,
        vocalization,
        gameDuration, 
      }
    });
  };

  const { clearSession, setSessionActive, sessionActive, setReviewWords, incorrectWords } = useSession();

  const startSession = () => {
    clearSession();
    setSessionActive(true);
  }

  const endSession = () => {
    if (selectionType === 'review') {
      setSelectionType('random');
      setSessionActive(false);
      navigate('/');
    } else {
      setSessionActive(false);
      setReviewWords(incorrectWords);
      navigate('/summary');
    }
  }

  return (
    <div className="panel-container">
      <div className="panel">
        <h1>Syriac Vocabulary Games</h1>

        {/* Row 1: Game Type & Selection Mode */}
        <div className="control-row">
            <div className="control-item">
                <div className="label-text">Game Type</div>
                <Select
                    value={gameOptions.find(opt => opt.value === gameType)}
                    onChange={opt => setGameType(opt.value)}
                    options={gameOptions}
                    placeholder="Select Game..."
                    styles={{ container: prov => ({ ...prov, width: '100%' }) }}
                    className="react-select-container"
                    classNamePrefix="react-select"
                />
            </div>
            <div className="control-item">
                <div className="label-text">Selection Mode</div>
                <Select
                    value={selectionTypeOptions.find(opt => opt.value === selectionType)}
                    onChange={opt => { setSelectionType(opt.value); setThemeOrPosSelection(null); }}
                    options={selectionTypeOptions}
                    placeholder="Select Mode..."
                    styles={{ container: prov => ({ ...prov, width: '100%' }) }}
                    className="react-select-container"
                    classNamePrefix="react-select"
                />
            </div>
        </div>

        {/* Row 2: Sub-selection (Conditionally rendered, Centered) */}
        {selectionType !== 'random' && (
          <div className="control-row" style={{ justifyContent: 'center' }}>
            <div className="control-item" style={{ flex: '0 1 50%' }}>
              <div className="label-text">{selectionType === 'theme' ? 'Select Theme' : 'Select Part of Speech'}</div>
              <Select
                  value={themeOrPosSelection}
                  onChange={opt => setThemeOrPosSelection(opt)}
                  options={dynamicOptions}
                  placeholder="Choose..."
                  styles={{ container: prov => ({ ...prov, width: '100%' }) }}
                  className="react-select-container"
                  classNamePrefix="react-select"
              />
            </div>
          </div>
        )}

        {/* Row 3: Vocalization (Centered) */}
        <div className="control-row" style={{ justifyContent: 'center', marginTop: '10px' }}>
            <div className="control-item">
                 <div className="label-text">Vocalization</div>
                 <div className="switch-container">
                    <span>Unvocalized</span>
                    <Switch 
                        checked={vocalization} 
                        onChange={() => setVocalization(!vocalization)} 
                        color="warning"
                    />
                    <span>Vocalized</span>
                 </div>
            </div>
        </div>

        {/* Row 4: Frequency Range */}
        <div className="control-row" style={{justifyContent: 'center'}}>
            <div className="control-item" style={{flex: 0.8}}>
                <div className="label-text" style={{color: isFrequencyDisabled ? '#aaa' : 'rgb(101, 67, 33)'}}>
                    Word Frequency Ranking (1 = Most Common)
                </div>
                <div className="freq-input-group" style={{justifyContent: 'center'}}>
                    <input
                        type="number"
                        min="1"
                        max="6000"
                        value={frequency.min}
                        onChange={e => handleFrequencyChange(e, 'min')}
                        className="freq-input"
                        disabled={isFrequencyDisabled}
                        placeholder="Min"
                    />
                    <span>to</span>
                    <input
                        type="number"
                        min="1"
                        max="6000"
                        value={frequency.max}
                        onChange={e => handleFrequencyChange(e, 'max')}
                        className="freq-input"
                        disabled={isFrequencyDisabled}
                        placeholder="Max"
                    />
                </div>
            </div>
        </div>

        {/* Row 5: Game Duration Slider */}
        <div className="slider-section">
          <div className="label-text">Game Duration (Seconds)</div>
          <input
            type="range"
            min="30"
            max="300"
            step="10"
            value={gameDuration}
            onChange={e => setGameDuration(parseInt(e.target.value, 10))}
            className="problem-slider"
          />
          <div className="slider-value">{gameDuration} seconds</div>
        </div>

        {/* Start Button */}
        <div className="start-button-container">
          <button className="start-button" onClick={startGame}>
            Start Game
          </button>
        </div>

        {/* Session Controls */}
        <div className="session-controls">
            {!sessionActive ? (
            <button className="secondary-button" onClick={startSession}>Start Tracking Session</button>
            ) : (
            <div>
                <p><strong>Session Active:</strong> {incorrectWords.length} words missed so far.</p>
                <button className="secondary-button" onClick={endSession}>End Session & Review</button>
            </div>
            )}
            
            {/* Exit Button - Goes back to Main PHP Site */}
            <button 
              className="secondary-button" 
              style={{ marginTop: '20px', borderColor: '#d9534f', color: '#d9534f' }} 
              onClick={() => window.location.href = '../index.html'} 
            >
              Exit to Main Website
            </button>
        </div>
      </div>
    </div>
  );
}