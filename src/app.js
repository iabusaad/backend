import { Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORE_ORIGIN,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "16kb",
  })
);

app.use(
  express.urllencoded({
    extends: "true",
    limit: "16kb",
  })
);
app.use(cookieParser());
export default app;
