import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import bcrypt from "bcrypt";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

const BCRYPT_SALT_ROUNDS = 12;

export function getSession() {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required");
  }

  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  try {
    (sessionStore as any).on?.("error", (err: any) => {
      console.error("Session store error:", err);
    });
  } catch {}
  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", true);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport-local strategy
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          if (!user.passwordHash) {
            return done(null, false, { message: "Please set up your password" });
          }

          const isValid = await bcrypt.compare(password, user.passwordHash);
          
          if (!isValid) {
            return done(null, false, { message: "Invalid email or password" });
          }

          if ((user as any).isActive === false) {
            return done(null, false, { message: "Account is deactivated" });
          }

          return done(null, { userId: user.id, role: (user as any).role });
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Serialize only the user ID
  passport.serializeUser((user: any, done) => {
    done(null, user.userId);
  });

  // Deserialize by fetching user from database
  passport.deserializeUser(async (userId: string, done) => {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return done(null, false);
      }
      done(null, { userId: user.id, role: (user as any).role });
    } catch (error) {
      done(error);
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Attach userId to request for convenience
  (req as any).userId = (req.user as any).userId;
  next();
};

// Helper function to hash passwords
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

// Helper function to verify passwords
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
