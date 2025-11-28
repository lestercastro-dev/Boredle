document.addEventListener('DOMContentLoaded', () => {
    // --- 1. SETUP ELEMENTS ---
    const tiles = document.querySelectorAll('.tile');
    const keyboardButtons = document.querySelectorAll(".keyboard-button");
    const messageContainer = document.getElementById("message-container");

    const homeScreen = document.getElementById("home-screen");
    const gameScreen = document.getElementById("game-screen");
    const startBtn = document.getElementById("start-btn");
    const rulesBtn = document.getElementById("rules-btn");
    const backBtn = document.getElementById("back-btn");

    const modal = document.getElementById("game-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalWord = document.getElementById("modal-word");
    const playAgainBtn = document.getElementById("play-again-btn");
    const menuBtn = document.getElementById("menu-btn");
    const rulesModal = document.getElementById("rules-modal");
    
    const closeRules = document.querySelector(".close-rules");
    const closeBtn = document.querySelector(".close-btn");
    const themeBtn = document.getElementById("theme-toggle");

    const streakElement = document.getElementById("streak-counter");
    let currentStreak = 0;

    // --- GAME VARIABLES ---
    let row = 0;
    let col = 0;
    let isGameOver = false;
    let encodedSecret = "";
    
    // --- DICTIONARIES ---
    const guaranteedWords = [
        "APPLE", "BEACH", "BRAIN", "BREAD", "BRUSH", "CHAIR", "CHEST", "CHORD", 
        "CLICK", "CLOCK", "CLOUD", "DANCE", "DIARY", "DRINK", "DRIVE", "EARTH", 
        "FEAST", "FIELD", "FRUIT", "GLASS", "GRAPE", "GREEN", "GHOST", "HEART", 
        "HOUSE", "IMAGE", "LIGHT", "LEMON", "MELON", "MONEY", "MUSIC", "NIGHT", 
        "OCEAN", "PARTY", "PHONE", "PHOTO", "PIANO", "PILOT", "PLANE", "PLANT", 
        "PLATE", "POWER", "RADIO", "RIVER", "ROBOT", "SHIRT", "SHOES", "SPACE", 
        "STORM", "TABLE", "TOAST", "TOUCH", "TRAIN", "TRUCK", "VOICE", "WATER", 
        "WATCH", "WOMAN", "WORLD", "WRITE", "YOUTH", "ZEBRA",
        "SWOLE", "FJORD", "CRANE", "SLATE", "AUDIO", "ADIEU"
    ];

    let allValidWords = [...guaranteedWords]; 
    let secretCandidates = [...guaranteedWords]; 
    
    // --- 2. INITIALIZATION ---

    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add("dark-mode");
        if (themeBtn) themeBtn.textContent = "☀️";
        updateSystemTheme(true);
    }

    currentStreak = parseInt(localStorage.getItem('boredle-streak')) || 0;
    if (streakElement) streakElement.innerText = "🔥 " + currentStreak;

    if (gameScreen && homeScreen) {
        gameScreen.classList.add("hidden");
        homeScreen.classList.remove("hidden");
    }

    fetchDictionaries();

    async function fetchDictionaries() {
        try {
            const response = await fetch("https://raw.githubusercontent.com/tabatkins/wordle-list/main/words");
            if (!response.ok) throw new Error("Network response was not ok");
            
            const text = await response.text();
            const bigList = text.split('\n')
                .map(w => w.toUpperCase().trim())
                .filter(w => w.length === 5);

            allValidWords = [...new Set([...guaranteedWords, ...bigList])];
            secretCandidates = [...guaranteedWords, ...bigList.slice(0, 2500)];

            console.log("Dictionary Updated. Total Words:", allValidWords.length);

        } catch (error) {
            console.warn("Using Offline Dictionary:", error);
        }
    }

    // --- 3. GAME LOGIC ---

    function startGame() {
        row = 0;
        col = 0;
        isGameOver = false;
        
        let rawWord = "APPLE"; 
        if (secretCandidates.length > 0) {
            rawWord = secretCandidates[Math.floor(Math.random() * secretCandidates.length)];
        }
        encodedSecret = btoa(rawWord); 
               
        // Reset Visuals
        tiles.forEach(tile => {
            tile.innerText = "";
            tile.className = "tile"; 
            tile.style.borderColor = ""; 
        });
        keyboardButtons.forEach(btn => {
            btn.className = "keyboard-button";
        });
    }

    // --- 4. INPUT HANDLING ---

    document.addEventListener('keyup', (e) => {
        if (!homeScreen || !homeScreen.classList.contains("hidden")) return;
        if (isGameOver) return;
        processInput(e.key);
    });

    keyboardButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            if (isGameOver) return;
            const key = btn.textContent === "Del" || btn.textContent === "DEL" ? "Backspace" : btn.textContent;
            processInput(key);
        });
    });

    function processInput(key) {
        if (key.match(/^[a-z]$/i) && col < 5) {
            let index = (row * 5) + col;
            tiles[index].innerText = key.toUpperCase();
            tiles[index].style.borderColor = "var(--text-color)";
            col++;
        } 
        else if (key === "Backspace" && col > 0) {
            col--;
            let index = (row * 5) + col;
            tiles[index].innerText = "";
            tiles[index].style.borderColor = "";
        } 
        else if (key === "Enter" || key === "ENTER") {
            checkGuess();
        }
    }

    function checkGuess() {
        if (col < 5) {
            showMessage("Not enough letters");
            shakeRow();
            return;
        }

        let currentGuess = "";
        for (let i = 0; i < 5; i++) {
            currentGuess += tiles[(row * 5) + i].innerText;
        }

        if (!allValidWords.includes(currentGuess)) {
            showMessage("Not in word list");
            shakeRow();
            return;
        }

        // DECRYPT FOR COMPARISON
        const realWord = atob(encodedSecret);

        if (currentGuess === realWord) {
            revealColors(currentGuess);
        } else {
            revealColors(currentGuess);
        }
    } // <-- THIS WAS MISSING!

    function revealColors(guess) {
        const realWord = atob(encodedSecret);
        
        let checkSecret = realWord.split('');
        let checkGuess = guess.split('');
        let states = Array(5).fill('absent');

        // GREEN
        for (let i = 0; i < 5; i++) {
            if (checkGuess[i] === checkSecret[i]) {
                states[i] = 'correct';
                checkSecret[i] = null;
                checkGuess[i] = null;
            }
        }

        // YELLOW
        for (let i = 0; i < 5; i++) {
            if (checkGuess[i] !== null) {
                let indexInSecret = checkSecret.indexOf(checkGuess[i]);
                if (indexInSecret > -1) {
                    states[i] = 'present';
                    checkSecret[indexInSecret] = null;
                }
            }
        }

        // ANIMATION
        for (let i = 0; i < 5; i++) {
            let index = (row * 5) + i;
            let tile = tiles[index];
            let keyButton = getKeyButton(guess[i]);

            setTimeout(() => {
                tile.classList.add(states[i]);
                if (keyButton) {
                    let oldColor = keyButton.classList.contains('correct') ? 'correct' : 
                                   keyButton.classList.contains('present') ? 'present' : 'absent';
                    
                    if (oldColor !== 'correct') {
                        if (states[i] === 'correct') keyButton.className = "keyboard-button correct";
                        else if (states[i] === 'present' && oldColor !== 'present') keyButton.className = "keyboard-button present";
                        else if (states[i] === 'absent' && oldColor !== 'present') keyButton.className = "keyboard-button absent";
                    }
                }
            }, i * 200);
        }

        // WIN/LOSE CHECK
        if (guess === realWord) {
            // WIN
            if (!isGameOver) { 
                currentStreak++;
                localStorage.setItem('boredle-streak', currentStreak);
                if (streakElement) streakElement.innerText = "🔥 " + currentStreak;
            }
            setTimeout(() => showModal(true), 1500);
            isGameOver = true;
        } else {
            if (row === 5) {
                // LOSE
                currentStreak = 0;
                localStorage.setItem('boredle-streak', 0);
                if (streakElement) streakElement.innerText = "🔥 " + currentStreak;

                setTimeout(() => showModal(false), 1500);
                isGameOver = true;
            } else {
                row++;
                col = 0;
            }
        }
    }

    // --- 5. UTILITIES ---

    function getKeyButton(letter) {
        for (const btn of keyboardButtons) {
            if (btn.textContent.toUpperCase() === letter) return btn;
        }
        return null;
    }

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

    function shakeRow() {
        for (let i = 0; i < 5; i++) {
            let tile = tiles[(row * 5) + i];
            tile.classList.add('shake');
            setTimeout(() => tile.classList.remove('shake'), 500);
        }
    }

    function showModal(win) {
        if (modal) {
            modal.classList.remove("hidden");
            // DECRYPT THE WORD TO SHOW THE USER
            if (modalWord) modalWord.innerText = atob(encodedSecret);
            if (modalTitle) modalTitle.innerText = win ? "CONGRATULATIONS" : "GAME OVER";
        }
    }

    function updateSystemTheme(isDark) {
        const metaThemeColor = document.querySelector("meta[name='theme-color']");
        if (metaThemeColor) {
            // 1. Tell browser toolbar to change color
            metaThemeColor.setAttribute("content", isDark ? "#1a1a1c" : "#b0c4de");
            
            // 2. Force the background behind the page to change
            document.documentElement.style.backgroundColor = isDark ? "#1a1a1c" : "#b0c4de";
        }
    }

    // --- 6. EVENT LISTENERS ---

    if (startBtn) {
        startBtn.addEventListener("click", () => {
            homeScreen.classList.add("hidden");
            gameScreen.classList.remove("hidden");
            // Always start a new game if board is empty
            if (row === 0 && col === 0 && tiles[0].innerText === "") startGame();
        });
    }

    if (backBtn) {
        backBtn.addEventListener("click", () => {
            gameScreen.classList.add("hidden");
            homeScreen.classList.remove("hidden");
        });
    }

    if (playAgainBtn) {
        playAgainBtn.addEventListener("click", () => {
            if (modal) modal.classList.add("hidden");
            startGame();
        });
    }

    if (menuBtn) {
        menuBtn.addEventListener("click", () => {
            if (modal) modal.classList.add("hidden");
            gameScreen.classList.add("hidden");
            homeScreen.classList.remove("hidden");
            startGame(); 
        });
    }

    if (rulesBtn) {
        rulesBtn.addEventListener("click", () => {
            if (rulesModal) rulesModal.classList.remove("hidden");
        });
    }

    if (closeRules) {
        closeRules.addEventListener("click", () => {
            if (rulesModal) rulesModal.classList.add("hidden");
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            if (modal) modal.classList.add("hidden");
        });
    }

    if (themeBtn) {
        themeBtn.addEventListener("click", () => {
            document.body.classList.toggle("dark-mode");
            const isDark = document.body.classList.contains("dark-mode");
            themeBtn.textContent = isDark ? "☀️" : "🌙";
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            updateSystemTheme(isDark);
            themeBtn.blur();
        });
    }
});