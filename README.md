# Roommate Expense Tracker

A Progressive Web App (PWA) for tracking and splitting expenses between roommates with advanced features like absence tracking, settlement calculations, and detailed reporting.

## Features

### Core Features
- 📊 **Expense Tracking**: Add, edit, and delete expenses with detailed categorization
- 👥 **Roommate Management**: Add and manage roommates with custom avatars and colors
- 💸 **Smart Splitting**: Split expenses equally, custom amounts, or by percentage
- 📅 **Absence Tracking**: Automatically exclude absent roommates from expense splits
- ⚖️ **Balance Calculation**: Real-time balance tracking for each roommate
- 💰 **Settlement Suggestions**: Optimal settlement calculations to clear balances
- 📈 **Reports & Insights**: Visual charts and detailed expense breakdowns

### Advanced Features
- 🌓 **Dark/Light Theme**: Automatic theme switching based on system preference
- 🔒 **PIN Lock**: Optional PIN protection for app access
- 💾 **Backup & Restore**: Export/import all data as JSON
- 📱 **PWA Support**: Install as a native app on mobile/desktop
- 🚀 **Offline Support**: Works completely offline
- 🖨️ **Print Support**: Print reports and settlement details

## Installation

### Web Deployment
1. Upload all files to your web server
2. Access the app via your domain
3. Install as PWA (browser will prompt or use menu option)

### Local Development
1. Clone or download the project files
2. Open `index.html` in a modern web browser
3. No server required - works directly from file system

## Usage Guide

### Getting Started
1. **Add Roommates**: Go to Settings → Manage Roommates to add all roommates
2. **Set Absences**: Mark roommates as absent when they're away (optional)
3. **Add Expenses**: Start adding shared expenses with details
4. **Track Balances**: View current balances on the dashboard
5. **Settle Up**: Use settlement suggestions to clear balances

### Adding Expenses
1. Click "Add Expense" from dashboard or navigation
2. Fill in expense details:
   - Title and amount
   - Select who paid
   - Choose split method (equal, custom, percentage)
   - Select participants
   - Add category and date
3. Absent roommates are automatically excluded based on date

### Managing Absences
1. Go to Manage Presence
2. Select roommate and date range
3. Add reason for absence
4. Absent roommates won't be included in expense splits for those dates

### Viewing Reports
1. Go to Reports section
2. View charts for:
   - Expense categories
   - Member balances
   - Monthly trends
3. Export data or print reports

## Data Management

### Backup
1. Go to Settings → Backup & Restore
2. Click "Export Backup"
3. Save the JSON file or copy to clipboard

### Restore
1. Go to Settings → Backup & Restore
2. Click "Import Backup"
3. Select your backup file or paste JSON data

### Clear Data
⚠️ **Warning**: This action cannot be undone
1. Go to Settings → Danger Zone
2. Click "Clear All Data"
3. Confirm to delete all expenses, members, and settings

## Technical Details

### Architecture
- **Frontend**: Pure HTML, CSS, and JavaScript (Vanilla JS)
- **Storage**: LocalStorage for data persistence
- **Charts**: Chart.js for data visualization
- **PWA**: Service Worker for offline functionality
- **Responsive**: Mobile-first responsive design

### Browser Support
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+
- iOS Safari 11+
- Android Chrome 60+

### File Structure

roommate-expense-app/
├── index.html # Dashboard
├── add-expense.html # Add expense form
├── summary.html # Reports & charts
├── manage-members.html # Roommate management
├── manage-presence.html# Absence tracking
├── settings.html # App settings
├── css/
│ ├── style.css # Main styles
│ └── responsive.css # Responsive styles
├── js/
│ ├── storage.js # Data storage
│ ├── members.js # Member management
│ ├── presence.js # Absence tracking
│ ├── expense.js # Expense operations
│ ├── calculate.js # Calculations
│ ├── settlement.js # Settlement logic
│ ├── charts.js # Chart rendering
│ ├── ui.js # UI utilities
│ ├── app.js # Main app logic
│ └── pwa.js # PWA features
├── manifest.json # PWA manifest
├── service-worker.js # Service worker
└── README.md # This file


## Customization

### Theme Colors
Edit CSS variables in `css/style.css`:
```css
:root {
    --primary-600: #3b82f6; /* Change primary color */
    --bg-primary: #ffffff;  /* Change background */
    /* ... other variables */
}