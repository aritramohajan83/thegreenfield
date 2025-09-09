const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDatabase } = require('../config/database');
const router = express.Router();

// Get latest updates
router.get('/updates', (req, res) => {
  const db = getDatabase();
  
  db.all(`
    SELECT * FROM updates 
    ORDER BY is_featured DESC, created_at DESC 
    LIMIT 10
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get ground pricing
router.get('/pricing', (req, res) => {
  const pricing = {
    ground1: {
      name: 'Football Ground',
      peakHours: { start: '17:00', end: '22:00', price: 800 },
      offPeakHours: { start: '06:00', end: '17:00', price: 600 },
      facilities: ['Floodlights', 'Changing Rooms', 'Water Facility']
    },
    ground2: {
      name: 'Cricket Ground', 
      peakHours: { start: '17:00', end: '22:00', price: 1000 },
      offPeakHours: { start: '06:00', end: '17:00', price: 800 },
      facilities: ['Floodlights', 'Changing Rooms', 'Boundary Ropes', 'Scoreboard']
    }
  };
  
  res.json(pricing);
});

// Contact form
router.post('/contact', [
  body('name').notEmpty().trim().escape(),
  body('email').isEmail().normalizeEmail(),
  body('message').notEmpty().trim().escape()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, message } = req.body;
  const db = getDatabase();

  // Log the contact inquiry
  db.run(`
    INSERT INTO analytics (event_type, event_data)
    VALUES (?, ?)
  `, ['contact_form', JSON.stringify({ name, email, message })], (err) => {
    if (err) {
      console.error('Failed to log contact form:', err);
    }
  });

  res.json({ message: 'Thank you for your message. We will get back to you soon!' });
});

module.exports = router;