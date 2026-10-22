
import jwt from "jsonwebtoken";

// Verify JWT for any authenticated role
export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (!decoded.id || !decoded.role) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// Keep patient-only authorization unchanged
export const protect = (req, res, next) => {
  return authenticateToken(req, res, () => {
    if (req.user.role !== "patient") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    next();
  });
};
