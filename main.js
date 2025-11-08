// JSON data structure for English sentences with stress and liaison information
const sentenceData = {
    "I went to the station with his sister.": {
        "I": { stress: 0, liaison: 0 },
        "went": { stress: 1, liaison: { delete: "t" } },
        "to": { stress: 0, liaison: 0 },
        "the": { stress: 0, liaison: 0 },
        "station": { stress: 1, liaison: 0 },
        "with": { stress: 0, liaison: 0 },
        "his": { stress: 0, liaison: { delete: "s" } },
        "sister": { stress: 1, liaison: 0 }
    },
    "She wants to go there.": {
        "She": { stress: 0, liaison: 0 },
        "wants": { stress: 1, liaison: { delete: "s" } },
        "to": { stress: 0, liaison: 0 },
        "go": { stress: 1, liaison: 0 },
        "there": { stress: 1, liaison: 0 }
    },
    "We need to check it out.": {
        "We": { stress: 0, liaison: 0 },
        "need": { stress: 1, liaison: { delete: "d" } },
        "to": { stress: 0, liaison: 0 },
        "check": { stress: 1, liaison: 0 },
        "it": { stress: 0, liaison: { delete: "t" } },
        "out": { stress: 1, liaison: 0 }
    }
};

// Array of sentences for navigation
const sentences = Object.keys(sentenceData);
let currentSentenceIndex = 0;

class LiaisonVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.wordSpacing = 60;
        this.lineHeight = 80;
        this.startX = 60;
        this.startY = 150;
        this.currentHighlight = -1;
        this.wordPositions = [];
        this.animationId = null;
        this.speechUtterance = null;
        this.speechRate = 0.9; // Default speech rate

        // Colors
        this.colors = {
            text: '#333333',
            stress: '#F1C40F', // Yellow like in the image
            liaison: '#E74C3C', // Red for liaison connections
            delete: '#E74C3C',  // Red for deletion marks
            highlight: '#FF0000' // Red for animated highlighting
        };
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawText(text, x, y, isStressed = false, isHighlighted = false) {
        this.ctx.font = isStressed ? 'bold 36px Arial' : '32px Arial';
        this.ctx.fillStyle = isHighlighted ? this.colors.highlight : this.colors.text;
        this.ctx.fillText(text, x, y);
        return this.ctx.measureText(text).width;
    }

    drawStressMarker(x, y, width) {
        // Draw yellow circle above stressed syllables
        const centerX = x + width / 2;
        const centerY = y - 40;

        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 15, 0, 2 * Math.PI);
        this.ctx.fillStyle = this.colors.stress;
        this.ctx.fill();
    }

    drawLiaisonConnection(x1, y1, x2, y2) {
        // Draw curved line connecting words with liaison
        const midX = (x1 + x2) / 2;
        const midY = Math.min(y1, y2) - 30;

        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.quadraticCurveTo(midX, midY, x2, y2);
        this.ctx.strokeStyle = this.colors.liaison;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    drawDeleteMark(text, x, y, deleteChar) {
        // Find position of the character to be deleted
        const textWidth = this.ctx.measureText(text).width;
        const charIndex = text.indexOf(deleteChar);

        if (charIndex !== -1) {
            // Calculate approximate position of the character
            const beforeText = text.substring(0, charIndex);
            const beforeWidth = this.ctx.measureText(beforeText).width;
            const charWidth = this.ctx.measureText(deleteChar).width;

            // Draw larger slash over the character
            const slashX = x + beforeWidth + charWidth / 2;
            const slashY = y - 5;

            this.ctx.font = 'bold 48px Arial';
            this.ctx.fillStyle = this.colors.delete;
            this.ctx.fillText('/', slashX - 10, slashY);
        }
    }

    visualizeSentence(sentence, highlightIndex = -1) {
        this.clearCanvas();

        const data = sentenceData[sentence];
        if (!data) {
            this.ctx.font = '32px Arial';
            this.ctx.fillStyle = this.colors.text;
            this.ctx.fillText('No data available for this sentence', this.startX, this.startY);
            return;
        }

        const words = sentence.split(' ');
        const maxWidth = this.canvas.width - this.startX * 2; // Leave margin on both sides
        let currentX = this.startX;
        let currentY = this.startY;
        this.wordPositions = [];

        // First pass: draw words with line wrapping and collect positions
        words.forEach((word, index) => {
            // Strip punctuation for data lookup but keep it for display
            const wordForLookup = word.replace(/[.,!?;:]$/, '');
            const wordData = data[wordForLookup];
            if (!wordData) return;

            const isStressed = wordData.stress === 1;
            const isHighlighted = index === highlightIndex;

            // Measure word width before drawing
            this.ctx.font = isStressed ? 'bold 36px Arial' : '32px Arial';
            const width = this.ctx.measureText(word).width;

            // Check if we need to wrap to next line
            if (currentX + width > this.startX + maxWidth && currentX > this.startX) {
                currentX = this.startX;
                currentY += this.lineHeight;
            }

            // Draw the word
            this.drawText(word, currentX, currentY, isStressed, isHighlighted);

            // Store position for liaison connections
            this.wordPositions.push({
                word: word,
                x: currentX,
                y: currentY,
                width: width,
                data: wordData,
                line: Math.floor((currentY - this.startY) / this.lineHeight)
            });

            // Draw stress marker if needed
            if (isStressed) {
                this.drawStressMarker(currentX, currentY, width);
            }

            // Draw delete mark if needed
            if (wordData.liaison && wordData.liaison.delete) {
                this.drawDeleteMark(wordForLookup, currentX, currentY, wordData.liaison.delete);
            }

            currentX += width + this.wordSpacing;
        });

        // Second pass: draw liaison connections (only for words on the same line)
        for (let i = 0; i < this.wordPositions.length - 1; i++) {
            const currentWord = this.wordPositions[i];
            const nextWord = this.wordPositions[i + 1];

            // Check if current word has liaison that connects to next word
            // Only draw connection if both words are on the same line
            if (currentWord.data.liaison && currentWord.data.liaison.delete &&
                currentWord.line === nextWord.line) {
                const x1 = currentWord.x + currentWord.width;
                const x2 = nextWord.x;
                this.drawLiaisonConnection(x1, currentWord.y - 10, x2, nextWord.y - 10);
            }
        }
    }

    // Calculate word weight for timing (phonetic approximation)
    getWordWeight(word) {
        // Approximate syllable count and phonetic complexity
        const syllableCount = Math.max(1, word.replace(/[^aeiouAEIOU]/g, '').length);
        const consonantClusters = word.match(/[^aeiouAEIOU]{2,}/g) || [];
        const complexity = consonantClusters.length * 0.2;

        return syllableCount + complexity;
    }

    playWithAnimation(sentence) {
        // Stop any ongoing animation
        this.stopAnimation();

        const words = sentence.split(' ');
        let currentWordIndex = -1;

        // Calculate word weights for better timing (strip punctuation for weight calculation)
        const wordWeights = words.map(word => this.getWordWeight(word.replace(/[.,!?;:]$/, '')));
        const totalWeight = wordWeights.reduce((sum, weight) => sum + weight, 0);

        // Create word position mapping for accurate tracking
        const wordPositions = [];
        let currentPos = 0;

        for (let i = 0; i < words.length; i++) {
            wordPositions.push({
                start: currentPos,
                end: currentPos + words[i].length,
                index: i,
                weight: wordWeights[i]
            });
            currentPos += words[i].length + 1; // +1 for space
        }

        // Initialize speech synthesis
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            // Get available voices and prefer Google voice
            const voices = window.speechSynthesis.getVoices();
            const googleVoice = voices.find(voice =>
                voice.name.includes('Google') && voice.lang.startsWith('en')
            );

            // Create utterance for the entire sentence (smooth reading)
            this.speechUtterance = new SpeechSynthesisUtterance(sentence);
            this.speechUtterance.rate = this.speechRate; // Use configurable speech rate
            this.speechUtterance.pitch = 1.0;
            this.speechUtterance.volume = 1.0;
            this.speechUtterance.lang = 'en-US';

            // Use Google voice if available
            if (googleVoice) {
                this.speechUtterance.voice = googleVoice;
            }

            // Track if boundary events are supported and working
            let boundarySupported = false;
            let lastBoundaryTime = Date.now();
            let wordTimings = [];

            // Handle word boundary events for synchronized highlighting
            this.speechUtterance.onboundary = (event) => {
                if (event.name === 'word') {
                    boundarySupported = true;
                    const currentTime = Date.now();

                    // Find which word is being spoken
                    let targetIndex = -1;
                    let charCount = 0;

                    for (let i = 0; i < words.length; i++) {
                        if (event.charIndex >= charCount && event.charIndex < charCount + words[i].length + 1) {
                            targetIndex = i;
                            break;
                        }
                        charCount += words[i].length + 1;
                    }

                    if (targetIndex !== -1 && currentWordIndex !== targetIndex) {
                        currentWordIndex = targetIndex;
                        this.currentHighlight = targetIndex;
                        this.visualizeSentence(sentence, targetIndex);

                        // Record timing for learning
                        wordTimings.push({
                            index: targetIndex,
                            time: currentTime - lastBoundaryTime
                        });
                        lastBoundaryTime = currentTime;
                    }
                }
            };

            // Enhanced fallback for browsers without boundary support or poor boundary detection
            this.speechUtterance.onstart = () => {
                const startTime = Date.now();

                // Check after short delay if boundaries are working
                setTimeout(() => {
                    if (!boundarySupported) {
                        // Calculate precise timings based on speech rate and word weights
                        const baseTimePerUnit = 150; // Base milliseconds per weight unit
                        const rateAdjustment = 0.9 / this.speechRate; // Adjust for speech rate
                        const adjustedTimePerUnit = baseTimePerUnit * rateAdjustment;

                        // Add initial delay for very slow speeds
                        const initialDelay = this.speechRate < 0.5 ? 200 * rateAdjustment : 50;

                        let accumulatedTime = initialDelay;
                        const timings = [];

                        // Calculate timing for each word
                        for (let i = 0; i < words.length; i++) {
                            timings.push({
                                index: i,
                                startTime: accumulatedTime
                            });

                            // Time for this word based on its weight
                            const wordTime = wordWeights[i] * adjustedTimePerUnit;
                            accumulatedTime += wordTime;
                        }

                        // Animate based on calculated timings
                        let currentIndex = 0;
                        const animateWithTiming = () => {
                            if (currentIndex < timings.length) {
                                const elapsed = Date.now() - startTime;

                                // Check if it's time for the next word
                                if (elapsed >= timings[currentIndex].startTime) {
                                    this.currentHighlight = timings[currentIndex].index;
                                    this.visualizeSentence(sentence, timings[currentIndex].index);
                                    currentIndex++;
                                }

                                // Continue animation
                                if (currentIndex < timings.length) {
                                    this.animationId = requestAnimationFrame(animateWithTiming);
                                }
                            }
                        };

                        animateWithTiming();
                    }
                }, 100);
            };

            this.speechUtterance.onend = () => {
                // Reset highlighting when speech ends
                this.currentHighlight = -1;
                this.visualizeSentence(sentence);
                if (this.animationId) {
                    cancelAnimationFrame(this.animationId);
                    this.animationId = null;
                }
            };

            // Speak the entire sentence naturally
            window.speechSynthesis.speak(this.speechUtterance);

        } else {
            // Fallback: Animation without speech
            const baseTimePerUnit = 150;
            const rateAdjustment = 0.9 / this.speechRate;
            const adjustedTimePerUnit = baseTimePerUnit * rateAdjustment;

            let wordIndex = 0;
            const animateWords = () => {
                if (wordIndex < words.length) {
                    this.currentHighlight = wordIndex;
                    this.visualizeSentence(sentence, wordIndex);

                    // Calculate time for next word
                    const wordTime = wordWeights[wordIndex] * adjustedTimePerUnit;
                    wordIndex++;

                    this.animationId = setTimeout(animateWords, wordTime);
                } else {
                    this.currentHighlight = -1;
                    this.visualizeSentence(sentence);
                }
            };

            animateWords();
        }
    }

    setSpeechRate(rate) {
        this.speechRate = rate;
    }

    stopAnimation() {
        // Stop speech synthesis
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        // Clear animation timeout
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            clearTimeout(this.animationId);
            this.animationId = null;
        }

        // Reset highlight
        this.currentHighlight = -1;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    const visualizer = new LiaisonVisualizer('visualizationCanvas');
    const playBtn = document.getElementById('playBtn');
    const stopBtn = document.getElementById('stopBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');

    // Function to get current sentence
    function getCurrentSentence() {
        return sentences[currentSentenceIndex];
    }

    // Function to update button states
    function updateNavigationButtons() {
        prevBtn.disabled = currentSentenceIndex === 0;
        nextBtn.disabled = currentSentenceIndex === sentences.length - 1;
    }

    // Initial visualization
    visualizer.visualizeSentence(getCurrentSentence());
    updateNavigationButtons();

    // Load voices when they become available
    if ('speechSynthesis' in window) {
        // Chrome needs this to load voices
        speechSynthesis.getVoices();

        speechSynthesis.onvoiceschanged = () => {
            speechSynthesis.getVoices();
        };
    }

    // Navigation event listeners
    prevBtn.addEventListener('click', function() {
        if (currentSentenceIndex > 0) {
            currentSentenceIndex--;
            visualizer.stopAnimation();
            visualizer.visualizeSentence(getCurrentSentence());
            updateNavigationButtons();

            // Reset play/stop button visibility
            playBtn.style.display = 'inline-block';
            stopBtn.style.display = 'none';
        }
    });

    nextBtn.addEventListener('click', function() {
        if (currentSentenceIndex < sentences.length - 1) {
            currentSentenceIndex++;
            visualizer.stopAnimation();
            visualizer.visualizeSentence(getCurrentSentence());
            updateNavigationButtons();

            // Reset play/stop button visibility
            playBtn.style.display = 'inline-block';
            stopBtn.style.display = 'none';
        }
    });

    // Event listeners
    playBtn.addEventListener('click', function() {
        const sentence = getCurrentSentence();

        // Ensure voices are loaded before playing
        if ('speechSynthesis' in window && speechSynthesis.getVoices().length === 0) {
            // Wait a bit for voices to load
            setTimeout(() => {
                visualizer.playWithAnimation(sentence);
            }, 100);
        } else {
            visualizer.playWithAnimation(sentence);
        }

        // Toggle button visibility
        playBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
    });

    stopBtn.addEventListener('click', function() {
        visualizer.stopAnimation();
        visualizer.visualizeSentence(getCurrentSentence());

        // Toggle button visibility
        playBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
    });

    // Speed control listener
    speedSlider.addEventListener('input', function() {
        const speed = parseFloat(this.value);
        visualizer.setSpeechRate(speed);
        speedValue.textContent = speed.toFixed(1) + 'x';
    });

    // Initialize speed display
    speedValue.textContent = speedSlider.value + 'x';

    // Keyboard navigation with arrow keys
    document.addEventListener('keydown', function(e) {
        // Left arrow key
        if (e.key === 'ArrowLeft' && currentSentenceIndex > 0) {
            e.preventDefault();
            currentSentenceIndex--;
            visualizer.stopAnimation();
            visualizer.visualizeSentence(getCurrentSentence());
            updateNavigationButtons();

            // Reset play/stop button visibility
            playBtn.style.display = 'inline-block';
            stopBtn.style.display = 'none';
        }
        // Right arrow key
        else if (e.key === 'ArrowRight' && currentSentenceIndex < sentences.length - 1) {
            e.preventDefault();
            currentSentenceIndex++;
            visualizer.stopAnimation();
            visualizer.visualizeSentence(getCurrentSentence());
            updateNavigationButtons();

            // Reset play/stop button visibility
            playBtn.style.display = 'inline-block';
            stopBtn.style.display = 'none';
        }
    });
});