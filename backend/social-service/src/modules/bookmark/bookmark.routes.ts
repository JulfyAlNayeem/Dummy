import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { bookmarkController } from './bookmark.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/',                         bookmarkController.getBookmarks.bind(bookmarkController));
router.post('/:postId',                 bookmarkController.savePost.bind(bookmarkController));
router.delete('/:postId',               bookmarkController.unsavePost.bind(bookmarkController));
router.get('/:postId/check',            bookmarkController.checkBookmark.bind(bookmarkController));

export default router;
