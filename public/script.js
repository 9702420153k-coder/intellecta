/**
 * ====================================================================
 * SYSTEM CORE LAYER - INTELLECTA FRONTEND CONTROLLER
 * ====================================================================
 */
Window.isPremiumUser = localStorage.getItem('intellecta_premium') === 'true'; 
let conversationHistory = [];
let currentResponseMode = 'Detailed'; // Matches server expectation ('Detailed', 'Quick', 'One Word')
let selectedEngine = 'Gemini';       // 'Gemini', 'GPT', or 'Cross-Verified'
let selectedFeature = 'research';    // 'research', 'photo', 'video'

// Initialize on window load
window.onload = () => {
    checkAuth();
};

function checkAuth() {
    const user = localStorage.getItem('intellecta_user');
    if (user) {
        const authModal = document.getElementById('authModal');
        if (authModal) authModal.style.display = 'none';
    }
}

// Sidebar Toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

// New Session / Clear Memory
function startNewSession() {
    conversationHistory = [];
    const stream = document.getElementById('messageStream');
    if (stream) stream.innerHTML = '';
    document.body.classList.remove('conversation-started');
    const promptInput = document.getElementById('promptInput');
    if (promptInput) promptInput.value = '';
    clearAttachment();
}

// Suggested Prompts
function useSuggestedPrompt(text) {
    const promptInput = document.getElementById('promptInput');
    if (promptInput) {
        promptInput.value = text;
        promptInput.focus();
    }
}

// Feature Pill Selection (Research, Photo, Video)
function setFeature(feature) {
    selectedFeature = feature;
    document.getElementById('pillResearch')?.classList.toggle('active', feature === 'research');
    document.getElementById('pillPhoto')?.classList.toggle('active', feature === 'photo');
    document.getElementById('pillVideo')?.classList.toggle('active', feature === 'video');
}

// Mode Toggle Cycle (Detailed ➔ Quick ➔ One Word)
function toggleMode() {
    const modeLabel = document.getElementById('modeLabel');
    if (currentResponseMode === 'Detailed') {
        currentResponseMode = 'Quick';
    } else if (currentResponseMode === 'Quick') {
        currentResponseMode = 'One Word';
    } else {
        currentResponseMode = 'Detailed';
    }
    if (modeLabel) modeLabel.textContent = `Mode: ${currentResponseMode}`;
    console.log("[SYSTEM] Mode swapped to:", currentResponseMode);
}

// Engine Toggle Cycle & Premium Guard
function toggleEngine() {
    if (!window.isPremiumUser) {
        openPaymentModal();
        return;
    }

    const engineLabel = document.getElementById('engineLabel');
    if (selectedEngine === 'Gemini') {
        selectedEngine = 'GPT';
    } else if (selectedEngine === 'GPT') {
        selectedEngine = 'Cross-Verified';
    } else {
        selectedEngine = 'Gemini';
    }
    if (engineLabel) engineLabel.textContent = `Engine: ${selectedEngine}`;
}

function openPaymentModal() {
    const paymentModal = document.getElementById('paymentModal');
    if (paymentModal) paymentModal.style.display = 'flex';
}

function processPayment() {
    window.isPremiumUser = true;
    localStorage.setItem('intellecta_premium', 'true');
    const paymentModal = document.getElementById('paymentModal');
    if (paymentModal) paymentModal.style.display = 'none';
    selectedEngine = 'Cross-Verified';
    const engineLabel = document.getElementById('engineLabel');
    if (engineLabel) engineLabel.textContent = `Engine: Cross-Verified`;
}

function closePaymentModal() {
    const paymentModal = document.getElementById('paymentModal');
    if (paymentModal) paymentModal.style.display = 'none';
}

// Plus Menu Attachment Handling
function togglePlusMenu() {
    const menu = document.getElementById('plusMenu');
    if (menu) menu.classList.toggle('active');
}

function triggerFileInput(inputId) {
    const input = document.getElementById(inputId);
    if (input) input.click();
    const menu = document.getElementById('plusMenu');
    if (menu) menu.classList.remove('active');
}

