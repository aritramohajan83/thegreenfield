const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { getDatabase } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Configure multer for payment screenshots
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/payments/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'payment-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Helper function to convert time to minutes
function timeToMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

// Check specific time availability
router.post('/check-availability', [
  body('groundNumber').isInt({ min: 1, max: 2 }),
  body('bookingDate').isISO8601().toDate(),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      available: false,
      message: 'Invalid input data',
      errors: errors.array() 
    });
  }

  const { groundNumber, bookingDate, startTime, endTime } = req.body;
  const db = getDatabase();

  // Check if date is within 7 days advance
  const requestDate = new Date(bookingDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));

  if (requestDate > maxDate) {
    return res.json({ 
      available: false, 
      message: 'Booking only available up to 7 days in advance' 
    });
  }

  if (requestDate < today) {
    return res.json({ 
      available: false, 
      message: 'Cannot book for past dates' 
    });
  }

  // Convert times to minutes for easier calculation
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  const query = `
    SELECT start_time, end_time 
    FROM bookings 
    WHERE ground_number = ? AND booking_date = ? AND booking_status != 'cancelled'
  `;

  db.all(query, [groundNumber, bookingDate], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ 
        available: false, 
        message: 'Database error occurred' 
      });
    }

    // Check for conflicts with 15-minute buffer
    for (const booking of rows) {
      const bookingStart = timeToMinutes(booking.start_time);
      const bookingEnd = timeToMinutes(booking.end_time);
      
      // Check if there's overlap or insufficient buffer (15 minutes)
      if (
        (startMinutes >= bookingStart - 15 && startMinutes < bookingEnd + 15) ||
        (endMinutes > bookingStart - 15 && endMinutes <= bookingEnd + 15) ||
        (startMinutes <= bookingStart && endMinutes >= bookingEnd)
      ) {
        return res.json({
          available: false,
          message: `Time slot conflicts with existing booking (${booking.start_time} - ${booking.end_time}). Please allow 15 minutes buffer between bookings.`
        });
      }
    }

    res.json({
      available: true,
      message: 'Time slot is available!'
    });
  });
});

// Create booking
router.post('/create', authenticateToken, upload.single('paymentScreenshot'), [
  body('groundNumber').isInt({ min: 1, max: 2 }),
  body('bookingDate').isISO8601().toDate(),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('playerCount').isInt({ min: 1, max: 22 }),
  body('paymentMethod').isIn(['bkash', 'nagad', 'bank', 'venue']),
  body('totalAmount').isFloat({ min: 0 }),
  body('duration').isInt({ min: 60, max: 90 })
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Invalid input data',
        errors: errors.array() 
      });
    }

    const {
      groundNumber,
      bookingDate,
      startTime,
      endTime,
      duration,
      playerCount,
      paymentMethod,
      totalAmount,
      notes
    } = req.body;

    const db = getDatabase();

    // Check if date is within 7 days advance
    const requestDate = new Date(bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));

    if (requestDate > maxDate) {
      return res.status(400).json({ error: 'Booking only available up to 7 days in advance' });
    }

    if (requestDate < today) {
      return res.status(400).json({ error: 'Cannot book for past dates' });
    }

    // Check for conflicts with 15-minute buffer
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    const conflictQuery = `
      SELECT start_time, end_time 
      FROM bookings 
      WHERE ground_number = ? AND booking_date = ? 
      AND booking_status != 'cancelled'
    `;

    db.all(conflictQuery, [groundNumber, bookingDate], (err, existingBookings) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error occurred' });
      }

      // Check for conflicts
      for (const booking of existingBookings) {
        const bookingStart = timeToMinutes(booking.start_time);
        const bookingEnd = timeToMinutes(booking.end_time);
        
        if (
          (startMinutes >= bookingStart - 15 && startMinutes < bookingEnd + 15) ||
          (endMinutes > bookingStart - 15 && endMinutes <= bookingEnd + 15) ||
          (startMinutes <= bookingStart && endMinutes >= bookingEnd)
        ) {
          return res.status(400).json({ 
            error: `Time slot conflicts with existing booking (${booking.start_time} - ${booking.end_time}). Please allow 15 minutes buffer.` 
          });
        }
      }

      // Create booking
      const paymentStatus = paymentMethod === 'venue' ? 'pending' : 'pending';
      const paymentScreenshot = req.file ? req.file.filename : null;

      const insertQuery = `
        INSERT INTO bookings (
          user_id, ground_number, booking_date, start_time, end_time,
          duration, player_count, total_amount, payment_method, payment_status,
          payment_screenshot, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(insertQuery, [
        req.user.userId, groundNumber, bookingDate, startTime, endTime, duration,
        playerCount, totalAmount, paymentMethod, paymentStatus,
        paymentScreenshot, notes
      ], function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to create booking' });
        }

        // Log analytics
        db.run(`
          INSERT INTO analytics (event_type, event_data)
          VALUES (?, ?)
        `, ['booking_created', JSON.stringify({
          bookingId: this.lastID,
          userId: req.user.userId,
          ground: groundNumber,
          amount: totalAmount
        })]);

        res.status(201).json({
          message: 'Booking created successfully',
          bookingId: this.lastID
        });
      });
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({ error: 'Booking creation failed' });
  }
});

// Get user bookings
router.get('/my-bookings', authenticateToken, (req, res) => {
  const db = getDatabase();
  
  const query = `
    SELECT * FROM bookings 
    WHERE user_id = ? 
    ORDER BY booking_date DESC, start_time DESC
  `;

  console.log('Fetching bookings for user:', req.user.userId);

  db.all(query, [req.user.userId], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Filter out cancelled bookings but keep confirmed ones
    const activeBookings = rows.filter(booking => booking.booking_status !== 'cancelled');
    
    console.log('Found bookings for user:', activeBookings.length);
    console.log('Booking statuses:', activeBookings.map(b => ({ id: b.id, status: b.booking_status })));
    res.json(activeBookings);
  });
});

// Cancel booking
router.put('/cancel/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const db = getDatabase();

  db.run(`
    UPDATE bookings 
    SET booking_status = 'cancelled' 
    WHERE id = ? AND user_id = ? AND booking_status = 'pending'
  `, [id, req.user.userId], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Booking not found or cannot be cancelled' });
    }

    res.json({ message: 'Booking cancelled successfully' });
  });
});

module.exports = router;