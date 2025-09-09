# The Green Field - Sports Booking System

A comprehensive sports field booking system built with Node.js, featuring real-time booking, payment management, and admin dashboard.

## Features

### Customer Features
- **Real-time Booking System**: Book football and cricket grounds up to 7 days in advance
- **Multiple Payment Options**: Bkash, Nagad, Bank Transfer, or Pay at Venue
- **Payment Screenshot Upload**: Upload payment proof for verification
- **User Registration & Login**: Secure customer accounts with booking history
- **Mobile Responsive**: Works perfectly on all devices
- **Live Updates**: Stay informed with latest news and offers

### Admin Features
- **Comprehensive Dashboard**: Real-time statistics and analytics
- **Booking Management**: Approve, reject, and manage all bookings
- **Payment Verification**: Verify payment screenshots and process payments
- **Customer Management**: View customer details and booking history
- **Manual Bookings**: Create bookings for walk-in customers
- **Analytics & Reports**: Business insights and performance metrics
- **Content Management**: Update news, offers, and announcements

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite (development) / MySQL (production)
- **Authentication**: JWT with bcrypt password hashing
- **File Upload**: Multer for payment screenshots
- **Security**: Helmet, CORS, Rate limiting
- **Frontend**: Vanilla JavaScript, CSS3, Chart.js

## Local Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
The `.env` file is already configured. Update the following if needed:
- `JWT_SECRET`: Change to a secure random string in production
- `ADMIN_EMAIL` & `ADMIN_PASSWORD`: Admin credentials (currently set as requested)

### 3. Initialize Database
The database will be automatically created when you first run the application.

### 4. Create Upload Directories
```bash
mkdir -p uploads/payments
```

### 5. Run the Application

#### Development Mode (with auto-restart)
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

The application will be available at:
- **Customer Site**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin.html

### 6. Default Admin Credentials
- **Email**: adminthegreenfieldofficial@gmail.com
- **Password**: Superadminoperation308$

## Hostinger Deployment Guide

### 1. Prepare Your Files

#### Upload Files to Hostinger
1. Compress your project into a ZIP file
2. Upload to your Hostinger hosting account via File Manager or FTP
3. Extract the files in your domain's public_html directory

#### For Node.js Applications on Hostinger:
Most shared hosting plans don't support Node.js. You'll need:
- **VPS Hosting** or **Cloud Hosting** from Hostinger
- **Hostinger's Node.js App** (if available in your plan)

### 2. Database Setup on Hostinger

#### If using MySQL (Recommended for Hostinger):

1. **Create MySQL Database**:
   - Go to Hostinger Control Panel
   - Navigate to "Databases" → "MySQL Databases"
   - Create a new database named `thegreenfielddb`
   - Create a database user with full privileges

2. **Update Database Configuration**:
   Create a new file `config/mysql-database.js`:
   ```javascript
   const mysql = require('mysql2');
   
   const pool = mysql.createPool({
     host: 'localhost', // or your Hostinger DB host
     user: 'your_db_user',
     password: 'your_db_password',
     database: 'thegreenfielddb',
     waitForConnections: true,
     connectionLimit: 10,
     queueLimit: 0
   });
   
   module.exports = pool.promise();
   ```

3. **Create MySQL Tables**:
   Run this SQL in your Hostinger MySQL panel:
   ```sql
   CREATE TABLE users (
     id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(255) NOT NULL,
     email VARCHAR(255) UNIQUE NOT NULL,
     phone VARCHAR(20),
     password VARCHAR(255) NOT NULL,
     role VARCHAR(50) DEFAULT 'customer',
     loyalty_points INT DEFAULT 0,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE bookings (
     id INT AUTO_INCREMENT PRIMARY KEY,
     user_id INT,
     ground_number INT NOT NULL,
     booking_date DATE NOT NULL,
     start_time TIME NOT NULL,
     end_time TIME NOT NULL,
     player_count INT NOT NULL,
     total_amount DECIMAL(10,2) NOT NULL,
     payment_method VARCHAR(50) NOT NULL,
     payment_status VARCHAR(50) DEFAULT 'pending',
     payment_screenshot VARCHAR(255),
     booking_status VARCHAR(50) DEFAULT 'pending',
     notes TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (user_id) REFERENCES users(id)
   );

   CREATE TABLE updates (
     id INT AUTO_INCREMENT PRIMARY KEY,
     title VARCHAR(255) NOT NULL,
     content TEXT NOT NULL,
     image_url VARCHAR(255),
     is_featured BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE analytics (
     id INT AUTO_INCREMENT PRIMARY KEY,
     event_type VARCHAR(100) NOT NULL,
     event_data TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

### 3. Environment Variables on Hostinger

Create `.env` file with your production values:
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your_very_secure_jwt_secret_change_this
BCRYPT_ROUNDS=12

# Database (Update with your Hostinger MySQL details)
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=thegreenfielddb

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# Admin Credentials
ADMIN_EMAIL=adminthegreenfieldofficial@gmail.com
ADMIN_PASSWORD=Superadminoperation308$
```

### 4. Install Dependencies on Server
```bash
npm install --production
```

### 5. Start the Application
```bash
npm start
```

### 6. Set Up Process Manager (PM2)
For production, use PM2 to keep your app running:
```bash
npm install -g pm2
pm2 start server.js --name "green-field"
pm2 startup
pm2 save
```

### 7. Configure Web Server (Nginx/Apache)
If using VPS, configure your web server to proxy requests to your Node.js app:

#### Nginx Configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Alternative: Shared Hosting Setup

If you only have shared hosting (no Node.js support), you can:

1. **Convert to PHP Version**: Contact support to convert this to a PHP-based system
2. **Use Static Hosting**: Deploy frontend only and use external services for backend
3. **Upgrade Hosting**: Switch to Hostinger VPS or Cloud hosting for full Node.js support

## File Upload Configuration

Ensure the uploads directory has proper permissions:
```bash
chmod 755 uploads/
chmod 755 uploads/payments/
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with 12 rounds
- **Rate Limiting**: Prevents abuse and spam
- **Input Validation**: Server-side validation for all inputs
- **File Upload Security**: Restricted file types and sizes
- **CORS Configuration**: Proper cross-origin resource sharing
- **Helmet Security**: Security headers for protection

## Database Schema

### Users Table
- Stores customer and admin information
- Secure password hashing
- Role-based access control
- Loyalty points system

### Bookings Table
- Complete booking information
- Payment tracking
- Status management
- Foreign key relationships

### Updates Table
- News and announcements
- Featured content system
- Image support

### Analytics Table
- Event tracking
- Business intelligence
- Performance monitoring

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Token verification

### Bookings
- `GET /api/bookings/availability/:date` - Check availability
- `POST /api/bookings/create` - Create booking
- `GET /api/bookings/my-bookings` - User's bookings
- `PUT /api/bookings/cancel/:id` - Cancel booking

### Admin
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/bookings` - All bookings (with filters)
- `PUT /api/admin/bookings/:id/status` - Update booking status
- `POST /api/admin/bookings/manual` - Create manual booking
- `GET /api/admin/customers` - Customer management
- `GET /api/admin/analytics` - Analytics data

### Customer
- `GET /api/customer/updates` - Latest news/updates
- `GET /api/customer/pricing` - Ground pricing information
- `POST /api/customer/contact` - Contact form submission

## Support

For technical support or customization requests, contact the development team.

## License

Private and proprietary software for The Green Field.#   t h e g r e e n f i e l d  
 