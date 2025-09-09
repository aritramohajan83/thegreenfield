const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDatabase } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Apply authentication and admin requirement to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Helper function to convert time to minutes
function timeToMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

// Dashboard statistics
router.get('/dashboard', (req, res) => {
  const db = getDatabase();
  
  const today = new Date().toISOString().split('T')[0];
  const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  console.log('Dashboard request from user:', req.user);

  Promise.all([
    // Today's bookings
    new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue 
        FROM bookings 
        WHERE booking_date = ? AND booking_status != 'cancelled'
      `, [today], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    }),
    
    // Weekly stats
    new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue 
        FROM bookings 
        WHERE booking_date >= ? AND booking_status != 'cancelled'
      `, [thisWeek], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    }),

    // Monthly stats
    new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue 
        FROM bookings 
        WHERE booking_date >= ? AND booking_status != 'cancelled'
      `, [thisMonth], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    }),

    // Pending approvals
    new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count 
        FROM bookings 
        WHERE booking_status = 'pending'
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    }),

    // Monthly revenue for chart
    new Promise((resolve, reject) => {
      db.all(`
        SELECT strftime('%Y-%m', booking_date) as month, 
               COUNT(*) as bookings, 
               COALESCE(SUM(total_amount), 0) as revenue
        FROM bookings
        WHERE booking_status != 'cancelled'
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    })
  ]).then(([today, weekly, monthly, pending, monthlyRevenue]) => {
    const dashboardData = {
      today: { bookings: today.count || 0, revenue: today.revenue || 0 },
      weekly: { bookings: weekly.count || 0, revenue: weekly.revenue || 0 },
      monthly: { bookings: monthly.count || 0, revenue: monthly.revenue || 0 },
      pendingApprovals: pending.count || 0,
      monthlyRevenue: monthlyRevenue || []
    };
    
    console.log('Sending dashboard data:', dashboardData);
    res.json({
      today: { bookings: today.count || 0, revenue: today.revenue || 0 },
      weekly: { bookings: weekly.count || 0, revenue: weekly.revenue || 0 },
      monthly: { bookings: monthly.count || 0, revenue: monthly.revenue || 0 },
      pendingApprovals: pending.count || 0,
      monthlyRevenue: monthlyRevenue || []
    });
  }).catch(err => {
    console.error('Dashboard data error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  });
});

// Get all bookings
router.get('/bookings', (req, res) => {
  const { status, date, ground } = req.query;
  const db = getDatabase();

  console.log('Bookings request with filters:', { status, date, ground });
  let query = `
    SELECT b.*, u.name as user_name, u.email as user_email, u.phone as user_phone
    FROM bookings b
    LEFT JOIN users u ON b.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND b.booking_status = ?';
    params.push(status);
  }

  if (date) {
    query += ' AND b.booking_date = ?';
    params.push(date);
  }

  if (ground) {
    query += ' AND b.ground_number = ?';
    params.push(ground);
  }

  query += ' ORDER BY b.booking_date DESC, b.start_time DESC';

  console.log('Executing query:', query, 'with params:', params);
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log('Found bookings:', rows.length);
    res.json(rows);
  });
});

// Get single booking details
router.get('/bookings/:id', (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  db.get(`
    SELECT b.*, u.name as user_name, u.email as user_email, u.phone as user_phone
    FROM bookings b
    LEFT JOIN users u ON b.user_id = u.id
    WHERE b.id = ?
  `, [id], (err, booking) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json(booking);
  });
});

// Update booking status
router.put('/bookings/:id/status', [
  body('status').isIn(['pending', 'confirmed', 'cancelled']),
  body('paymentStatus').optional().isIn(['pending', 'paid', 'failed'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { status, paymentStatus } = req.body;
  const db = getDatabase();

  let query = 'UPDATE bookings SET booking_status = ?';
  const params = [status];

  if (paymentStatus) {
    query += ', payment_status = ?';
    params.push(paymentStatus);
  }

  query += ' WHERE id = ?';
  params.push(id);

  db.run(query, params, function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ message: 'Booking updated successfully' });
  });
});

// Create manual booking
router.post('/bookings/manual', [
  body('customerName').notEmpty().trim().escape(),
  body('customerPhone').notEmpty().trim(),
  body('groundNumber').isInt({ min: 1, max: 2 }),
  body('bookingDate').isISO8601().toDate(),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('playerCount').isInt({ min: 1, max: 22 }),
  body('totalAmount').isFloat({ min: 0 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    customerName,
    customerPhone,
    groundNumber,
    bookingDate,
    startTime,
    endTime,
    playerCount,
    totalAmount,
    notes
  } = req.body;

  const db = getDatabase();

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
      return res.status(500).json({ error: 'Database error' });
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

    // Calculate duration
    const duration = endMinutes - startMinutes;

    // Create manual booking
    const insertQuery = `
      INSERT INTO bookings (
        ground_number, booking_date, start_time, end_time,
        duration, player_count, total_amount, payment_method, payment_status,
        booking_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(insertQuery, [
      groundNumber, bookingDate, startTime, endTime, duration,
      playerCount, totalAmount, 'venue', 'paid', 'confirmed',
      `Manual booking by admin for: ${customerName} (${customerPhone}). ${notes || ''}`
    ], function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to create booking' });
      }

      res.status(201).json({
        message: 'Manual booking created successfully',
        bookingId: this.lastID
      });
    });
  });
});

