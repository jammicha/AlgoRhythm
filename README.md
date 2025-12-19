# AlgoRhythm 🎵

**AlgoRhythm** is an interactive, AI-powered music discovery platform that visualizes artist relationships as a dynamic graph. It combines real-time data from Last.fm with intelligent "vibe-based" filtering to help users explore new music intuitively.

![AlgoRhythm Preview](https://github.com/user-attachments/assets/placeholder-image.png)

## ✨ Features

*   **Interactive Music Graph**: Explore artists as nodes in a force-directed graph (powered by `React Flow`).
*   **Smart Layouts**: Automatically organize your discovery path into clean trees or timeline views.
*   **Contextual Discovery**: Double-click any artist to branch out and find similar recommendations.
*   **Instant Preview**: Right-click to preview the artist's top tracks via audio snippets.
*   **Favorites & History**: "Star" your favorite discoveries and undo/redo your exploration steps.
*   **AI Integration**: (Coming Soon) Gemini-powered "Vibe Search" to filter artists by mood and energy.

## 🛠️ Tech Stack

### Frontend (`/client`)
*   **Framework**: React 19 + Vite
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS
*   **Visualization**: React Flow + Dagre (Layout Engine)
*   **State Management**: Zustand

### Backend (`/api`)
*   **Framework**: .NET 9 Web API
*   **AI/LLM**: Microsoft Semantic Kernel + Google Gemini
*   **Data Source**: Last.fm API
*   **Architecture**: Service-Repository Pattern

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   .NET 9 SDK

### Installation

1.  **Clone the repo**
    ```bash
    git clone https://github.com/jammicha/AlgoRhythm.git
    cd AlgoRhythm
    ```

2.  **Start the Backend**
    ```bash
    cd api/Algorhythm.Api
    # Update appsettings.json with your Last.fm API Key if needed
    dotnet run
    ```
    *Server runs on `http://localhost:5111`*

3.  **Start the Frontend** (In a new terminal)
    ```bash
    cd client
    npm install
    npm run dev
    ```
    *Client runs on `http://localhost:5173`*

## 🎮 Controls

*   **Left Click**: Select Node / Open Details Sidebar
*   **Double Click**: Expand/Discover new artists
*   **Right Click**: Open Context Menu (Preview, Favorite, Remove)
*   **Shift + Drag**: Multi-Select Nodes
*   **Bottom Left Button**: Toggle Auto-Layout (Horizontal/Vertical)

## 📄 License

This project is open source.