let currentAttachment = null;
function handleFileSelected(event) {
    const file = event.target.files[0];
    if (file) {
        currentAttachment = file;
        const nameEl = document.getElementById('attachmentName');
        if (nameEl) nameEl.textContent = file.name;
        const bar = document.getElementById('attachmentBar');
        if (bar) bar.style.display = 'flex';
    }
}

function clearAttachment() {
    currentAttachment = null;
    const bar = document.getElementById('attachmentBar');
    if (bar) bar.style.display = 'none';
}

// Markdown formatting helper
function formatResponse(rawText) {
    return typeof marked !== 'undefined' ? marked.parse(rawText) : rawText;
}

// Main Send Execution Handler
async function handleSend() {
    const promptInput = document.getElementById('promptInput');
    if (!promptInput) return;
    
    const text = promptInput.value.trim();
    if (!text && !currentAttachment) return;

    document.body.classList.add('conversation-started');
    const stream = document.getElementById('messageStream');
    const container = document.getElementById('chatContainer');

    // Render User Bubble
    const userMsgDisplay = text + (currentAttachment ? ` 📄 [${currentAttachment.name}]` : '');
    renderMessage('user', userMsgDisplay);
    promptInput.value = '';
    autoResize(promptInput);

    // Show Typing Indicator
    showTypingIndicator();

    try {
       let targetEndpoint = '/api/chat';
        let requestBody = {};

        // Route dynamically based on active feature pill selection
        if (selectedFeature === 'photo') {
          targetEndpoint = '/api/generate-image';
            requestBody = { prompt: text };
        } else {
            // Standard Text / Research Chat with Memory & Mode
            conversationHistory.push({ sender: 'user', text: text });
            requestBody = {
                message: text,
                engine: selectedEngine,
                mode: currentResponseMode,
                messages: conversationHistory
            };
        }

        const response = await fetch(targetEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        removeTypingIndicator();

        if (data.error) {
            renderMessage('bot', `⚠️ Error: ${data.error}`);
            return;
        }

        if (selectedFeature === 'photo' && data.imageUrl) {
            const imgHtml = `<img src="${data.imageUrl}" style="max-width: 100%; border-radius: 12px; border: 1px solid rgba(0,242,254,0.2);">`;
            renderMessage('bot', imgHtml);
            conversationHistory.push({ sender: 'bot', text: '[Generated Image]' });
        } else if (data.reply) {
            renderMessage('bot', formatResponse(data.reply));
            conversationHistory.push({ sender: 'bot', text: data.reply });
        }

        if (container) container.scrollTop = container.scrollHeight;

    } catch (error) {
        removeTypingIndicator();
        renderMessage('bot', "Terminal offline. Ensure port 3000 node process is active.");
    }

    clearAttachment();
}

function renderMessage(sender, htmlContent) {
    const stream = document.getElementById('messageStream');
    if (!stream) return;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;

    const avatar = sender === 'bot' ? '✦' : '👤';

    bubble.innerHTML = `
        <div class="avatar">${avatar}</div>
        <div class="bubble-content">${htmlContent}</div>
    `;

    stream.appendChild(bubble);
    const container = document.getElementById('chatContainer');
    if (container) container.scrollTop = container.scrollHeight;
}

function showTypingIndicator() {
    const stream = document.getElementById('messageStream');
    if (!stream) return;
    const typing = document.createElement('div');
    typing.id = 'typingIndicator';
    typing.className = 'chat-bubble bot';
    typing.innerHTML = `<div class="avatar">✦</div><div class="bubble-content"><em>Intellecta computing matrix payload...</em></div>`;
    stream.appendChild(typing);
}

function removeTypingIndicator() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
}

// Helpers for input box
function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
}

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

// Voice Recognition Support
function startVoiceRecognition() {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) {
        alert("Voice API not supported in this browser environment.");
        return;
    }
    const recog = new Speech();
    recog.onstart = () => document.getElementById('micBtn')?.classList.add('active');
    recog.onend = () => document.getElementById('micBtn')?.classList.remove('active');
    recog.onresult = (e) => {
        const input = document.getElementById('promptInput');
        if (input) input.value = e.results[0][0].transcript;
    };
    recog.start();
}