import React, { useState, useEffect, useRef } from 'react';

const DOSTerminal = () => {
  const [inputHistory, setInputHistory] = useState(['Welcome to Digital Dreamers DOS v1.0', 'Copyright (C) 2025 Potasim Studios', 'C:\\>']);
  const [currentInput, setCurrentInput] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const inputRef = useRef(null);
  const terminalRef = useRef(null);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 530);
    return () => clearInterval(cursorInterval);
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [inputHistory]);

  const handleCommand = (command) => {
    const cmd = command.toLowerCase().trim();
    let response = '';

    switch(cmd) {
      case 'help':
        response = [
          'Available commands:',
          'HELP    - Display this help message',
          'DIR     - List available programs',
          'QUANTUM - Access quantum computing system',
          'SPUDNIK - Initialize AI communication',
          'PORTAL  - Open gateway to hidden games',
          'CLS     - Clear screen',
          'EXIT    - Close terminal'
        ].join('\n');
        break;
      case 'dir':
        response = [
          ' Volume in drive C is DIGITAL_DREAMS',
          ' Directory of C:\\',
          '',
          'QUANTUM  EXE    52,428 02-14-25  8:14a',
          'SPUDNIK  SYS   104,857 02-14-25  8:14a',
          'PORTAL   COM    73,632 02-14-25  8:14a',
          'README   TXT     1,024 02-14-25  8:14a',
          '',
          '    4 File(s)    231,941 bytes',
          '    0 Dir(s)     1,048,576 bytes free'
        ].join('\n');
        break;
      case 'quantum':
        response = 'Initializing quantum protocols...\nAccessing quantum realm...\nQuantum computing visualization mode activated.';
        break;
      case 'spudnik':
        response = 'SPUDNIK AI system online...\nEstablishing quantum-agricultural link...\nConnection successful!';
        break;
      case 'portal':
        response = 'Opening gateway to classic games...\nRetro gaming module activated!';
        break;
      case 'cls':
        setInputHistory(['C:\\>']);
        return;
      case 'exit':
        response = 'Terminating DOS session...';
        break;
      default:
        if (cmd !== '') {
          response = 'Bad command or file name';
        }
    }

    setInputHistory(prev => [...prev, `C:\\>${command}`, response]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCommand(currentInput);
      setCurrentInput('');
    }
  };

  return (
    <div className="w-full h-full bg-black p-4 font-mono">
      <div 
        ref={terminalRef}
        className="h-full overflow-y-auto text-green-500 whitespace-pre-wrap"
        style={{
          textShadow: '0 0 2px #00ff00, 0 0 5px #00ff00',
          fontSize: '16px',
          lineHeight: '1.2'
        }}
      >
        {inputHistory.map((line, index) => (
          <div key={index} className="mb-1">
            {line}
          </div>
        ))}
        <div className="flex items-center">
          C:\&gt;{currentInput}
          <span 
            className={`ml-1 w-2 h-4 ${cursorVisible ? 'bg-green-500' : 'bg-transparent'}`}
          >
          </span>
        </div>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={currentInput}
        onChange={(e) => setCurrentInput(e.target.value)}
        onKeyPress={handleKeyPress}
        className="opacity-0 absolute pointer-events-none"
        autoFocus
      />
    </div>
  );
};

export default DOSTerminal;