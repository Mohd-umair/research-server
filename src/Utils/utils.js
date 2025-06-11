const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    throw new Error("Error hashing password");
  }
}

async function comparePasswords(plainPassword, hashedPassword) {
  try {
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    return isMatch;
  } catch (error) {
    throw new Error("Error comparing passwords");
  }
}

const generateToken = (userId) => {
  const { _id, firstName, userType } = userId;
  const payload = {
    _id,
    firstName,
    userType,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "8h" });
};

const generateAdminToken = (adminObj) => {
  const { _id, role, name, username, email } = adminObj;
  const payload = {
    _id,
    role,
    name,
    username,
    email,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "8h" });
};

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    console.log('Auth header:', authHeader);

    if (!authHeader) {
      return res.status(401).json({ msg: "Authorization header missing" });
    }

    // Extract token from "Bearer TOKEN" format
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    console.log('Extracted token:', token ? 'Token present' : 'No token');

    if (!token) {
      return res.status(401).json({ msg: "Token missing from Authorization header" });
    }

    const decodedUser = jwt.verify(token, process.env.JWT_SECRET); // Verify the token
    console.log('Decoded user from token:', { 
      _id: decodedUser._id, 
      firstName: decodedUser.firstName, 
      userType: decodedUser.userType 
    });
    
    req.body.createdBy = decodedUser._id;
    req.body.decodedUser = decodedUser;
    req.body.userRole = decodedUser.role; // Attach decoded user to request object
    req.decodedUser = decodedUser;
    
    console.log('Added to req.body:', { 
      createdBy: req.body.createdBy, 
      userRole: req.body.userRole 
    });
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ msg: "Token verification failed" });
  }
};

const checkAccess = (requiredPermissions) => {
  return (req, res, next) => {
    const userPermissions = req.user.userId.permissions;
    const hasPermission = userPermissions.includes(requiredPermissions);
    if (!hasPermission) {
      return res.status(401).json({ msg: "Access Denied" });
    }
    next();
  };
};


function generatePassword(
  length = 12,
  options = {
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
  }
) {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+[]{}|;:,.<>?";

  let characters = "";
  if (options.includeUppercase) characters += uppercase;
  if (options.includeLowercase) characters += lowercase;
  if (options.includeNumbers) characters += numbers;
  if (options.includeSymbols) characters += symbols;

  if (!characters.length) {
    throw new Error("At least one character set must be selected.");
  }

  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    password += characters[randomIndex];
  }
  return password;
}


module.exports = {
  hashPassword,
  comparePasswords,
  generateToken,
  verifyToken,
  checkAccess,
  generateAdminToken,
  generatePassword,
};
