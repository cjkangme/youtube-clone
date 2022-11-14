import express from "express";

import {
  seeUsers,
  getEditUser,
  postEditUser,
  startGithubLogin,
  finishGithubLogin,
  getChangePassword,
  postChangePassword,
} from "../controllers/userController";
import {
  passwordOnlyMiddlware,
  protectorMiddleware,
  publicOnlyMiddleware,
} from "../middlewares";

const userRouter = express.Router();

userRouter
  .route("/edit")
  .all(protectorMiddleware)
  .get(getEditUser)
  .post(postEditUser);
userRouter.get("/github/start", publicOnlyMiddleware, startGithubLogin);
userRouter.get("/github/finish", publicOnlyMiddleware, finishGithubLogin);
userRouter
  .route("/change-password")
  .all(protectorMiddleware, passwordOnlyMiddlware)
  .get(getChangePassword)
  .post(postChangePassword);

export default userRouter;
