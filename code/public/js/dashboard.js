/**
 * Dashboard Page Handler
 */

const API_URL = '';

// Check authentication
(function() {
  const session = sessionStorage.getItem('ethicsUser') || localStorage.getItem('ethicsUser');
  if (!session) {
    window.location.href = '/login';
    return;
  }
  
  // Display user info
  try {
    const user = JSON.parse(session);
    document.getElementById('userGreeting').textContent = `Welcome, ${user.name || user.email}`;
  } catch (e) {
    console.error('Invalid session data');
  }
})();

/**
 * Logout user
 */
function logout() {
  sessionStorage.removeItem('ethicsUser');
  localStorage.removeItem('ethicsUser');
  window.location.href = '/login';
}

/**
 * Show tab content
 * @param {string} tabName 
 */
function showTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
  
  // Show/hide tab content
  document.querySelectorAll('.section.themed').forEach(s => {
    s.classList.add('hidden');
  });
  document.getElementById(tabName + '-tab').classList.remove('hidden');
}

/**
 * Call API endpoint
 * @param {string} tool 
 * @param {object} args 
 */
async function callAPI(tool, args) {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = '<div class="loading"><span class="spinner"></span> Processing with Gemini AI...</div>';
  
  try {
    const response = await fetch(`${API_URL}/api/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, ...args })
    });
    
    const data = await response.json();
    
    if (data.error) {
      resultDiv.innerHTML = `<span class="text-error">❌ Error: ${data.error}</span>`;
    } else {
      resultDiv.innerHTML = `<span class="text-success">✅ Analysis Complete!</span>\n\n${formatResult(data)}`;
    }
  } catch (err) {
    resultDiv.innerHTML = `<span class="text-error">❌ Connection Error: ${err.message}\n\nMake sure the server is running:\nnode server.js</span>`;
  }
}

/**
 * Format API result for display
 * @param {object} data 
 * @returns {string}
 */
function formatResult(data) {
  let output = '';
  
  if (data.overallRisk) {
    output += `⚠️ RISK LEVEL: ${data.overallRisk.toUpperCase()}\n\n`;
  }
  
  if (data.ethicalAssessment) {
    output += `📋 ASSESSMENT:\n${data.ethicalAssessment}\n\n`;
  }
  
  if (data.concerns?.length) {
    output += `🚨 CONCERNS (${data.concerns.length}):\n`;
    data.concerns.forEach((c, i) => {
      output += `\n${i+1}. [${c.severity.toUpperCase()}] ${c.category}\n   ${c.description}\n   💡 ${c.recommendation}\n`;
    });
    output += '\n';
  }
  
  if (data.recommendations?.length) {
    output += `✅ RECOMMENDATIONS:\n`;
    data.recommendations.forEach((r, i) => output += `${i+1}. ${r}\n`);
  }
  
  output += `\n---\n📄 RAW JSON:\n${JSON.stringify(data, null, 2)}`;
  return output;
}

// Validate required field
function validateRequired(input, errorId) {
  const error = document.getElementById(errorId);
  if (Validator.isEmpty(input.value)) {
    input.classList.add('error');
    error.classList.add('show');
    return false;
  }
  input.classList.remove('error');
  error.classList.remove('show');
  return true;
}

// Ethics Check Form
document.getElementById('ethicsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const conversation = document.getElementById('conversation');
  const userRequest = document.getElementById('userRequest');
  
  const isConversationValid = validateRequired(conversation, 'conversationError');
  const isUserRequestValid = validateRequired(userRequest, 'userRequestError');
  
  if (!isConversationValid || !isUserRequestValid) return;
  
  callAPI('ethics_check', {
    conversation: conversation.value,
    userRequest: userRequest.value,
    context: document.getElementById('context').value || undefined
  });
});

// Ethics Guide Form
document.getElementById('guideForm').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const scenario = document.getElementById('scenario');
  const isValid = validateRequired(scenario, 'scenarioError');
  
  if (!isValid) return;
  
  callAPI('ethics_guide', {
    scenario: scenario.value,
    domain: document.getElementById('domain').value || undefined
  });
});

// Critical Thinking Form
document.getElementById('criticalForm').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const aiResponse = document.getElementById('aiResponse');
  const criticalUserRequest = document.getElementById('criticalUserRequest');
  
  const isAiResponseValid = validateRequired(aiResponse, 'aiResponseError');
  const isCriticalUserRequestValid = validateRequired(criticalUserRequest, 'criticalUserRequestError');
  
  if (!isAiResponseValid || !isCriticalUserRequestValid) return;
  
  callAPI('critical_thinking', {
    aiResponse: aiResponse.value,
    userRequest: criticalUserRequest.value
  });
});

// Add input listeners to clear errors
document.querySelectorAll('.form-control').forEach(input => {
  input.addEventListener('input', function() {
    this.classList.remove('error');
    const errorEl = this.nextElementSibling;
    if (errorEl?.classList.contains('error-message')) {
      errorEl.classList.remove('show');
    }
  });
});
