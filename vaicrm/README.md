# VERSO ALTIMA INDIA PRIVATE LIMITED (VAI) Portal

A comprehensive VERSO ALTIMA INDIA PRIVATE LIMITED (VAI) management portal built with modern web technologies for seamless customer registration, inventory tracking, and payment processing.

## 🚀 Features

- **Agent Management**: Professional SAP-style tabbed registration forms
- **Customer Registration**: Full-featured customer onboarding with KYC document upload
- **Inventory Management**: Real-time equipment tracking and status monitoring
- **Payment Processing**: Multi-currency payment handling with receipt generation
- **Subscription Management**: Package management and lifecycle tracking
- **Analytics Dashboard**: KPI monitoring and reporting
- **Mobile Responsive**: Optimized for field agent operations

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **shadcn/ui** components
- **TanStack Query** for server state management
- **React Hook Form** with Zod validation
- **Wouter** for routing

### Backend
- **Node.js** with Express.js
- **TypeScript** with ES modules
- **Session management** with connect-pg-simple

## 📋 Prerequisites

Before running this project locally, ensure you have:

- **Node.js** (version 18 or higher)
- **npm** or **yarn** package manager
- **Git** for version control

## 🚀 Local Development Setup

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd vai-portal
```

### 2. Install Dependencies

```bash
npm install
```


# Development Settings
NODE_ENV="development"
PORT=5001
```

### 6. Start Development Server

```bash
npm run dev
```

This starts both the Express backend and Vite frontend development servers on:
- **Frontend**: http://localhost:5001 (served by Express with Vite middleware)
- **Backend API**: http://localhost:5001/api

## 📁 Project Structure

```
vai-portal/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Application pages/routes
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility functions and configurations
├── server/                # Backend Express application
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API route definitions
│   ├── storage.ts        # Data storage interface
│   └── vite.ts           # Vite middleware setup
├── shared/               # Shared code between frontend and backend
│   └── schema.ts         # Database schema and type definitions
├── package.json          # Dependencies and scripts
├── vite.config.ts        # Vite configuration
├── tailwind.config.ts    # Tailwind CSS configuration
```

## 🎯 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production


## 📱 Key Features Guide

### Analytics Dashboard
- Navigate to `/dashboard` (default after login)
- Interactive charts with Recharts library (area, line, bar, pie charts)
- Digital KPI cards with real-time indicators and trend analysis
- Live system monitoring with real-time metrics
- Revenue trends, subscription analytics, and regional performance
- 24-hour activity heatmap and system health monitoring
- Mobile responsive design with comprehensive business intelligence

### Agent Registration
- Navigate to `/agent-onboarding`
- Professional 6-tab SAP-style interface: General Data, Personal Details, Address Details, Tax Information, Financial Settings, KYC Documents
- Full-width enterprise design with status indicators

### Customer Registration
- Navigate to `/customer-registration`
- Shows registered customers first with "New Customer" button
- 6-tab SAP-style interface: General Data, Personal Details, Address Details, Service Settings, Financial & Tax, KYC Documents
- Consistent tabbed interface design

### Inventory Management
- Navigate to `/inventory`
- Equipment tracking with material codes and serial numbers
- Status monitoring (Available, Reserved, Sold)
- Location-based organization with real-time updates

### Payment Processing
- Navigate to `/payments`
- Hardware and subscription payment handling
- Multi-currency support (TSH - Tanzania Shilling)
- Receipt generation and preview functionality

### Subscription Management
- Navigate to `/subscriptions`
- Package management (Basic, Premium, Family, Corporate)
- Subscription lifecycle tracking
- Customer subscription history

## 🚀 Production Deployment

### Build for Production

```bash
npm run build
```

### Environment Variables for Production

For production with database integration, ensure these environment variables are set:

```env
NODE_ENV=production
DATABASE_URL=your_production_database_url
SESSION_SECRET=your_secure_session_secret
PORT=5001
```

### Quick Start for Design Testing

For immediate design testing without database setup:

1. Clone the repository
2. Run `npm install`
3. Run `npm run dev`
4. Open http://localhost:5001
5. Use any of the demo credentials on the login page

The application will work fully with realistic data for design approval.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is proprietary software developed for VERSO ALTIMA INDIA PRIVATE LIMITED (VAI) operations.

## 🆘 Troubleshooting

### Common Issues

1. **Port Already in Use**
   - Kill any processes using port 5001: `lsof -ti:5001 | xargs kill -9`
   - Or change the `PORT` in your `.env` file

2. **Dependencies Installation Issues**
   - Clear npm cache: `npm cache clean --force`
   - Delete `node_modules` and `package-lock.json`, then run `npm install`

3. **Login Issues**
   - Use the demo credentials shown on the login page
   - Click the quick-fill buttons for easy credential entry
   - No database setup required for design testing

4. **Database Connection Error (If using database)**
   - Verify your `DATABASE_URL` is correct
   - Ensure MySQL is running
   - Check firewall settings

### Getting Help

If you encounter issues:
1. Check the console logs for error messages
2. Ensure your Node.js version is 18 or higher

### Design Testing Mode

The application is configured for immediate design testing:
- No database setup required
- All features work with realistic sample data
---

**Built with ❤️ for VERSO ALTIMA INDIA PRIVATE LIMITED (VAI) Operations**
