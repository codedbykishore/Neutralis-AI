/**
 * Form Validation Utilities
 */

const Validator = {
  /**
   * Validate email format
   * @param {string} email 
   * @returns {boolean}
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  },

  /**
   * Validate password strength
   * @param {string} password 
   * @param {number} minLength 
   * @returns {boolean}
   */
  isValidPassword(password, minLength = 6) {
    return password.length >= minLength;
  },

  /**
   * Check if field is empty
   * @param {string} value 
   * @returns {boolean}
   */
  isEmpty(value) {
    return !value || value.trim().length === 0;
  },

  /**
   * Validate minimum length
   * @param {string} value 
   * @param {number} minLength 
   * @returns {boolean}
   */
  minLength(value, minLength) {
    return value.trim().length >= minLength;
  },

  /**
   * Validate maximum length
   * @param {string} value 
   * @param {number} maxLength 
   * @returns {boolean}
   */
  maxLength(value, maxLength) {
    return value.trim().length <= maxLength;
  }
};

/**
 * Form Field Handler
 */
class FormField {
  constructor(inputId, errorId, validators = []) {
    this.input = document.getElementById(inputId);
    this.error = document.getElementById(errorId);
    this.validators = validators;
    this.isValid = false;

    if (this.input) {
      this.input.addEventListener('input', () => this.clearError());
      this.input.addEventListener('blur', () => this.validate());
    }
  }

  /**
   * Validate the field
   * @returns {boolean}
   */
  validate() {
    const value = this.input.value;
    
    for (const { check, message } of this.validators) {
      if (!check(value)) {
        this.showError(message);
        this.isValid = false;
        return false;
      }
    }
    
    this.clearError();
    this.isValid = true;
    return true;
  }

  /**
   * Show error message
   * @param {string} message 
   */
  showError(message) {
    this.input.classList.add('error');
    if (this.error) {
      this.error.textContent = message;
      this.error.classList.add('show');
    }
  }

  /**
   * Clear error state
   */
  clearError() {
    this.input.classList.remove('error');
    if (this.error) {
      this.error.classList.remove('show');
    }
  }

  /**
   * Get field value
   * @returns {string}
   */
  getValue() {
    return this.input.value.trim();
  }
}

// Export for use in other scripts
window.Validator = Validator;
window.FormField = FormField;
