import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import Papa from 'papaparse';
import { useNavigate } from 'react-router-dom';
import './ModeSelection.css';
import { Box, Typography, FormControlLabel, Switch } from '@mui/material';
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
  problemCount,
  setProblemCount,
}) {
  const navigate = useNavigate();

  // Full vocabulary list for computing available count
  const [allVocab, setAllVocab] = useState([]);
  const [availableCount, setAvailableCount] = useState(0);

  // Load CSV once to determine pool size for slider clamp
  useEffect(() => {
    Papa.parse('/vocab_list.csv', {
      header: true,
      download: true,
      complete: ({ data }) => setAllVocab(data.filter(r => r.English)),
    });
  }, []);

  // Compute how many unique prompts are available based on mode
  useEffect(() => {
    if (!allVocab.length) {
      setAvailableCount(0);
      return;
    }
    let pool = allVocab;
    if (selectionType === 'theme' && themeOrPosSelection) {
      pool = pool.filter(
        r => r['Vocabulary Category'] === themeOrPosSelection.label
      );
    } else if (selectionType === 'pos' && themeOrPosSelection) {
      pool = pool.filter(
        r => r['Grammatical Category'] === themeOrPosSelection.label
      );
    }
    setAvailableCount(pool.length);
  }, [allVocab, selectionType, themeOrPosSelection]);

  // Clamp slider value if it exceeds availableCount
  useEffect(() => {
    if (availableCount > 0 && problemCount > availableCount) {
      setProblemCount(availableCount);
    }
  }, [availableCount, problemCount, setProblemCount]);

  const gameOptions = [
    { value: '', label: 'Select' },
    { value: 'balloon', label: 'Balloon Game' },
    { value: 'matching', label: 'Matching Game' },
    { value: 'falling', label: 'Falling Words' },
  ];

  const selectionTypeOptions = [
    { value: 'random', label: 'Random Words' },
    { value: 'theme', label: 'By Theme' },
    { value: 'pos', label: 'By POS' },
  ];

  const handleFrequencyChange = (e, type) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setFrequency({ ...frequency, [type]: value });
    }
  };

  const [dynamicOptions, setDynamicOptions] = useState([]);
  useEffect(() => {
    if (selectionType === 'theme') {
      setDynamicOptions([
        { value: '', label: 'Select Theme', isDisabled: true },
        { value: 'body-parts', label: 'Body Parts' },
        { value: 'ritual-religion', label: 'Ritual and Religion' },
        { value: 'government-law', label: 'Government and Law' },
      ]);
    } else if (selectionType === 'pos') {
      setDynamicOptions([
        { value: '', label: 'Select Part of Speech', isDisabled: true },
        { value: 'Adverb', label: 'Adverbs' },
        { value: 'Proper noun', label: 'Proper Nouns' },
        { value: 'Particle', label: 'Conjunctions' },
        { value: 'NounAdj', label: 'Nouns' },
        { value: 'Prep', label: 'Prepositions' },
        { value: 'Pronoun', label: 'Pronouns' },
        { value: 'Verb', label: 'Verbs' },
      ]);
    } else {
      setDynamicOptions([]);
    }
  }, [selectionType]);

  const isFrequencyDisabled = selectionType === 'theme';

  const startGame = () => {
    if (!gameType) {
      alert('Please select a game type.');
      return;
    }
    navigate('/game');
  };

  const { clearSession, setSessionActive, sessionActive, reviewWords, setReviewWords, incorrectWords } = useSession();

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
    <div className="panel wide-panel">
      {/* Dropdowns */}
      <div className="dropdown-row" style={{ display: 'flex', gap: '10px', marginBottom: '20px', justifyContent: 'center' }}>
        <div className="dropdown-container">
          <Select
            value={gameOptions.find(opt => opt.value === gameType)}
            onChange={opt => setGameType(opt.value)}
            options={gameOptions}
            isSearchable={false}
            styles={{ container: prov => ({ ...prov, width: 220 }) }}
          />
        </div>
        <div className="dropdown-container">
          <Select
            value={selectionTypeOptions.find(opt => opt.value === selectionType)}
            onChange={opt => { setSelectionType(opt.value); setThemeOrPosSelection(null); }}
            options={selectionTypeOptions}
            isSearchable={false}
            styles={{ container: prov => ({ ...prov, width: 220 }) }}
          />
        </div>
        {selectionType !== 'random' && (
          <div className="dropdown-container">
            <Select
              value={themeOrPosSelection}
              onChange={opt => setThemeOrPosSelection(opt)}
              options={dynamicOptions}
              isSearchable={false}
              styles={{ container: prov => ({ ...prov, width: 220 }) }}
            />
          </div>
        )}
      </div>

      {/* Frequency inputs (unchanged) */}
      <div className="frequency-row" style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '20px' }}>
        <div>
          <input
            type="number"
            min="1"
            max="6000"
            value={frequency.min}
            onChange={e => handleFrequencyChange(e, 'min')}
            className="fixed-width-input"
            style={{ height: '20px', paddingTop: '10px', width: '220px', fontSize: '18px' }}
            disabled={isFrequencyDisabled}
          />
          <div className="input-label" style={{ color: isFrequencyDisabled ? '#999' : '#000' }}>
            {isFrequencyDisabled ? '--' : 'Min Frequency'}
          </div>
        </div>

        <div>
          <input
            type="number"
            min="1"
            max="6000"
            value={frequency.max}
            onChange={e => handleFrequencyChange(e, 'max')}
            className="fixed-width-input"
            style={{ height: '20px', paddingTop: '10px', width: '220px', fontSize: '18px' }}
            disabled={isFrequencyDisabled}
          />
          <div className="input-label" style={{ color: isFrequencyDisabled ? '#999' : '#000' }}>
            {isFrequencyDisabled ? '--' : 'Max Frequency'}
          </div>
        </div>
      </div>

      {/* Vocalization toggle */}
      <Box className="vocalization-toggle" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
        <Typography style={{ marginRight: '10px' }}>Vocalization Mode:</Typography>
        <FormControlLabel
          control={<Switch checked={vocalization} onChange={() => setVocalization(!vocalization)} />}
          label={vocalization ? 'Vocalized' : 'Unvocalized'}
        />
      </Box>

      {/* Slider with clamp behavior */}
      <div className="slider-section">
        <div style={{ fontWeight: 'bold' }} className="slider-question">
          How many problems would you like to do?
        </div>
        <div className="slider-wrapper">
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={problemCount}
            onChange={e => setProblemCount(parseInt(e.target.value, 10))}
            className="problem-slider"
          />
          <div className="slider-value">{problemCount}</div>
        </div>
        <div className="slider-warning">
          <i>
            If the slider value exceeds the maximum possible number of unique
            prompts, it will automatically readjust.
          </i>
        </div>
      </div>

      {/* Start button */}
      <div className="start-button-container">
        <button className="start-button" onClick={startGame}>
          Start Game
        </button>
      </div>

      <div className="game-session">
        <p>
        Test your Syriac vocabulary across multiple games! Start a session now and review your progress at the end.
        </p>
        {!sessionActive ? (
          <button onClick={startSession}>Start New Game Session</button>
        ) : (
          <button onClick={endSession}>End Session</button>
        )}
      </div>
    </div>
  );
}
