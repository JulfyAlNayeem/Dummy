import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { commentController } from './comment.controller.js';

const router = Router();
router.use(requireAuth);

// Post comments
router.get('/posts/:postId/comments',                       commentController.getPostComments.bind(commentController));
router.post('/posts/:postId/comments',                      commentController.createComment.bind(commentController));
router.put('/comments/:commentId',                          commentController.editComment.bind(commentController));
router.delete('/comments/:commentId',                       commentController.deleteComment.bind(commentController));

// Comment replies
router.post('/comments/:commentId/replies',                 commentController.createReply.bind(commentController));
router.put('/replies/:replyId',                             commentController.editReply.bind(commentController));
router.delete('/replies/:replyId',                          commentController.deleteReply.bind(commentController));

export default router;
