// require("dotenv").config({ path: "./env" });

import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
  path: "./env",
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, (E) => {
      console.log(`server is runing at :${PORT}`);
    });
    app.on("error", (error) => {
      console.log("err:", error);
      throw error;
    });
  })
  .catch((error) => {
    console.log("MONDODB connection FAILED", error);
  });