// Get customers
router.get('/customers', (req, res) => {
  const db = getDatabase();
  
  db.all(`
    SELECT u.*, 
           COUNT(b.id) as total_bookings,
           COALESCE(SUM(b.total_amount), 0) as total_spent
    FROM users u
    LEFT JOIN bookings b ON u.id = b.user_id AND b.booking_status != 'cancelled'
    WHERE u.role = 'customer'
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get single customer details
router.get('/customers/:id', (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  Promise.all([
    // Get customer info
    new Promise((resolve, reject) => {
      db.get(`
        SELECT u.*, 
               COUNT(b.id) as total_bookings,
               COALESCE(SUM(b.total_amount), 0) as total_spent
        FROM users u
        LEFT JOIN bookings b ON u.id = b.user_id AND b.booking_status != 'cancelled'
        WHERE u.id = ? AND u.role = 'customer'
        GROUP BY u.id
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    }),
    
    // Get customer bookings
    new Promise((resolve, reject) => {
      db.all(`
        SELECT * FROM bookings 
        WHERE user_id = ? 
        ORDER BY booking_date DESC, start_time DESC
        LIMIT 10
      `, [id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    })
  ]).then(([customer, bookings]) => {
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({ customer, bookings });
  }).catch(err => {
    console.error('Customer details error:', err);
    res.status(500).json({ error: 'Failed to fetch customer details' });
  });
});

// Get all updates for management
router.get('/updates', (req, res) => {
  const db = getDatabase();
  
  db.all(`
    SELECT * FROM updates 
    ORDER BY created_at DESC
  `, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Create new update
router.post('/updates', [
  body('title').notEmpty().trim().escape(),
  body('content').notEmpty().trim().escape(),
  body('imageUrl').optional().isURL(),
  body('isFeatured').optional().isBoolean()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, content, imageUrl, isFeatured } = req.body;
  const db = getDatabase();

  db.run(`
    INSERT INTO updates (title, content, image_url, is_featured)
    VALUES (?, ?, ?, ?)
  `, [title, content, imageUrl || null, isFeatured ? 1 : 0], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to create update' });
    }

    res.status(201).json({
      message: 'Update created successfully',
      updateId: this.lastID
    });
  });
});

// Update existing update
router.put('/updates/:id', [
  body('title').notEmpty().trim().escape(),
  body('content').notEmpty().trim().escape(),
  body('imageUrl').optional().isURL(),
  body('isFeatured').optional().isBoolean()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { title, content, imageUrl, isFeatured } = req.body;
  const db = getDatabase();

  db.run(`
    UPDATE updates 
    SET title = ?, content = ?, image_url = ?, is_featured = ?
    WHERE id = ?
  `, [title, content, imageUrl || null, isFeatured ? 1 : 0, id], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to update' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Update not found' });
    }

    res.json({ message: 'Update updated successfully' });
  });
});

// Delete update
router.delete('/updates/:id', (req, res) => {
  const { id } = req.params;
  const db = getDatabase();

  db.run('DELETE FROM updates WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to delete update' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Update not found' });
    }

    res.json({ message: 'Update deleted successfully' });
  });
});

// Analytics
router.get('/analytics', (req, res) => {
  const db = getDatabase();

  Promise.all([
    // Popular time slots
    new Promise((resolve, reject) => {
      db.all(`
        SELECT start_time, COUNT(*) as bookings
        FROM bookings
        WHERE booking_status != 'cancelled'
        GROUP BY start_time
        ORDER BY bookings DESC
        LIMIT 10
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }),

    // Ground utilization
    new Promise((resolve, reject) => {
      db.all(`
        SELECT ground_number, COUNT(*) as bookings, COALESCE(SUM(total_amount), 0) as revenue
        FROM bookings
        WHERE booking_status != 'cancelled'
        GROUP BY ground_number
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }),

    // Monthly revenue
    new Promise((resolve, reject) => {
      db.all(`
        SELECT strftime('%Y-%m', booking_date) as month, 
               COUNT(*) as bookings, 
               COALESCE(SUM(total_amount), 0) as revenue
        FROM bookings
        WHERE booking_status != 'cancelled'
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    })
  ]).then(([popularSlots, groundStats, monthlyRevenue]) => {
    res.json({
      popularSlots,
      groundStats,
      monthlyRevenue
    });
  }).catch(err => {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  });
});

module.exports = router;