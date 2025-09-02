import jwt from "jsonwebtoken";

export const isAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Please Login - no Auth header" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decodedValue = jwt.verify(token, process.env.JWT_SECRET);

    if (!decodedValue || !decodedValue.user) {
      res.status(401).json({ message: "Please Login, Invalid Token" });
      return;
    }

    req.user = decodedValue.user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Please Login, JWT error" });
  }
};

export default isAuth;
