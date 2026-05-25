import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { postController } from './post.controller.js';

const router = Router();
router.use(requireAuth);

router.post('/',                       postController.createPost.bind(postController));
router.get('/',                        postController.getPublicPosts.bind(postController));
router.get('/:postId',                 postController.getPost.bind(postController));
router.put('/:postId',                 postController.editPost.bind(postController));
router.delete('/:postId',              postController.deletePost.bind(postController));
router.post('/:postId/share',          postController.sharePost.bind(postController));
router.get('/user/:userId/shares',     postController.getUserShares.bind(postController));

export default router;
