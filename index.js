/**
 * ====================================================================
 * SYSTEM CORE LAYER - INTELLECTA GLOBAL PREMIUM API CONTROLLER
 * ====================================================================
 * Version: 5.0.0 | Production-Grade Multi-Brain Architecture
 */TEST REVIEW
require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { OpenAI } = require("openai");
const Replicate = require("replicate");

// Initialize Replicate
const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});
console.log("Is Token Loaded:", process.env.REPLICATE_API_TOKEN ? "YES" : "NO");

const app = express();
const server = http.createServer(app);

// ==========================================
// CONFIGURATION & CREDENTIAL SECURITY ENGINE
// ==========================================
const CONFIG = {
    PORT: 3000,
    HOST: 'localhost'
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Initialize Neural Core Links
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Express Server Configurations
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); 
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// SYSTEM ROUTING MANAGEMENT
// ==========================================

// Serve UI Framework
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Primary Brain Routing Handshake Core (Memory, Mode, & Cross-Verification Enabled)
app.post('/api/chat', async (req, res) => {
    let { message, engine, mode, messages } = req.body;

    // Default chat history array if not supplied by frontend
    let chatHistory = messages || [];

    // Format mode instructions
    let rule = "";
    if (mode === 'Detailed') {
        rule = "System Rule: Provide a highly detailed, comprehensive analysis covering multiple angles.\n\n";
    } else if (mode === 'Quick') {
        rule = "System Rule: Provide a concise, straight-to-the-point response.\n\n";
    } else if (mode === 'One Word') {
        rule = "System Rule: You MUST respond with EXACTLY one single word. No punctuation, no sentences, no explanations.\n\n";
    }

    if (rule && message) {
        message = rule + message;
    }

    console.log("\n=======================================================");
    console.log(`[SYSTEM MATRIX] Neural handshake & Cross-Verification initiated...`);
    console.log(`[ENGINE/CHOICE]: ${engine}`);
    console.log(`[MODE]: ${mode || 'Standard'}`);
    console.log(`[PAYLOAD]: "${message}"`);
    console.log("=======================================================");

    try {
        if (!message) {
            return res.status(400).json({ status: "error", reply: "System Error: Empty prompt." });
        }

        const systemPrompt = `You are Intellecta, an advanced custom AI developed by Intellecta AI. Never mention OpenAI, Google, ChatGPT, or Claude. Always identify as Intellecta.`;

        let draftResponse = "";
        let finalVerifiedResponse = "";

        // Determine primary engine based on frontend selection
        let primaryBrain = engine === 'GPT' ? 'GPT-4o' : 'Gemini';

        // ==========================================
        // PHASE 1: GENERATE INITIAL DRAFT
        // ==========================================
        console.log(`⏳ Phase 1: Drafting response with ${primaryBrain}...`);
        
        if (primaryBrain === 'Gemini') {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: systemPrompt });
            const geminiHistory = chatHistory.map(msg => ({
                role: msg.sender === "bot" ? "model" : "user",
                parts: [{ text: msg.text }]
            }));
            geminiHistory.push({ role: "user", parts: [{ text: message }] });
            
            const result = await model.generateContent({ contents: geminiHistory });
            draftResponse = result.response.text();
        } else {
            const gptHistory = chatHistory.map(msg => ({
                role: msg.sender === "bot" ? "assistant" : "user",
                content: msg.text
            }));
            gptHistory.push({ role: "user", content: message });

            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    ...gptHistory
                ]
            });
            draftResponse = response.choices[0].message.content;
        }

        // ==========================================
        // PHASE 2: CROSS-VERIFICATION (FACT-CHECK)
        // ==========================================
        if (engine === 'Cross-Verified') {
            const verifierEngine = primaryBrain === 'Gemini' ? 'GPT-4o' : 'Gemini';
            console.log(`🔍 Phase 2: Cross-verifying draft using ${verifierEngine}...`);

            const crossVerifyPrompt = `
                You are the Cross-Verification engine for Intellecta. 
                The user asked: "${message}"
                
                Another AI engine drafted this response:
                "${draftResponse}"
                
                Your job:
                1. Correct any factual errors or hallucinations.
                2. Polish clarity and tone.
                3. Output only the final response as Intellecta.
                ${mode === 'One Word' ? "4. CRITICAL: Output EXACTLY one single word." : ""}
            `;

            if (verifierEngine === 'GPT-4o') {
                const verifyResponse = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: crossVerifyPrompt }
                    ]
                });
                finalVerifiedResponse = verifyResponse.choices[0].message.content;
            } else {
                const verifyModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: systemPrompt });
                const verifyResult = await verifyModel.generateContent({
                    contents: [{ role: "user", parts: [{ text: crossVerifyPrompt }] }]
                });
                finalVerifiedResponse = verifyResult.response.text();
            }
        } else {
            finalVerifiedResponse = draftResponse;
        }

        console.log(`✅ Pipeline Complete. Sending response.`);
        console.log("=======================================================\n");

        return res.json({ reply: finalVerifiedResponse });

    } catch (error) {
        console.error("Neural pathway failure:", error);
        return res.status(500).json({ status: "error", reply: "The AI system layer encountered an error processing your query." });
    }
});

// ENGINE 3: REPLICATE (IMAGE GENERATION)
app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: "Prompt is required." });
        }

        console.log("[IMAGE] Creating prediction for prompt:", prompt);

        let prediction = await replicate.predictions.create({
            model: "black-forest-labs/flux-schnell",
            input: {
                prompt: prompt,
                go_fast: true,
                num_outputs: 1,
                aspect_ratio: "1:1",
                output_format: "webp"
            }
        });

        prediction = await replicate.wait(prediction);

        if (prediction.status !== "succeeded") {
            console.error(`[IMAGE ERROR] Status: ${prediction.status}. Reason: ${prediction.error}`);
            return res.status(500).json({ error: prediction.error || "Image generation failed." });
        }

        const output = prediction.output;
        if (!output) {
            return res.status(500).json({ error: "No output generated." });
        }

        let imageUrl = "";
        const firstItem = Array.isArray(output) ? output[0] : output;

        if (typeof firstItem === 'string') {
            imageUrl = firstItem;
        } else if (firstItem && typeof firstItem.url === 'function') {
            imageUrl = firstItem.url();
        } else if (firstItem && firstItem.url) {
            imageUrl = firstItem.url;
        } else {
            imageUrl = String(firstItem);
        }

        return res.json({ imageUrl: imageUrl });

    } catch (error) {
        console.error("Image generation exception:", error);
        return res.status(500).json({ error: error.message });
    }
});

// --- SERVER ACTIVATION ---
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🚀 [SYSTEM ONLINE] Intellecta is listening on port ${PORT}`);
    console.log(`======================================================\n`);
});
