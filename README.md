# RADAR 17 - Sistema de Debate Participativo

## Overview
RADAR 17 is a participatory debate system that allows audience members to vote on debate questions in real-time. The system consists of three main components:

1. **Voting Interface**: Where audience members can cast their votes
2. **Visualizer**: A public display showing debate questions and results
3. **Admin Panel**: For managing questions, teams, and controlling the debate flow

## Features
- Real-time voting with Socket.io
- Live results visualization
- Admin panel for debate management
- QR code for easy access to voting interface
- Responsive design for all devices
- Team scoring system

## Setup

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation
1. Clone the repository:
   ```
   git clone https://github.com/hsduarte/radar17-debate.git
   cd radar17-debate
   ```

2. Start the server:
   ```
   docker compose up
   ```

3. Access the application:
   - Voting Interface: http://localhost:5001
   - Visualizer: http://localhost:5001/visualizer
   - Admin Panel: http://localhost:5001/admin

## Project Structure
