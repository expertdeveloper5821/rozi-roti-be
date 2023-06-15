import express from "express";
const app = express();
import bodyParser from "body-parser";
import * as dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import './config/db';

import userRoute from "./router/userRouter";

// ALL THE MIDDLEWARES GOES HERE
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: "GET,POST,PUT,DELETE",
    credentials: true,
  })
);
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());

// ALL THE ROUTES HERE
app.use("/v1", userRoute);

app.get("/", function (req, res) {
  res.send("Hello World");
});

// Database connection
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}...👍️`);
});
