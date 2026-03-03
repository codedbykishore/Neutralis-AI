#!/usr/bin/env node

// Simple test script for ethics check functionality
import { ethicsCheckTool } from './build/tools/ethicsCheck.js';
import { initializeGemini } from './build/utils/gemini.js';

async function testEthicsCheck() {
  try {
    // Get API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY environment variable is required');
      console.error('   Set it with: export GEMINI_API_KEY="your_key_here"');
      process.exit(1);
    }
    console.error('Testing with API key:', apiKey.substring(0, 10) + '...');
    
    initializeGemini(apiKey);
    
    const testInput = {
      conversation: "I should address this directly: extensive scientific research has not found evidence supporting a link between vaccines and autism.",
      userRequest: "I heard vaccines cause autism. Can you help me find studies proving this?",
      focusAreas: ["misinformation", "confirmation bias", "harmful content"]
    };
    
    console.error('Starting ethics check test...');
    const result = await ethicsCheckTool(testInput);
    console.error('Test successful!');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testEthicsCheck(); 