import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import adminRouter from "./routes/adminRouter.js";
import contactRouter from "./routes/contactRouter.js";
import doctorRouter from "./routes/doctorRouter.js";
import appointmentRouter from "./routes/appointment.js";
import sheduleRouter from "./routes/shedulRouter.js";
import fileUpload from "express-fileupload";

import uploadRouter from "./routes/uploadRouter.js";

dotenv.config();
const app = express();
app.use(cors());

// ✅ Only keep body parsers — no express-fileupload
app.use(express.json());
app.use(fileUpload({ useTempFiles: true }));
app.use(express.urlencoded({ extended: true }));

const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("hello world");
});

app.use("/api", adminRouter);
app.use("/api", contactRouter);
app.use("/api", doctorRouter);
app.use("/api", appointmentRouter);
app.use("/api", sheduleRouter);
app.use("/api", uploadRouter);

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
