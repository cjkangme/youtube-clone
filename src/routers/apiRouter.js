import express from "express";
import {
  registerView,
  createComment,
  deleteComment,
} from "../controllers/videoController";
import {
  addVideo,
  createGroup,
  deleteVideo,
  scanVideo,
} from "../controllers/groupController";

const apiRouter = express.Router();

const IDEXPRESSION = "([0-9a-f]{24})";

apiRouter.post(`/videos/:id${IDEXPRESSION}/view`, registerView);
apiRouter.post(`/videos/:id${IDEXPRESSION}/comment`, createComment);
apiRouter.post(`/videos/:id${IDEXPRESSION}/comment/delete`, deleteComment);
apiRouter.post(`/groups/create`, createGroup);
apiRouter.post(`/groups/scan`, scanVideo);
apiRouter.post(`/groups/addvideo`, addVideo);
apiRouter.post(`/groups/deletevideo`, deleteVideo);

export default apiRouter;
