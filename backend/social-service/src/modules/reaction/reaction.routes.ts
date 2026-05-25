import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { reactionController } from './reaction.controller.js';

const router = Router();
router.use(requireAuth);

router.post('/posts/:postId/reactions',         reactionController.togglePostReaction.bind(reactionController));
router.get('/posts/:postId/reactions',          reactionController.getPostReactions.bind(reactionController));
router.get('/posts/:postId/reactions/mine',     reactionController.getMyPostReaction.bind(reactionController));
router.post('/comments/:commentId/reactions',   reactionController.toggleCommentReaction.bind(reactionController));

export default router;
