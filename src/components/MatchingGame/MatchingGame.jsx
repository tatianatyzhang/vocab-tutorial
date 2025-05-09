import React, { useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import './MatchingGame.css';

const words = [
  { id: 1, Syriac: "ܨܠܳܐ", English: "pray", image: "images/pray.jpg" },
  { id: 2, Syriac: "ܥܡܰܕ݂", English: "be baptized", image: "images/baptize.jpg" },
  { id: 3, Syriac: "ܣܓ݂ܶܕ݂", English: "worship", image: "images/worship.jpg" },
  { id: 4, Syriac: "ܫܡܫ", English: "minister", image: "images/minister.jpg" },
  { id: 5, Syriac: "ܓܕܦ", English: "blaspheme", image: "images/blaspheme.jpg" },
  { id: 6, Syriac: "ܝܺܡܳܐ", English: "swear", image: "images/swear.jpg" },
  { id: 7, Syriac: "ܢܒ݂ܳܐ", English: "prophecy", image: "images/prophecy.jpg" },
  { id: 8, Syriac: "ܡܫܰܚ", English: "anoint", image: "images/anoint.jpg" },
];

// Utility function to shuffle arrays
const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

// Draggable Syriac Word Component
const DraggableWord = ({ word }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "WORD",
    item: { id: word.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        padding: "10px",
        margin: "10px",
        border: "2px solid black",
        cursor: "grab",
        backgroundColor: "#f9f9f9",
        textAlign: "center",
        fontSize: "24px",
        fontWeight: "bold",
        borderRadius: "8px",
        width: "180px",
        height: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {word.Syriac}
    </div>
  );
};

// Droppable Image with English Word
const DroppableImage = ({ image, onDrop, matchedWord }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "WORD",
    drop: (item) => onDrop(item.id, image.id),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={matchedWord ? null : drop}
      style={{
        width: "180px",
        minHeight: matchedWord ? "180px" : "120px",
        padding: "10px",
        border: "2px solid black",
        backgroundColor: matchedWord ? "#f8d7da" : isOver ? "#ddd" : "white",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        borderRadius: "8px",
      }}
    >
      {matchedWord && (
        <div
          style={{
            width: "100%",
            padding: "10px",
            fontSize: "24px",
            fontWeight: "bold",
            textAlign: "center",
            borderBottom: "2px solid black",
            marginBottom: "10px",
          }}
        >
          {matchedWord.Syriac}
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "110px",
          flexGrow: 1,
        }}
      >
        <img src={image.image} alt={image.English} style={{ maxHeight: "100px", maxWidth: "120px" }} />
      </div>
      <p style={{ fontSize: "18px", fontWeight: "bold", marginTop: "10px" }}>{image.English}</p>
    </div>
  );
};

// Game Board Component
const GameBoard = () => {
  const [score, setScore] = useState(0);
  const [shuffledWords, setShuffledWords] = useState(shuffleArray(words));
  const [shuffledImages, setShuffledImages] = useState(shuffleArray(words));
  const [matchedPairs, setMatchedPairs] = useState({});

  // Restart game and reshuffle
  const restartGame = () => {
    setShuffledWords(shuffleArray(words));
    setShuffledImages(shuffleArray(words));
    setMatchedPairs({});
    setScore(0);
  };

  // Handle a correct drop
  const handleDrop = (wordId, imageId) => {
    if (wordId === imageId) {
      setMatchedPairs((prev) => ({
        ...prev,
        [wordId]: words.find((word) => word.id === wordId),
      }));
      setScore((prev) => prev + 1);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>
      <h2>Match the Syriac Words to the Correct Images</h2>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: "80px",
          marginTop: "20px",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "20px",
            justifyContent: "center",
            placeItems: "center",
          }}
        >
          {shuffledWords.map(
            (word) =>
              !matchedPairs[word.id] && <DraggableWord key={word.id} word={word} />
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "20px",
            justifyContent: "center",
            placeItems: "center",
          }}
        >
          {shuffledImages.map((image) => (
            <DroppableImage
              key={image.id}
              image={image}
              onDrop={handleDrop}
              matchedWord={matchedPairs[image.id]}
            />
          ))}
        </div>
      </div>

      <h3 style={{ marginTop: "20px" }}>Score: {score}</h3>

      <button
        onClick={restartGame}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          fontSize: "16px",
          cursor: "pointer",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "5px",
        }}
      >
        Restart Game
      </button>
    </div>
  );
};

// Main Component Export
export default function MatchingGame() {
  return <GameBoard />;
}