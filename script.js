const tiles = document.querySelectorAll('.tile');
const keyboardButtons = document.querySelectorAll(".keyboard-button");
const messageContainer = document.getElementById("message-container");
const modal = document.getElementById("game-modal");
const modalTitle = document.getElementById("modal-title");
const modalWord = document.getElementById("modal-word");
const playAgainBtn = document.getElementById("play-again-btn");
const closeBtn = document.querySelector(".close-btn");
const homeScreen = document.getElementById("home-screen");
const gameScreen = document.getElementById("game-screen");
const startBtn = document.getElementById("start-btn");
const rulesBtn = document.getElementById("rules-btn");
const backBtn = document.getElementById("back-btn");
const menuBtn = document.getElementById("menu-btn"); // Inside Game Over modal
const rulesModal = document.getElementById("rules-modal");
const closeRules = document.querySelector(".close-rules");

// FORCE RESET ON LOAD
gameScreen.classList.add("hidden");
homeScreen.classList.remove("hidden");

// STATE VARIABLES
let row = 0;
let col = 0;
let isGameOver = false;
let secretWord = "";
let validWords = []; // This will hold the huge list from the internet

// 1. START THE GAME (Fetch the words first!)
initGame();

async function initGame() {
    try {
        // Show a loading message
        // showMessage("Loading dictionary...");

        // A. FETCH THE BIG LIST (All valid 5-letter words)
        // This URL contains ~14,000 words used by the real Wordle
        const response = await fetch("https://raw.githubusercontent.com/tabatkins/wordle-list/main/words");
        const text = await response.text();
        
        // Convert the big text file into an Array (uppercase)
        validWords = text.split('\n').map(w => w.toUpperCase().trim()).filter(w => w.length === 5);

        // B. PICK A SECRET WORD
        // We will pick a random word from this list.
        // NOTE: This list includes hard words like "XYLYL". 
        // If you want easier words, we would need a separate "common words" list.
        secretWord = validWords[Math.floor(Math.random() * validWords.length)];
        
        console.log("Secret Word:", secretWord); // Cheating for testing
        // showMessage("Game Start!");

    } catch (error) {
        console.error(error);
        showMessage("Error loading words!");
    }
}

// 2. LISTEN FOR INPUT
document.addEventListener('keyup', (e) => {
    // NEW: If we are on the home screen, IGNORE typing!
    if (!homeScreen.classList.contains("hidden")) return; 

    if (isGameOver || validWords.length === 0) return;
    processInput(e.key);
});

keyboardButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        if (isGameOver || validWords.length === 0) return;
        const key = btn.textContent;
        if (key === "Del") processInput("Backspace");
        else processInput(key);
    });
});

// 3. MAIN LOGIC
function processInput(key) {
    if (key.match(/^[a-z]$/i) && col < 5) {
        let index = (row * 5) + col;
        tiles[index].innerText = key.toUpperCase();
        tiles[index].style.borderColor = "#818384"; 
        col++;
    } 
    else if (key === 'Backspace' && col > 0) {
        col--;
        let index = (row * 5) + col;
        tiles[index].innerText = '';
        tiles[index].style.borderColor = "#c8e1d6"; 
    } 
    else if (key === 'Enter') {
        checkGuess();
    }
}

function checkGuess() {
    // Check Length
    if (col < 5) {
        showMessage("Not a 5 letter word");
        return;
    }

    // Build the word
    let currentGuess = "";
    for (let i = 0; i < 5; i++) {
        currentGuess += tiles[(row * 5) + i].innerText;
    }

    // CHECK DATABASE: Is it a real word?
    if (!validWords.includes(currentGuess)) {
        showMessage("Not a real word");
        shakeTiles(); // Add a shake effect (optional)
        return;
    }

    // If valid, reveal colors
    revealColors(currentGuess);
}

function revealColors(guess) {
    // Create a copy of the secret word letters to handle duplicates (like APPLE)
    let checkSecret = secretWord.split('');
    let checkGuess = guess.split('');
    let states = Array(5).fill('absent'); // Default to gray

    // First Pass: Check GREEN (Correct spots)
    for (let i = 0; i < 5; i++) {
        if (checkGuess[i] === checkSecret[i]) {
            states[i] = 'correct';
            checkSecret[i] = null; // Mark as used
            checkGuess[i] = null;
        }
    }

    // Second Pass: Check YELLOW (Wrong spots)
    for (let i = 0; i < 5; i++) {
        if (checkGuess[i] !== null) { // If not already green
            let indexInSecret = checkSecret.indexOf(checkGuess[i]);
            if (indexInSecret > -1) {
                states[i] = 'present';
                checkSecret[indexInSecret] = null; // Mark as used
            }
        }
    }

    // Apply Colors with Animation
    for (let i = 0; i < 5; i++) {
        let index = (row * 5) + i;
        let tile = tiles[index];
        let keyButton = getKeyButton(guess[i]);

        // We use a tiny fixed delay (100ms) just so it doesn't feel instant after hitting Enter
        setTimeout(() => {
            tile.classList.add(states[i]);
            
            // Color the keyboard
            if (keyButton) {
                let oldColor = keyButton.classList.contains('correct') ? 'correct' : 
                               keyButton.classList.contains('present') ? 'present' : 'absent';
                
                if (oldColor !== 'correct') { 
                    if (states[i] === 'correct') {
                        keyButton.classList.remove('present', 'absent');
                        keyButton.classList.add('correct');
                    } else if (states[i] === 'present' && oldColor !== 'present') {
                        keyButton.classList.remove('absent');
                        keyButton.classList.add('present');
                    } else if (states[i] === 'absent' && oldColor !== 'present') {
                        keyButton.classList.add('absent');
                    }
                }
            }
        }, 100); // Fixed delay! No more "i * 200"
    }

    // Win/Lose Logic (Wait 600ms for the fade to finish before showing popup)
    if (guess === secretWord) {
        setTimeout(() => showModal(true), 400); // Wait a bit longer for fade
        isGameOver = true;
    } else {
        if (row === 5) {
            setTimeout(() => showModal(false), 400);
            isGameOver = true;
        } else {
            row++;
            col = 0;
        }
    }
}

