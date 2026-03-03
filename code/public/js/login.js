/**
 * Login Page Handler
 */

// Check if already logged in
(function() {
  const session = sessionStorage.getItem('ethicsUser') || localStorage.getItem('ethicsUser');
  if (session) {
    window.location.href = '/dashboard';
  }
})();

// Initialize form fields with validators
const emailField = new FormField('email', 'emailError', [
  { check: (v) => !Validator.isEmpty(v), message: 'Email is required' },
  { check: Validator.isValidEmail, message: 'Please enter a valid email address' }
]);

const passwordField = new FormField('password', 'passwordError', [
  { check: (v) => !Validator.isEmpty(v), message: 'Password is required' },
  { check: (v) => Validator.isValidPassword(v, 6), message: 'Password must be at least 6 characters' }
]);

// Form submission
const loginForm = document.getElementById('loginForm');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');
const alertBox = document.getElementById('alert');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Clear previous alerts
  hideAlert();
  
  // Validate all fields
  const isEmailValid = emailField.validate();
  const isPasswordValid = passwordField.validate();
  
  if (!isEmailValid || !isPasswordValid) {
    return;
  }
  
  // Show loading state
  setLoading(true);
  
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const email = emailField.getValue();
    const password = passwordField.getValue();
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Demo credentials check
    if (email === 'demo@ethics.io' && password === 'demo123') {
      // Create user session
      const user = {
        email: email,
        name: 'Demo User',
        loginTime: new Date().toISOString()
      };
      
      // Store session
      if (rememberMe) {
        localStorage.setItem('ethicsUser', JSON.stringify(user));
      } else {
        sessionStorage.setItem('ethicsUser', JSON.stringify(user));
      }
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } else {
      showAlert('Invalid email or password. Try demo@ethics.io / demo123', 'error');
    }
  } catch (error) {
    showAlert('An error occurred. Please try again.', 'error');
  } finally {
    setLoading(false);
  }
});

/**
 * Set loading state
 * @param {boolean} isLoading 
 */
function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  btnText.textContent = isLoading ? 'Signing In...' : 'Sign In';
  btnSpinner.style.display = isLoading ? 'inline-block' : 'none';
}

/**
 * Show alert message
 * @param {string} message 
 * @param {string} type - 'error' or 'success'
 */
function showAlert(message, type = 'error') {
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type}`;
  alertBox.style.display = 'block';
}

/**
 * Hide alert message
 */
function hideAlert() {
  alertBox.style.display = 'none';
}
