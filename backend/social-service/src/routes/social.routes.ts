import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createPost, editPost, deletePost,
  getPosts, addReaction,
  addComment, addReply,
} from '../controllers/social.controller.js';

const router = Router();
router.use(requireAuth);

router.post('/posts', createPost);
router.get('/posts', getPosts);
router.put('/posts/:postId', editPost);
router.delete('/posts/:postId', deletePost);
router.post('/posts/:postId/reaction', addReaction);
router.post('/posts/:postId/comments', addComment);
router.post('/posts/:postId/comments/:commentId/replies', addReply);

export default router;
