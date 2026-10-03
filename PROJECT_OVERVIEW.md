# Project Overview

This document provides a comprehensive overview of the Zycus Hackathon project, detailing its purpose, structure, and functionality. It is designed to help you understand the project thoroughly and prepare for your interview.

---

## Project Purpose

The Zycus Hackathon project is a full-stack application designed to manage products, simulate orders, and provide AI-driven suggestions for pricing and reordering. It uses a strategy pattern to switch between rule-based and AI strategies for decision-making.

---

## Project Structure

The project is divided into two main parts:

### 1. **Client**
- **Purpose**: Frontend of the application, built using modern web technologies.
- **Key Files**:
  - `index.html`: Entry point for the frontend.
  - `vite.config.js`: Configuration for the Vite build tool.
  - `src/`: Contains the main application code.
    - `App.jsx`: Main React component.
    - `components/`: Contains reusable React components like `Dashboard`, `ProductList`, etc.
    - `api.js`: Handles API calls to the backend.

### 2. **Server**
- **Purpose**: Backend of the application, responsible for handling API requests and business logic.
- **Key Files**:
  - `src/index.js`: Entry point for the backend server.
  - `routes/`: Contains API route handlers.
    - `products.js`: Manages product-related APIs.
    - `suggestions.js`: Manages suggestion-related APIs.
    - `config.js`: Manages configuration-related APIs.
  - `services/`: Contains business logic and utilities.
    - `engine/strategies.js`: Implements the strategy pattern.
    - `triggers/index.js`: Handles automatic triggers for low stock and demand spikes.
  - `models/`: Defines data models for products and suggestions.

---

## Key Features

### 1. **Product Management**
- Fetch all products with optional filtering by status and category.
- Fetch details of a single product by ID.
- Simulate orders for products, updating stock levels and checking for low stock or demand spikes.
- Reset demo state by restoring seed data.

### 2. **Suggestion Management**
- Fetch all suggestions with optional filtering by status.
- Fetch pending suggestions.
- Accept or reject suggestions (pricing or reorder).

### 3. **Strategy Configuration**
- Fetch the current strategy (rule-based or AI).
- Switch between rule-based and AI strategies.

---

## API Endpoints

### Product APIs
- **`GET /api/products`**: Fetch all products.
- **`GET /api/products/:id`**: Fetch product details by ID.
- **`POST /api/products/:id/orders`**: Simulate an order for a product.
- **`POST /api/products/demo/reset`**: Reset demo state.

### Suggestion APIs
- **`GET /api/suggestions`**: Fetch all suggestions.
- **`GET /api/suggestions/pending`**: Fetch pending suggestions.
- **`PATCH /api/suggestions/:type/:id/accept`**: Accept a suggestion.
- **`PATCH /api/suggestions/:type/:id/reject`**: Reject a suggestion.

### Configuration APIs
- **`GET /api/config/strategy`**: Fetch the current strategy.
- **`PUT /api/config/strategy`**: Update the strategy.

---

## Technical Details

### Backend
- **Framework**: Node.js with Express.js.
- **Database**: Simulated using JSON files.
- **Design Pattern**: Strategy pattern for switching between rule-based and AI strategies.
- **Error Handling**: Comprehensive error handling for all API endpoints.

### Frontend
- **Framework**: React.js.
- **Build Tool**: Vite.
- **Styling**: CSS modules.

---

## How to Run the Project

### Prerequisites
- Node.js installed on your system.

### Steps
1. **Install Dependencies**:
   - Navigate to the `client` and `server` directories and run `npm install`.
2. **Start the Backend**:
   - Navigate to the `server` directory and run `npm start`.
3. **Start the Frontend**:
   - Navigate to the `client` directory and run `npm run dev`.
4. **Access the Application**:
   - Open your browser and go to `http://localhost:3000`.

---

## Notes

- The backend uses a **strategy pattern** for decision-making.
- The `triggerService` handles automatic triggers for low stock and demand spikes.
- Suggestions are managed using models defined in `server/src/models/index.js`.

---

This document should provide you with a clear understanding of the project and its functionality. Good luck with your interview!