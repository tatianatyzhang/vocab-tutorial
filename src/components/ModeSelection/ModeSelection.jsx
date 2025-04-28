import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import './ModeSelection.css';
import { Box, Typography, FormControlLabel, Switch } from '@mui/material';

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

  // Dynamically update dropdown options based on selectionType
  const [dynamicOptions, setDynamicOptions] = useState([]);
  
  useEffect(() => {
    if (selectionType.value === 'theme') {
      setDynamicOptions([
        { value: '', label: 'Select Theme', isDisabled: true },
        { value: 'body-parts', label: 'Body Parts' },
        { value: 'ritual-religion', label: 'Ritual and Religion' },
        { value: 'government-law', label: 'Government and Law' },
      ]);
    } else if (selectionType.value === 'pos') {
      setDynamicOptions([
        { value: '', label: 'Select Part of Speech', isDisabled: true },
        { value: 'adjectives', label: 'Adjectives' },
        { value: 'adverbs', label: 'Adverbs' },
        { value: 'conjunctions', label: 'Conjunctions' },
        { value: 'nouns', label: 'Nouns' },
        { value: 'prepositions', label: 'Prepositions' },
        { value: 'pronouns', label: 'Pronouns' },
        { value: 'verbs', label: 'Verbs' },
      ]);
    } else {
      setDynamicOptions([]);
    }
  }, [selectionType]);  // Re-run when selectionType changes

  const isFrequencyDisabled = selectionType.value === 'theme';

  const openGameInNewTab = () => {
    // Open the game in a new tab based on the selected game type
    if (gameType.value === 'balloon' && themeOrPosSelection.value ==='ritual-religion') {
      localStorage.setItem('problemCount', problemCount.toString());
      window.open('/balloon', '_blank'); // Make sure /balloon is the correct route
    } else if (gameType.value === 'matching') {
      window.open('/matching', '_blank'); // Open matching game
    } else if (gameType.value === 'falling') {
      window.open('/falling', '_blank'); // Open falling words game
    }
  };

  return (
    <div className="panel wide-panel">
      <div className="dropdown-row" style={{ display: 'flex', gap: '10px', marginBottom: '20px', justifyContent: 'center' }}>
        <div className="dropdown-container">
          <Select
            value={gameType}
            onChange={(selectedOption) => setGameType(selectedOption)} // Store the full object
            options={gameOptions}
            isSearchable={false}
            styles={{ container: (provided) => ({ ...provided, width: 220 }) }}
          />
        </div>

        <div className="dropdown-container">
          <Select
            value={selectionType}
            onChange={(option) => {
              setSelectionType(option);
              setThemeOrPosSelection(null); // Reset theme or pos selection when selection type changes
            }}
            options={selectionTypeOptions}
            isSearchable={false}
            styles={{ container: (provided) => ({ ...provided, width: 220 }) }}
          />
        </div>

        {selectionType.value !== 'random' && (
          <div className="dropdown-container">
            <Select
              value={themeOrPosSelection}
              onChange={(selectedOption) => setThemeOrPosSelection(selectedOption)}
              options={dynamicOptions}
              isSearchable={false}
              styles={{ container: (provided) => ({ ...provided, width: 220 }) }}
            />
          </div>
        )}
      </div>

      <div className="frequency-row" style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '20px' }}>
        <div>
          <input
            type="number"
            min="1"
            max="6000"
            value={frequency.min}
            onChange={(e) => handleFrequencyChange(e, 'min')}
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
            onChange={(e) => handleFrequencyChange(e, 'max')}
            className="fixed-width-input"
            style={{ height: '20px', paddingTop: '10px', width: '220px', fontSize: '18px' }}
            disabled={isFrequencyDisabled}
          />
          <div className="input-label" style={{ color: isFrequencyDisabled ? '#999' : '#000' }}>
            {isFrequencyDisabled ? '--' : 'Max Frequency'}
          </div>
        </div>
      </div>

      <Box className="vocalization-toggle" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
        <Typography style={{ marginRight: '10px' }}>Vocalization Mode:</Typography>
        <FormControlLabel
          control={<Switch checked={vocalization} onChange={() => setVocalization(!vocalization)} />}
          label={vocalization ? 'Vocalized' : 'Unvocalized'}
        />
      </Box>

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
            onChange={(e) => setProblemCount(parseInt(e.target.value))}
            className="problem-slider"
          />
          <div className="slider-value">{problemCount}</div>
        </div>
        <div className="slider-warning">
          <i>
            If the slider value exceeds the maximum possible number of unique
            prompts, the slider will be automatically readjusted.
          </i>
        </div>
      </div>

      <div className="start-button-container">
        <button
          className="start-button"
          onClick={openGameInNewTab}
        >
          Start Game
        </button>
      </div>
    </div>
  );
}