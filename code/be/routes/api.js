const express = require('express');
const router = express.Router();

// Sample data for demonstration
let words = [
  { id: 1, word: 'example', filtered: false },
  { id: 2, word: 'test', filtered: true },
  { id: 3, word: 'sample', filtered: false }
];

// GET all words
router.get('/words', (req, res) => {
  try {
    res.json({
      success: true,
      data: words,
      count: words.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET word by ID
router.get('/words/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const word = words.find(w => w.id === id);
    
    if (!word) {
      return res.status(404).json({
        success: false,
        error: 'Word not found'
      });
    }
    
    res.json({
      success: true,
      data: word
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST new word
router.post('/words', (req, res) => {
  try {
    const { word, filtered = false } = req.body;
    
    if (!word) {
      return res.status(400).json({
        success: false,
        error: 'Word is required'
      });
    }
    
    const newWord = {
      id: words.length > 0 ? Math.max(...words.map(w => w.id)) + 1 : 1,
      word: word.toLowerCase(),
      filtered: filtered
    };
    
    words.push(newWord);
    
    res.status(201).json({
      success: true,
      data: newWord,
      message: 'Word added successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT update word
router.put('/words/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const wordIndex = words.findIndex(w => w.id === id);
    
    if (wordIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Word not found'
      });
    }
    
    const { word, filtered } = req.body;
    
    if (word !== undefined) {
      words[wordIndex].word = word.toLowerCase();
    }
    if (filtered !== undefined) {
      words[wordIndex].filtered = filtered;
    }
    
    res.json({
      success: true,
      data: words[wordIndex],
      message: 'Word updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE word
router.delete('/words/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const wordIndex = words.findIndex(w => w.id === id);
    
    if (wordIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Word not found'
      });
    }
    
    const deletedWord = words.splice(wordIndex, 1)[0];
    
    res.json({
      success: true,
      data: deletedWord,
      message: 'Word deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Filter text endpoint
router.post('/filter', (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }
    
    const filteredWords = words.filter(w => w.filtered).map(w => w.word);
    let filteredText = text.toLowerCase();
    
    filteredWords.forEach(word => {
      const regex = new RegExp(word, 'gi');
      filteredText = filteredText.replace(regex, '*'.repeat(word.length));
    });
    
    res.json({
      success: true,
      data: {
        originalText: text,
        filteredText: filteredText,
        wordsFiltered: filteredWords
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;