// UTILITIES
function showMessage(text) {
    const msg = document.createElement("div");
    msg.textContent = text;
    msg.classList.add("message");
    messageContainer.prepend(msg);
    setTimeout(() => {
        msg.classList.add("fade-out");
        msg.addEventListener("transitionend", () => msg.remove());
    }, 2000);
}

function getKeyButton(letter) {
    for (const btn of keyboardButtons) {
        if (btn.textContent.toUpperCase() === letter) return btn;
    }
    return null;
}

function shakeTiles() {
    for (let i = 0; i < 5; i++) {
        let tile = tiles[(row * 5) + i];
        tile.classList.add('shake');
        setTimeout(() => tile.classList.remove('shake'), 500);
    }
}

// --- NEW: MODAL & RESET LOGIC ---

function showModal(win) {
    modal.classList.remove("hidden");
    modalWord.innerText = secretWord;
    
    if (win) {
        modalTitle.innerText = "CONGRATULATIONS";
    } else {
        modalTitle.innerText = "GAME OVER";
    }
}

// Close modal when clicking X
closeBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
});

// PLAY AGAIN BUTTON
playAgainBtn.addEventListener("click", resetGame);

function resetGame() {
    // 1. Hide Modal
    modal.classList.add("hidden");

    // 2. Reset Variables
    row = 0;
    col = 0;
    isGameOver = false;

    // 3. Pick New Word
    secretWord = validWords[Math.floor(Math.random() * validWords.length)];
    console.log("New Secret Word:", secretWord);

    // 4. Clear the Board (HTML)
    tiles.forEach(tile => {
        tile.innerText = "";
        tile.classList.remove("correct", "present", "absent", "shake");
        tile.style.borderColor = "#c8e1d6"; // Reset border color
    });

    // no more colors when game resets bye bye
    keyboardButtons.forEach(btn => {
        btn.classList.remove("correct", "present", "absent");
    });
    
    showMessage("New Game Started!");
}

// --- THEME TOGGLE LOGIC ---
const themeBtn = document.getElementById("theme-toggle");

// 1. SYNC STATE ON LOAD
// Check if the body ALREADY has the class (thanks to the head script)
let isDarkMode = document.body.classList.contains("dark-mode");

// 2. SET CORRECT ICON IMMEDIATELY
if (isDarkMode) {
    themeBtn.textContent = "☀️";
}

themeBtn.addEventListener("click", () => {
    // Toggle Class
    document.body.classList.toggle("dark-mode");
    
    // Toggle State
    isDarkMode = !isDarkMode;
    
    // Toggle Icon & Save
    if (isDarkMode) {
        themeBtn.textContent = "☀️";
        localStorage.setItem('theme', 'dark');
    } else {
        themeBtn.textContent = "🌙";
        localStorage.setItem('theme', 'light');
    }
    
    themeBtn.blur();
});

// --- NAVIGATION LOGIC ---

// 1. Start Game
startBtn.addEventListener("click", () => {
    homeScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
});

// 2. Go Back to Home (From Game)
backBtn.addEventListener("click", () => {
    gameScreen.classList.add("hidden");
    homeScreen.classList.remove("hidden");
});

// 3. Go Back to Home (From Game Over Modal)
menuBtn.addEventListener("click", () => {
    modal.classList.add("hidden"); // Close game over modal
    gameScreen.classList.add("hidden");
    homeScreen.classList.remove("hidden");
    resetGame(); // Reset the board so it's fresh next time
});

// 4. Rules Modal
rulesBtn.addEventListener("click", () => {
    rulesModal.classList.remove("hidden");
});

closeRules.addEventListener("click", () => {
    rulesModal.classList.add("hidden");
});

// --- MISSING MODAL FUNCTIONS ---

function showModal(win) {
    modal.classList.remove("hidden");
    modalWord.innerText = secretWord;
    
    if (win) {
        modalTitle.innerText = "CONGRATULATIONS";
        // Optional: Add confetti logic here later
    } else {
        modalTitle.innerText = "GAME OVER";
    }
}

// Ensure the Main Menu button definitely works
menuBtn.addEventListener("click", () => {
    modal.classList.add("hidden");      // Close Modal
    gameScreen.classList.add("hidden"); // Hide Board
    homeScreen.classList.remove("hidden"); // Show Menu
    
    // Optional: Reset game so it's fresh when they come back
    resetBoardVisuals();
});

// Helper to clean up the board (used by Menu and Play Again)
function resetBoardVisuals() {
    tiles.forEach(tile => {
        tile.innerText = "";
        tile.className = "tile"; 
        tile.style.borderColor = ""; 
    });
    keyboardButtons.forEach(btn => {
        btn.className = "keyboard-button"; // Remove colors
    });
}