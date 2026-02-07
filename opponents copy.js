/**
 * KI PROFILE
 */
const OPPONENTS = {
    EASY: {
        name: "Training-Bot",
        color: "#39ff14", 
        aiSpeed: 0.07,    
        strategy: "defensive",
        errorRate: 0.4    
    },
    MEDIUM: {
        name: "Striker-7",
        color: "#ffaa00", 
        aiSpeed: 0.13,    
        strategy: "balanced",
        errorRate: 0.1
    },
    MEDIUM: {
        name: "Rambo",
        color: "#ff5e00ff", 
        aiSpeed: 0.20,    
        strategy: "aggressive",
        errorRate: 0.1
    },
    HARD: {
        name: "The Wall",
        color: "#ff3300", 
        aiSpeed: 0.25,    
        strategy: "aggressive",
        errorRate: 0.0
    }
};

// Start-Gegner
let currentOpponent = OPPONENTS.MEDIUM;