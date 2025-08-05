document.addEventListener('DOMContentLoaded', () => {
    const terminalContent = document.getElementById('terminalContent');
    let currentInput = document.querySelector('.terminal-input');
    let commandHistory = [];
    let historyIndex = -1;

    // Initialize input handling
    function initializeInput() {
        currentInput = document.querySelector('.terminal-input');
        currentInput.addEventListener('keydown', handleKeyPress);
        currentInput.focus();
    }

    // Handle key presses
    function handleKeyPress(e) {
        switch(e.key) {
            case 'Enter':
                const command = currentInput.value.trim().toLowerCase();
                if (command) {
                    commandHistory.push(command);
                    historyIndex = commandHistory.length;
                    handleCommand(command);
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (historyIndex > 0) {
                    historyIndex--;
                    currentInput.value = commandHistory[historyIndex];
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (historyIndex < commandHistory.length - 1) {
                    historyIndex++;
                    currentInput.value = commandHistory[historyIndex];
                } else {
                    historyIndex = commandHistory.length;
                    currentInput.value = '';
                }
                break;
        }
    }

    // Command handling
    function handleCommand(command) {
        // Add command to output
        addOutput(`C:\\>${command}`);

        // Process command
        switch(command) {
            case 'help':
                addOutput(`Available commands:
HELP     - Display this help message
DIR      - List directory contents
QUANTUM  - Access quantum computing system
SPUDNIK  - Initialize AI communication
PORTAL   - Open gateway to hidden games
TYPE     - Display file contents
CLS      - Clear screen
HOME     - Return to main room
VER      - Display version information`);
                break;

            case 'dir':
                addOutput(`
 Volume in drive C is QUANTUM_OS
 Volume Serial Number is 1337-CAFE
 Directory of C:\\

QUANTUM  EXE    52,428 02-14-25  8:14a
SPUDNIK  SYS   104,857 02-14-25  8:14a
PORTAL   COM    73,632 02-14-25  8:14a
README   TXT     1,024 02-14-25  8:14a
    4 File(s)    231,941 bytes
    0 Dir(s)     1,048,576 bytes free`);
                break;

            case 'cls':
                clearScreen();
                break;

            case 'portal':
                addOutput(`Accessing game portal...
Loading classic games library...

Available games:
1. DOOM (1993)
2. Super Mario Bros
3. Alien Logic
4. Lords of Magic

Type PLAY <number> to launch game`);
                break;

            case 'play 1':
            case 'play 2':
            case 'play 3':
            case 'play 4':
                const gameNumber = command.split(' ')[1];
                addOutput('Initializing quantum tunnel...');
                setTimeout(() => {
                    addGlitchEffect();
                    setTimeout(() => {
                        window.location.href = `/games/game${gameNumber}.html`;
                    }, 2000);
                }, 1000);
                break;

            case 'home':
                addOutput('Returning to main room...');
                setTimeout(() => {
                    addGlitchEffect();
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 2000);
                }, 1000);
                break;

            case 'spudnik':
                addOutput(`SPUDNIK AI system online...
Establishing quantum-agricultural link...
SPUDNIK: Hello, user. How may I assist you today?

[SPUDNIK commands available: STATUS, ANALYZE, QUANTUM]`);
                break;

            case 'ver':
                addOutput('Digital Dreamers DOS [Version 1.0]\nQuantum-Agricultural Build 2025');
                break;

            default:
                addOutput('Bad command or file name');
        }

        // Add new input line
        addInputLine();
    }

    // Helper functions
    function addOutput(text) {
        const output = document.createElement('div');
        output.className = 'terminal-text';
        output.textContent = text;
        terminalContent.appendChild(output);
    }

    function addInputLine() {
        const inputLine = document.createElement('div');
        inputLine.className = 'terminal-input-line';
        inputLine.innerHTML = `
            <span class="terminal-prompt">C:\\></span>
            <input type="text" class="terminal-input">
        `;
        terminalContent.appendChild(inputLine);
        currentInput = inputLine.querySelector('.terminal-input');
        initializeInput();
        scrollToBottom();
    }

    function clearScreen() {
        terminalContent.innerHTML = '';
        addInputLine();
    }

    function scrollToBottom() {
        terminalContent.scrollTop = terminalContent.scrollHeight;
    }

    function addGlitchEffect() {
        const glitchOverlay = document.createElement('div');
        glitchOverlay.className = 'glitch';
        document.body.appendChild(glitchOverlay);
        setTimeout(() => glitchOverlay.remove(), 2000);
    }

    // Initialize
    initializeInput();
});