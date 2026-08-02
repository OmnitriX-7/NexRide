export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; message: string } => {
  const strongPasswordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
  
  if (!strongPasswordRegex.test(password)) {
    return { 
      isValid: false, 
      message: 'Password must be at least 8 characters long and must have an uppercase letter, a number, and a symbol.' 
    };
  }
  return { isValid: true, message: '' };
};